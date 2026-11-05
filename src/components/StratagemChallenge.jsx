'use client';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  RadioTower,
  Coins,
  Check,
  Trophy,
  Timer,
  RotateCcw,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button } from './ui';
import useRefreshOnReturn from '@/hooks/useRefreshOnReturn';
import {
  challengeEntry,
  challengeStages,
  directionArrows,
  directionLabels,
  directionKeys,
} from '@/lib/stratagem-challenge.mjs';

const path = 'games/stratagem';
const number = (value) => (value || 0).toLocaleString('ko-KR');
const glyphs = { U: ArrowUp, L: ArrowLeft, D: ArrowDown, R: ArrowRight };
function advanceBufferedCommand(run, answers) {
  for (const { body } of answers) {
    if (run?.status === 'playing' && run.command.token === body.token && run.nextCommand) {
      run = { ...run, completed: run.completed + 1, command: run.nextCommand, nextCommand: null };
    }
  }
  return run;
}
export default function StratagemChallenge() {
  const { user } = useCommunity();
  return <Game key={user.id} />;
}
function Game() {
  const { api, user, role, actualRole, syncPoints } = useCommunity();
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  const [entered, setEntered] = useState(''),
    [mistake, setMistake] = useState(false),
    [now, setNow] = useState(0);
  const [pending, setPending] = useState(null);
  const lock = useRef(false),
    alive = useRef(true),
    generation = useRef(0),
    inputRef = useRef('');
  const arena = useRef(null),
    synced = useRef({ at: 0, serverTime: 0 }),
    mistakeTimer = useRef(null);
  const pendingRef = useRef(null),
    inputHandler = useRef(null),
    currentRunId = useRef(null),
    displayedRun = useRef(null),
    answers = useRef([]),
    initialized = useRef(false),
    storageKey = 'hd-stratagem-pending:' + user.id;
  const run = data?.run,
    stages = run?.stages || challengeStages,
    stage = stages[(run?.stage || 1) - 1];
  const preview = role !== actualRole,
    playing = run?.status === 'playing',
    checkpoint = run?.status === 'checkpoint';
  const ended = run && !playing && !checkpoint;
  const wallet = data?.points.current ?? user.points.current;
  const remaining = Math.max(0, (run?.deadlineAt || now) - now);
  const ready = playing && now >= run.readyAt && remaining > 0;
  const waitingForAnswer = playing && entered === run.command.code;
  const inputBlocked =
    !ready ||
    preview ||
    Boolean(error) ||
    waitingForAnswer ||
    (busy && pending?.action !== 'answer');
  const remember = useCallback((packet) => {
    pendingRef.current = packet;
    setPending(packet);
  }, []);
  const apply = useCallback(
    (result) => {
      const nextRun =
        result.run?.id === currentRunId.current
          ? advanceBufferedCommand(result.run, answers.current)
          : null;
      if (displayedRun.current?.command?.token !== nextRun?.command?.token) {
        inputRef.current = '';
        setEntered('');
        setMistake(false);
      }
      displayedRun.current = nextRun;
      synced.current = { at: performance.now(), serverTime: result.serverTime };
      setNow(result.serverTime);
      setData({ ...result, run: nextRun });
      syncPoints(user.id, result.points);
    },
    [syncPoints, user.id],
  );
  const refresh = useCallback(async () => {
    if (lock.current || answers.current.length) return;
    const version = ++generation.current;
    try {
      let result = await api(path);
      if (!alive.current || version !== generation.current) return;
      if (
        !initialized.current &&
        !preview &&
        ['playing', 'checkpoint'].includes(result.run?.status)
      ) {
        result = await api(path + '/reset', { method: 'POST', body: { runId: result.run.id } });
      }
      if (alive.current && version === generation.current) {
        initialized.current = true;
        apply(result);
        setError('');
      }
    } catch (err) {
      if (alive.current && version === generation.current) setError(err.message);
    }
  }, [api, apply, preview]);
  const act = useCallback(
    async (packet) => {
      if (lock.current || preview) return;
      lock.current = true;
      ++generation.current;
      setBusy(true);
      setError('');
      remember(packet);
      try {
        const result = await api(path + '/' + packet.action, { method: 'POST', body: packet.body });
        if (alive.current) {
          if (packet.action === 'start') currentRunId.current = result.run.id;
          apply(result);
          remember(null);
        }
      } catch (err) {
        if (!alive.current) return;
        setError(err.message);
        if (err.status && err.status < 500) {
          remember(null);
          inputRef.current = '';
          setEntered('');
          try {
            const result = await api(path);
            if (alive.current) apply(result);
          } catch {
            /* Keep the original error. */
          }
        }
      } finally {
        lock.current = false;
        if (alive.current) setBusy(false);
      }
    },
    [api, apply, preview, remember],
  );
  const sendAnswers = useCallback(async () => {
    if (lock.current || preview || !answers.current.length) return;
    lock.current = true;
    ++generation.current;
    setBusy(true);
    setError('');
    try {
      while (alive.current && answers.current.length) {
        const packet = answers.current[0];
        remember(packet);
        const result = await api(path + '/answer', { method: 'POST', body: packet.body });
        if (!alive.current) return;
        answers.current.shift();
        if (result.run?.status !== 'playing') answers.current = [];
        apply(result);
      }
      remember(null);
    } catch (err) {
      if (!alive.current) return;
      setError(err.message);
      if (err.status && err.status < 500) {
        answers.current = [];
        remember(null);
        inputRef.current = '';
        setEntered('');
        try {
          const result = await api(path);
          if (alive.current) apply(result);
        } catch {
          /* Keep the original error and let the player refresh the authoritative state. */
        }
      }
    } finally {
      lock.current = false;
      if (alive.current) setBusy(false);
    }
  }, [api, apply, preview, remember]);
  useEffect(() => {
    alive.current = true;
    initialized.current = false;
    currentRunId.current = null;
    displayedRun.current = null;
    answers.current = [];
    remember(null);
    try {
      sessionStorage.removeItem(storageKey);
    } catch {
      /* Old saved requests must not replay on a new visit. */
    }
    refresh();
    return () => {
      alive.current = false;
      ++generation.current;
      clearTimeout(mistakeTimer.current);
    };
  }, [storageKey, refresh, remember]);
  useRefreshOnReturn(refresh);
  useEffect(() => {
    if (!playing) return;
    let checking = false;
    const timer = setInterval(() => {
      const time = synced.current.serverTime + performance.now() - synced.current.at;
      setNow(time);
      if (time >= run.deadlineAt && !checking && !lock.current) {
        checking = true;
        refresh();
      }
    }, 100);
    return () => clearInterval(timer);
  }, [playing, run?.deadlineAt, refresh]);
  useEffect(() => {
    if (!playing) return;
    const frame = requestAnimationFrame(() => {
      arena.current?.focus({ preventScroll: true });
      arena.current?.scrollIntoView({
        block: 'center',
        behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
          ? 'instant'
          : 'smooth',
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [run?.id, run?.stage, playing]);
  const input = (direction) => {
    const current = displayedRun.current;
    if (
      !ready ||
      preview ||
      error ||
      !current?.command ||
      inputRef.current === current.command.code ||
      (lock.current && pendingRef.current?.action !== 'answer')
    )
      return;
    const next = inputRef.current + direction;
    clearTimeout(mistakeTimer.current);
    if (!current.command.code.startsWith(next)) {
      inputRef.current = '';
      setEntered('');
      setMistake(true);
      mistakeTimer.current = setTimeout(() => setMistake(false), 500);
      return;
    }
    setMistake(false);
    inputRef.current = next;
    setEntered(next);
    if (next === current.command.code) {
      const packet = {
        action: 'answer',
        body: { runId: current.id, token: current.command.token, answer: next },
      };
      answers.current.push(packet);
      const advanced = advanceBufferedCommand(current, [packet]);
      if (advanced !== current) {
        displayedRun.current = advanced;
        inputRef.current = '';
        setEntered('');
        setData((previous) => ({ ...previous, run: advanced }));
      }
      sendAnswers();
    }
  };
  inputHandler.current = input;
  useEffect(() => {
    if (!playing) return;
    const handleKey = (event) => {
      if (event.ctrlKey || event.metaKey || event.altKey || event.defaultPrevented) return;
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        (target.isContentEditable ||
          target.closest(
            'input, textarea, select, [role="textbox"], [role="combobox"], [role="dialog"], [role="menu"], [role="listbox"]',
          ))
      )
        return;
      const direction =
        directionKeys[event.code] ||
        directionKeys[event.key] ||
        directionKeys[event.key?.toLowerCase()];
      if (!direction) return;
      event.preventDefault();
      if (!event.repeat) inputHandler.current(direction);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [playing]);
  const start = () =>
    act({ action: 'start', body: { requestId: crypto.randomUUID(), replacePrevious: true } });
  return (
    <section className="stratagem-page">
      <header className="stratagem-heading">
        <div>
          <span className="eyebrow">SUPER EARTH · SIGNAL TRAINING</span>
          <h1>
            <RadioTower />
            스트라타젬 입력 챌린지
          </h1>
          <p>정확하게 입력하고, 보상을 지키거나 다음 단계에 도전하세요.</p>
        </div>
        <div className="stratagem-wallet">
          <Coins size={23} />
          <span>
            현재 포인트
            <strong>
              {number(wallet)} <small>P</small>
            </strong>
          </span>
        </div>
      </header>
      {preview && (
        <p className="form-error" role="status">
          화면 확인 모드입니다. 실제 등급으로 돌아오면 도전할 수 있습니다.
        </p>
      )}
      {error && (
        <div className="stratagem-error" role="alert">
          <p>{error}</p>
          <Button
            type="button"
            disabled={busy}
            onClick={() =>
              pending?.action === 'answer' ? sendAnswers() : pending ? act(pending) : refresh()
            }
          >
            다시 확인
          </Button>
        </div>
      )}
      <div className="stratagem-layout">
        <section
          className={'stratagem-console' + (mistake ? ' is-mistake' : '')}
          ref={arena}
          tabIndex={0}
          aria-label="스트라타젬 입력 게임판"
          onDragStart={(event) => event.preventDefault()}
        >
          <div className="stratagem-console-top">
            <span>
              <RadioTower size={16} />{' '}
              {playing ? '신호 전송 중' : checkpoint ? '전송 완료' : '통신 대기'}
            </span>
            <span>{run && !ended ? `${run.stage} / ${stages.length} 단계` : 'SOLO CHALLENGE'}</span>
          </div>
          {!data ? (
            <div className="stratagem-message" role="status">
              새 도전을 준비하고 있습니다…
            </div>
          ) : playing ? (
            <>
              <div className="stratagem-progress">
                <strong>
                  명령 {run.completed + 1} <small>/ {stage.commands}</small>
                </strong>
                <span>
                  <Timer size={16} />
                  {now < run.readyAt ? '준비' : (remaining / 1000).toFixed(1) + '초'}
                </span>
              </div>
              <div
                className="stratagem-timer"
                role="progressbar"
                aria-label="남은 시간"
                aria-valuemin={0}
                aria-valuemax={stage.seconds}
                aria-valuenow={Math.min(stage.seconds, Math.ceil(remaining / 1000))}
              >
                <i style={{ width: Math.min(100, remaining / (stage.seconds * 10)) + '%' }} />
              </div>
              <div className="stratagem-command" key={run.command.token}>
                <img src={run.command.src} alt="" draggable={false} />
                <h2>{run.command.label}</h2>
                <div
                  className="stratagem-code"
                  aria-label={
                    '입력 순서: ' +
                    [...run.command.code].map((key) => directionLabels[key]).join(', ')
                  }
                >
                  {[...run.command.code].map((key, index) => (
                    <span
                      key={index}
                      className={
                        index < entered.length
                          ? 'is-done'
                          : index === entered.length
                            ? 'is-next'
                            : ''
                      }
                    >
                      {directionArrows[key]}
                    </span>
                  ))}
                </div>
                <p className="stratagem-feedback" role="status">
                  {remaining === 0
                    ? '시간 종료 · 결과 확인 중'
                    : now < run.readyAt
                      ? '잠시 후 시작합니다'
                      : waitingForAnswer
                        ? '명령 확인 중…'
                        : mistake
                          ? '입력이 달라요. 이 명령을 처음부터!'
                          : '표시된 방향을 순서대로 입력하세요'}
                </p>
              </div>
              <div className="stratagem-dpad" aria-label="방향 입력">
                {Object.entries(glyphs).map(([key, Glyph]) => (
                  <button
                    type="button"
                    key={key}
                    className={'direction-' + key}
                    aria-label={directionLabels[key]}
                    disabled={inputBlocked}
                    onClick={() => input(key)}
                  >
                    <Glyph size={29} />
                  </button>
                ))}
              </div>
              <p className="stratagem-key-help">PC 방향키 / WASD · 모바일 방향 버튼</p>
            </>
          ) : checkpoint ? (
            <div className="stratagem-message" role="status">
              <div className="stratagem-emblem">
                <Check size={40} />
              </div>
              <span className="eyebrow">STAGE CLEAR</span>
              <h2>{run.stage}단계 성공!</h2>
              <p>
                지금 받으면 <strong>{number(stage.payout)} P</strong>
              </p>
              <p>다음 단계에서 실패하면 보상을 받을 수 없습니다.</p>
              <div className="stratagem-actions">
                <Button
                  type="button"
                  primary
                  disabled={busy || preview || Boolean(pending)}
                  onClick={() => act({ action: 'cashout', body: { runId: run.id } })}
                >
                  <Coins size={18} />
                  {number(stage.payout)}P 받고 종료
                </Button>
                <Button
                  type="button"
                  disabled={busy || preview || Boolean(pending)}
                  onClick={() =>
                    act({ action: 'continue', body: { runId: run.id, stage: run.stage } })
                  }
                >
                  {run.stage + 1}단계 도전
                  <ArrowRight size={17} />
                </Button>
              </div>
            </div>
          ) : (
            <div className="stratagem-message" role="status">
              <div className="stratagem-emblem">
                {ended && run.payout > 0 ? <Trophy size={40} /> : <RadioTower size={40} />}
              </div>
              <span className="eyebrow">{ended ? 'MISSION REPORT' : 'READY TO TRANSMIT'}</span>
              <h2>
                {ended
                  ? run.status === 'failed'
                    ? '시간이 종료되었습니다'
                    : run.status === 'abandoned'
                      ? '도전이 종료되었습니다'
                      : run.status === 'completed'
                        ? `${stages.length}단계 완주! 임무 성공`
                        : '보상을 확보했습니다'
                  : '손끝으로 완성하는 민주주의'}
              </h2>
              {ended ? (
                <>
                  <strong className="stratagem-payout">
                    {number(run.payout)} <small>P {run.payout ? '지급' : '보상'}</small>
                  </strong>
                  <p>
                    {run.payout
                      ? `참가비 ${challengeEntry}P 포함 · 순이익 ${run.payout - challengeEntry}P`
                      : `도전이 종료되어 참가비 ${challengeEntry}P를 잃었습니다.`}
                  </p>
                </>
              ) : (
                <p>
                  {challengeStages.length}단계의 신호를 완성하고 최대{' '}
                  <strong>{number(challengeStages.at(-1).payout)}P</strong>를 획득하세요.
                  <br />각 단계 성공 후 보상을 받고 종료할 수 있습니다.
                </p>
              )}
              <Button
                type="button"
                primary
                disabled={!data || busy || preview || Boolean(pending) || wallet < challengeEntry}
                onClick={start}
              >
                {ended ? <RotateCcw size={18} /> : <RadioTower size={18} />}
                {busy
                  ? '확인 중…'
                  : wallet < challengeEntry
                    ? `${number(challengeEntry)}P가 필요합니다`
                    : `${number(challengeEntry)}P로 도전 시작`}
              </Button>
              <p className="stratagem-key-help">
                첫 성공 {number(challengeStages[0].payout)}P · 3단계{' '}
                {number(challengeStages[2].payout)}P · 5단계 {number(challengeStages[4].payout)}P ·
                완주 {number(challengeStages.at(-1).payout)}P
              </p>
            </div>
          )}
        </section>
        <aside className="stratagem-rewards">
          <header>
            <Trophy size={21} />
            <h2>단계별 보상</h2>
            <span>총 지급액</span>
          </header>
          <ol>
            {stages.map((item, index) => (
              <li
                key={index}
                className={run && !ended && run.stage === index + 1 ? 'is-current' : ''}
              >
                <b>{index + 1}</b>
                <div>
                  <strong>
                    {number(item.payout)} <small>P</small>
                  </strong>
                  <span>
                    명령 {item.commands}개 · {item.seconds}초
                  </span>
                </div>
                {([2, 4, 6].includes(index) || index === stages.length - 1) && (
                  <span className="stratagem-milestone">
                    {index === stages.length - 1 ? '최종' : '목표'}
                  </span>
                )}
              </li>
            ))}
          </ol>
          <p>
            보상은 단계별로 더해지지 않습니다.
            <br />
            100P를 받고 종료하면 본전입니다.
          </p>
        </aside>
      </div>
      <section className="stratagem-rules">
        <h2>플레이 방법</h2>
        <ol>
          <li>
            {number(challengeEntry)}P로 시작하며, 첫 단계는 명령 {challengeStages[0].commands}
            개입니다. 명령이 나타나면 바로 방향키·WASD 또는 터치 버튼으로 입력하세요. 한글 입력
            상태에서도 WASD를 사용할 수 있습니다.
          </li>
          <li>틀린 입력은 해당 명령의 처음으로 돌아갑니다. 단계의 제한 시간은 계속 흐릅니다.</li>
          <li>
            단계마다 정해진 명령을 모두 완료하면 보상을 받고 종료하거나 다음 단계에 도전할 수
            있습니다. 선택 중에는 시간이 흐르지 않습니다.
          </li>
          <li>
            시간이 끝나면 보상 없이 종료됩니다. {challengeStages.length}단계 완료 시{' '}
            {number(challengeStages.at(-1).payout)}P가 자동 지급됩니다. 참가비와 보상은 현재
            포인트에만 반영됩니다.
          </li>
          <li>
            새로고침하거나 이 페이지에 다시 들어오면 시작 화면으로 초기화됩니다. 진행 중이던 도전은
            참가비 환불 없이 종료되며, 단계 성공 후 미수령 보상은 자동 지급됩니다.
          </li>
        </ol>
      </section>
    </section>
  );
}
