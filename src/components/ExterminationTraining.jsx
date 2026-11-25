'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { Crosshair, Pause, Play, Square, Trophy, RotateCcw } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button } from './ui';
import GameResultShare from './GameResultShare';
import useRefreshOnReturn from '@/hooks/useRefreshOnReturn';
import { puzzleRequest } from '@/lib/puzzle-request.mjs';
import { puzzleTime } from '@/lib/sliding-puzzle.mjs';
import {
  trainingEnemies,
  trainingStage,
  trainingDuration,
  advanceTraining,
  applyTrainingEvent,
  trainingEnemyPosition,
} from '@/lib/extermination.mjs';

const number = (value) => (value || 0).toLocaleString('ko-KR');
export default function ExterminationTraining() {
  const { user } = useCommunity();
  return <Training key={user.id} />;
}
function Training() {
  const { api, user, syncPoints, actualRole, role } = useCommunity();
  const [view, setView] = useState(null),
    [data, setData] = useState(null);
  const [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [connectionError, setConnectionError] = useState(false);
  const [result, setResult] = useState(null),
    [feedback, setFeedback] = useState('');
  const model = useRef(null),
    anchor = useRef(0),
    queued = useRef([]),
    packet = useRef(null);
  const controllers = useRef(new Set()),
    sending = useRef(false),
    failed = useRef(false),
    alive = useRef(true);
  const epoch = useRef(0),
    lastSend = useRef(0),
    lastPointer = useRef(null),
    startPacket = useRef(null);
  const board = useRef(null),
    cursor = useRef(null),
    paint = useRef(0),
    completed = useRef(null);
  const synchronize = useRef(null);
  const recovering = useRef(false);
  const storageKey = 'hd-training-packet:' + user.id;
  const readonly = actualRole !== role;
  const refreshRanks = useCallback(async () => {
    try {
      const response = await api('games/extermination');
      if (alive.current) setData(response);
      return response;
    } catch (err) {
      if (alive.current) setError(err.message);
    }
  }, [api]);
  useRefreshOnReturn(refreshRanks);
  function remember(value) {
    try {
      value
        ? sessionStorage.setItem(
            storageKey,
            JSON.stringify({ packet: value, queued: queued.current }),
          )
        : sessionStorage.removeItem(storageKey);
    } catch {}
  }
  function renderModel() {
    if (model.current && alive.current)
      setView({ ...model.current, enemies: [...model.current.enemies] });
  }
  function accept(response) {
    if (recovering.current) {
      anchor.current =
        performance.now() -
        Math.max(response.run.lastTime, response.serverTime - Date.parse(response.run.issuedAt));
      recovering.current = false;
    }
    const current = structuredClone(response.run);
    for (const event of queued.current) applyTrainingEvent(current, event);
    advanceTraining(current, Math.max(current.lastTime, performance.now() - anchor.current));
    model.current = current;
    syncPoints(user.id, response.points);
    if (response.run.result && completed.current !== response.run.id) {
      completed.current = response.run.id;
      setResult(response.run.result);
      void refreshRanks();
    }
    renderModel();
  }
  async function sync() {
    if (sending.current || !model.current || readonly) return;
    const token = epoch.current;
    sending.current = true;
    failed.current = false;
    setConnectionError(false);
    const payload = packet.current || {
      runId: model.current.id,
      step: model.current.sequence,
      events: queued.current.slice(0, 128),
      at: model.current.lastTime,
    };
    packet.current = payload;
    remember(payload);
    lastSend.current = performance.now();
    try {
      const response = await puzzleRequest(
        api,
        'games/extermination/sync',
        { method: 'POST', body: payload },
        controllers.current,
      );
      if (!alive.current || token !== epoch.current) return;
      queued.current.splice(0, payload.events.length);
      packet.current = null;
      remember(null);
      setError('');
      accept(response);
    } catch (err) {
      if (!alive.current || token !== epoch.current) return;
      failed.current = true;
      setConnectionError(true);
      setError(err.message);
    } finally {
      if (token === epoch.current) sending.current = false;
    }
    if (alive.current && !failed.current && queued.current.length && token === epoch.current)
      void synchronize.current();
  }
  synchronize.current = sync;
  useEffect(() => {
    alive.current = true;
    void (async () => {
      const response = await refreshRanks();
      if (!alive.current || !response) return;
      let saved;
      try {
        saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      } catch {}
      const current = response.active;
      const pending = saved?.packet || saved;
      if (pending?.runId && Array.isArray(pending.events) && Number.isInteger(pending.step)) {
        packet.current = pending;
        queued.current = Array.isArray(saved?.queued) ? [...saved.queued] : [...pending.events];
        model.current = {
          id: pending.runId,
          sequence: pending.step,
          lastTime: pending.at,
          enemies: [],
        };
        anchor.current = performance.now() - pending.at;
        recovering.current = true;
        void synchronize.current();
      } else if (current) {
        anchor.current =
          performance.now() -
          Math.max(current.lastTime, response.serverTime - Date.parse(current.issuedAt));
        model.current = structuredClone(current);
        advanceTraining(model.current, performance.now() - anchor.current);
        renderModel();
        void synchronize.current();
      }
    })();
    let frame;
    const update = () => {
      if (!alive.current) return;
      if (model.current?.status && !failed.current) {
        const time = Math.max(model.current.lastTime, performance.now() - anchor.current);
        advanceTraining(model.current, time);
        if (performance.now() - paint.current > 32) {
          renderModel();
          paint.current = performance.now();
        }
        const needsConfirmation = model.current.status === 'finished' && !model.current.result;
        if (
          !sending.current &&
          (queued.current.length >= 16 ||
            needsConfirmation ||
            (performance.now() - lastSend.current > 800 &&
              (queued.current.length || model.current.status === 'playing')))
        )
          void synchronize.current();
      }
      frame = requestAnimationFrame(update);
    };
    frame = requestAnimationFrame(update);
    return () => {
      alive.current = false;
      ++epoch.current;
      cancelAnimationFrame(frame);
      controllers.current.forEach((controller) => controller.abort());
      if (packet.current) remember(packet.current);
      if (model.current && queued.current.length && !packet.current) {
        const payload = {
          runId: model.current.id,
          step: model.current.sequence,
          events: queued.current.slice(0, 128),
          at: model.current.lastTime,
        };
        remember(payload);
        void api('games/extermination/sync', {
          method: 'POST',
          body: payload,
          keepalive: true,
        }).catch(() => {});
      }
    };
  }, [refreshRanks, api, storageKey]);
  async function start() {
    if (busy || readonly || sending.current) return;
    const token = ++epoch.current;
    setBusy(true);
    setError('');
    startPacket.current ||= { requestId: crypto.randomUUID() };
    try {
      const response = await puzzleRequest(
        api,
        'games/extermination/start',
        { method: 'POST', body: startPacket.current },
        controllers.current,
      );
      if (!alive.current || token !== epoch.current) return;
      anchor.current = performance.now() - response.run.lastTime;
      queued.current = [];
      packet.current = null;
      remember(null);
      failed.current = false;
      setConnectionError(false);
      setResult(null);
      model.current = structuredClone(response.run);
      startPacket.current = null;
      syncPoints(user.id, response.points);
      renderModel();
      board.current?.scrollIntoView({ block: 'center', behavior: 'smooth' });
    } catch (err) {
      if (alive.current) setError(err.message);
    } finally {
      if (alive.current) setBusy(false);
    }
  }
  function input(type, coordinates = {}) {
    const current = model.current;
    if (!current || readonly || failed.current || queued.current.length >= 128) return false;
    const event = {
      type,
      t: Math.max(current.lastTime, performance.now() - anchor.current),
      ...coordinates,
    };
    applyTrainingEvent(current, event);
    queued.current.push(event);
    if (packet.current) remember(packet.current);
    renderModel();
    if (type !== 'shot' || current.status !== 'playing') void synchronize.current();
    return true;
  }
  const inputRef = useRef(input);
  inputRef.current = input;
  useEffect(() => {
    const hide = () => {
      if (document.hidden && model.current?.status === 'playing') inputRef.current('pause');
    };
    document.addEventListener('visibilitychange', hide);
    return () => document.removeEventListener('visibilitychange', hide);
  }, []);
  function shoot(event) {
    if (model.current?.status !== 'playing') return false;
    if (model.current.reloadAt) {
      setFeedback('재장전 중…');
      return false;
    }
    setFeedback('');
    const bounds = board.current.getBoundingClientRect();
    const target = event.target.closest('[data-enemy]');
    const targetBounds = target?.getBoundingClientRect();
    const keyboard = event.type === 'click' && event.detail === 0 && targetBounds;
    const clientX = keyboard ? targetBounds.left + targetBounds.width / 2 : event.clientX;
    const clientY = keyboard ? targetBounds.top + targetBounds.height / 2 : event.clientY;
    return input('shot', {
      x: Math.max(0, Math.min(1000, ((clientX - bounds.left) / bounds.width) * 1000)),
      y: Math.max(0, Math.min(650, ((clientY - bounds.top) / bounds.height) * 650)),
    });
  }
  const currentStage = trainingStage(view?.stage || 1);
  const playing = view?.status === 'playing';
  const impact =
    view?.lastImpact && view.lastTime - view.lastImpact.wallTime < 450 ? view.lastImpact : null;
  const attack =
    view?.lastAttack && view.lastTime - view.lastAttack.wallTime < 450 ? view.lastAttack : null;
  return (
    <section className="training-page">
      <header className="training-heading">
        <div>
          <h1>
            <Crosshair size={28} /> 소탕 훈련
          </h1>
          <p>잠깐 나타나는 적을 조준하고, 처치한 만큼 포인트를 획득하세요.</p>
        </div>
        <Link href="/games/hand-enhancement">
          손 강화 +{view?.handLevel ?? data?.handLevel ?? 0} →
        </Link>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="training-layout">
        <section className="training-console" aria-label="소탕 훈련 게임">
          <div className="training-hud">
            <strong>{view?.stage || 1} / 20 단계</strong>
            <span>HP {view?.hp ?? 50} / 50</span>
            <span>
              {puzzleTime(
                Math.max(0, trainingDuration - ((view?.clock || 0) - (view?.stageStart || 0))),
              ).slice(0, 5)}
            </span>
          </div>
          <div
            className="training-player-health"
            role="progressbar"
            aria-label="내 HP"
            aria-valuemin={0}
            aria-valuemax={50}
            aria-valuenow={view?.hp ?? 50}
          >
            <span style={{ width: `${(view?.hp ?? 50) * 2}%` }} />
          </div>
          <div
            ref={board}
            className={
              'training-field' + (playing ? ' is-playing' : '') + (attack ? ' is-damaged' : '')
            }
            aria-label="적을 클릭하거나 터치해 사격하세요"
            onPointerMove={(event) => {
              if (cursor.current) {
                const bounds = board.current.getBoundingClientRect();
                cursor.current.style.left = `${event.clientX - bounds.left}px`;
                cursor.current.style.top = `${event.clientY - bounds.top}px`;
              }
            }}
            onPointerDown={(event) => {
              if (
                event.isPrimary === false ||
                (event.pointerType !== 'touch' && event.button > 0) ||
                event.target.closest('.training-overlay')
              )
                return;
              if (playing) {
                event.preventDefault();
                if (shoot(event)) lastPointer.current = performance.now();
              }
            }}
            onClick={(event) => {
              if (event.target.closest('.training-overlay')) return;
              const duplicate =
                event.detail !== 0 &&
                lastPointer.current !== null &&
                performance.now() - lastPointer.current < 750;
              lastPointer.current = null;
              if (!duplicate) shoot(event);
            }}
          >
            <span className="training-sector">테르미니드 소탕 구역</span>
            {view?.enemies.map((enemy) => {
              const type = trainingEnemies[enemy.kind],
                position = trainingEnemyPosition(enemy, view.clock);
              return (
                <button
                  type="button"
                  data-enemy={enemy.id}
                  key={enemy.id}
                  className={'training-enemy' + (view.clock - enemy.hitAt < 150 ? ' is-hit' : '')}
                  style={{
                    left: `${position.x / 10}%`,
                    top: `${position.y / 6.5}%`,
                    width: `${type.size / 10}%`,
                  }}
                  aria-label={`${type.name}, HP ${enemy.hp}`}
                >
                  <img src={`/images/training/${type.id}.webp`} alt="" draggable={false} />
                  {enemy.hp < type.hp && (
                    <span className="training-enemy-health">
                      <small>
                        {enemy.hp} / {type.hp}
                      </small>
                      <span style={{ width: `${(enemy.hp / type.hp) * 100}%` }} />
                    </span>
                  )}
                  <span
                    className="training-exposure"
                    style={{
                      transform: `scaleX(${Math.max(0, (enemy.expires - view.clock) / (enemy.expires - enemy.born))})`,
                    }}
                  />
                </button>
              );
            })}
            {attack && (
              <img
                key={attack.id + ':' + attack.at}
                className="training-attacker"
                src={`/images/training/${trainingEnemies[attack.kind].id}.webp`}
                alt=""
                style={{ left: `${attack.x / 10}%`, top: `${attack.y / 6.5}%` }}
              />
            )}
            {impact && (
              <span
                key={impact.id}
                className={impact.hit ? 'training-hit-marker' : 'training-miss'}
                style={{ left: `${impact.x / 10}%`, top: `${impact.y / 6.5}%` }}
              >
                {impact.hit && (
                  <>
                    <b>×</b>
                    <small>{impact.reward ? `처치 +${impact.reward}P` : '−1'}</small>
                  </>
                )}
              </span>
            )}
            <span className="training-crosshair" ref={cursor} aria-hidden="true">
              +
            </span>
            {feedback && view?.reloadAt > 0 && (
              <span className="training-feedback">{feedback}</span>
            )}
            {(!view || !playing || connectionError) && (
              <div className="training-overlay">
                <div>
                  <Crosshair size={32} />
                  <h2>
                    {connectionError
                      ? '연결 확인 중'
                      : view?.status === 'cleared'
                        ? '구역 소탕 완료'
                        : view?.status === 'paused'
                          ? '훈련 일시 정지'
                          : view?.status === 'finished'
                            ? view.reason === 'completed'
                              ? '20단계 완주!'
                              : view.reason === 'hp'
                                ? '게임 오버'
                                : '훈련 종료'
                            : '소탕 훈련'}
                  </h2>
                  <p>
                    {result
                      ? `${number(result.record.points)} P 획득 · ${result.rank ? `내 최고 기록 ${result.rank}위` : '순위 제외 기록'}`
                      : view?.status === 'finished'
                        ? '서버에서 기록과 보상을 확인하고 있습니다…'
                        : view?.status === 'cleared'
                          ? `이번 단계 +${number(view.stagePoints)}P`
                          : '스캐빈저 1발 · 워리어 2발 · 헌터 1발'}
                  </p>
                  <div className="training-actions">
                    {connectionError ? (
                      <Button type="button" onClick={() => void sync()}>
                        <RotateCcw size={16} /> 동기화 다시 시도
                      </Button>
                    ) : view?.status === 'cleared' ? (
                      <Button type="button" onClick={() => input('next')}>
                        다음 단계 →
                      </Button>
                    ) : view?.status === 'paused' ? (
                      <Button type="button" onClick={() => input('resume')}>
                        <Play size={16} /> 이어하기
                      </Button>
                    ) : (
                      (!view || result) && (
                        <Button type="button" onClick={start} disabled={busy || readonly}>
                          {busy ? '준비 중…' : '훈련 시작'}
                        </Button>
                      )
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="training-footer">
            <div className="training-progress">
              <span>소탕 진행</span>
              <strong>
                {view?.kills || 0} / {currentStage.goal}
              </strong>
              <div>
                <span
                  style={{
                    width: `${Math.min(100, ((view?.kills || 0) / currentStage.goal) * 100)}%`,
                  }}
                />
              </div>
            </div>
            <div className="training-controls">
              <span>{view?.reloadAt ? '재장전 중…' : `${view?.ammo ?? 12} / 12 발`}</span>
              {playing && (
                <Button type="button" variant="soft" onClick={() => input('pause')}>
                  <Pause size={15} /> 일시 정지
                </Button>
              )}
              {view && !result && (
                <Button
                  type="button"
                  variant="soft"
                  onClick={() => input('stop')}
                  disabled={readonly || connectionError}
                >
                  <Square size={15} /> 종료·정산
                </Button>
              )}
            </div>
          </div>
        </section>
        <aside className="training-sidebar">
          <span>이번 도전 획득</span>
          <strong className="training-points">
            {number(view?.points)} <small>P</small>
          </strong>
          <p>공격을 허용하면 몹별로 HP가 감소합니다. 다음 단계에서 HP 5를 회복합니다.</p>
          <div className="training-roster">
            {trainingEnemies.map((enemy, index) => (
              <div key={enemy.id}>
                <img src={`/images/training/${enemy.id}.webp`} alt="" />
                <span>
                  {enemy.name}
                  <small>
                    {enemy.hp}발 · 공격 {enemy.attack}
                    {index === 5 ? ' · 10단계+' : index === 6 ? ' · 15단계+' : ''}
                  </small>
                </span>
              </div>
            ))}
          </div>
        </aside>
      </div>
      {result && (
        <section className="training-result">
          <h2>최종 전투 결과</h2>
          <strong>{number(result.record.points)} P</strong>
          <p>
            {result.rank ? `내 월간 최고 기록 ${result.rank}위` : '순위 제외 기록'} ·{' '}
            {result.record.stage}/20단계 · {result.record.kills}마리 처치 · 명중률{' '}
            {result.record.accuracy}% · {puzzleTime(result.record.elapsedMs)}
          </p>
          <details>
            <summary>처치별 포인트 정산</summary>
            <ul>
              {trainingEnemies.map(
                (enemy, index) =>
                  result.record.counts[index] > 0 && (
                    <li key={enemy.id}>
                      {enemy.name} {result.record.counts[index]}마리{' '}
                      <strong>{number(result.record.income[index])} P</strong>
                    </li>
                  ),
              )}
            </ul>
          </details>
          <GameResultShare
            game="extermination"
            resultId={result.record.id}
            label="소탕 훈련 결과 공유"
          />
        </section>
      )}
      <section className="training-ranking">
        <h2>
          <Trophy size={22} /> 월간 랭킹 <small>{data?.month}</small>
        </h2>
        <p>획득 포인트 → 도달 단계 → 명중률 → 전투 시간 순 · 회원별 최고 기록</p>
        {data?.mine && (
          <p className="training-mine">
            내 최고 기록 {data.mine.rank}위 · {number(data.mine.points)} P
          </p>
        )}
        <table>
          <thead>
            <tr>
              <th>순위</th>
              <th>대원</th>
              <th>도달 단계</th>
              <th>포인트</th>
            </tr>
          </thead>
          <tbody>
            {data?.rankings.map((row) => (
              <tr key={row.id} className={row.own ? 'is-own' : ''}>
                <td>{row.rank}</td>
                <td>{row.nickname}</td>
                <td>{row.stage} / 20</td>
                <td>{number(row.points)} P</td>
              </tr>
            ))}
          </tbody>
        </table>
        {data?.total === 0 && <p>이번 달 첫 소탕 기록에 도전해보세요.</p>}
      </section>
    </section>
  );
}
