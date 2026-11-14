'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { HandFist, Sparkles, ArrowRight, Shield, Flame, RotateCcw } from 'lucide-react';
import { Button } from './ui';
import Modal from './Modal';
import HandCrest from './HandCrest';
import GameResultShare from './GameResultShare';
import { useCommunity } from './CommunityProvider';
import { rpsHandStages, rpsMaxHandLevel } from '@/lib/rps-enhancement.mjs';

const number = (value) => value.toLocaleString('ko-KR');
const handAppearance = (level) => ({
  '--hand-hue': [165, 190, 255, 35, 48][Math.floor(level / 5)],
  '--hand-power': level / 20,
  '--forge-duration': `${1800 + level * 65}ms`,
});

function ForgeSuccessBurst({ level }) {
  const tier = Math.floor(level / 5);
  const count = 12 + tier * 6;
  return (
    <div className="hand-success-burst" aria-hidden="true">
      <span className="hand-success-flash" />
      {tier >= 2 && <span className="hand-success-rays" />}
      {Array.from({ length: 1 + tier }, (_, index) => (
        <span
          className="hand-success-wave"
          key={`wave-${index}`}
          style={{ '--burst-delay': `${index * 120}ms` }}
        />
      ))}
      {Array.from({ length: count }, (_, index) => (
        <i
          key={index}
          className="hand-success-particle"
          style={{
            '--spark-angle': `${(index * 360) / count}deg`,
            '--spark-distance': `${65 + tier * 17 + (index % 3) * 15}px`,
            '--spark-size': `${3 + tier + (index % 2)}px`,
            '--burst-delay': `${(index % 4) * 55}ms`,
          }}
        />
      ))}
    </div>
  );
}
export function EnchantedHand({ level = 0, compact = false, effect = '' }) {
  const tier = Math.floor(level / 5);
  return (
    <div
      className={`enchanted-hand tier-${tier} ${compact ? 'is-compact' : ''} ${effect}`}
      style={handAppearance(level)}
      aria-hidden="true"
    >
      <div className="enchanted-hand-aura" />
      {effect === 'is-success' && !compact && <ForgeSuccessBurst level={level} />}
      <div className="enchanted-hand-ring" />
      <div className="enchanted-hand-runes">
        {Array.from({ length: 4 + Math.floor(level / 2) }, (_, index) => (
          <i
            key={index}
            style={{ '--rune-angle': `${(index * 360) / (4 + Math.floor(level / 2))}deg` }}
          />
        ))}
      </div>
      <HandCrest level={level} className="enchanted-hand-crest" />
      <HandFist className="enchanted-hand-glyph" strokeWidth={1.15} />
      {level >= 5 && <Sparkles className="enchanted-hand-spark" />}
    </div>
  );
}

export default function RpsHandEnhancement({ onClose, onUpdate }) {
  const { api, user } = useCommunity();
  const [data, setData] = useState(null),
    [busy, setBusy] = useState(false),
    [pending, setPending] = useState(null),
    [error, setError] = useState('');
  const alive = useRef(true),
    locked = useRef(false),
    pendingRef = useRef(null),
    revision = useRef(0);
  const storageKey = 'hd-rps-enhance:' + user.id;
  const remember = useCallback(
    (packet) => {
      pendingRef.current = packet;
      setPending(packet);
      try {
        packet
          ? sessionStorage.setItem(storageKey, JSON.stringify(packet))
          : sessionStorage.removeItem(storageKey);
      } catch {
        /* In-memory retry still works. */
      }
    },
    [storageKey],
  );
  const apply = useCallback(
    (result) => {
      setData(result);
      onUpdate(result);
    },
    [onUpdate],
  );
  const refresh = useCallback(async () => {
    const version = ++revision.current;
    const packet = pendingRef.current;
    try {
      const result = await api(
        'games/rps/enhance' + (packet ? '?requestId=' + encodeURIComponent(packet.requestId) : ''),
      );
      if (!alive.current || version !== revision.current) return;
      apply(result);
      if (packet && result.result?.requestId === packet.requestId) {
        remember(null);
        setError('');
      }
    } catch (err) {
      if (alive.current && version === revision.current) setError(err.message);
    }
  }, [api, apply, remember]);
  useEffect(() => {
    alive.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (saved && typeof saved.requestId === 'string' && Number.isInteger(saved.expectedVersion))
        remember(saved);
    } catch {
      /* Fall back to server state. */
    }
    void refresh();
    return () => {
      alive.current = false;
      ++revision.current;
    };
  }, [storageKey, refresh, remember]);
  async function enhance() {
    if (locked.current || !data) return;
    locked.current = true;
    ++revision.current;
    setBusy(true);
    setError('');
    setData((current) => ({ ...current, result: null }));
    const packet = pendingRef.current || {
      requestId: crypto.randomUUID(),
      expectedVersion: data.hand.version,
    };
    remember(packet);
    const started = Date.now(),
      controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await api('games/rps/enhance', {
        method: 'POST',
        body: packet,
        signal: controller.signal,
      });
      await new Promise((resolve) =>
        setTimeout(resolve, Math.max(0, 1300 - (Date.now() - started))),
      );
      if (!alive.current) return;
      apply(result);
      remember(null);
    } catch (err) {
      if (!alive.current) return;
      if (err.status >= 400 && err.status < 500) {
        remember(null);
        void refresh();
      }
      setError(
        err.name === 'AbortError'
          ? '응답이 늦어지고 있습니다. 같은 강화 요청을 다시 확인해주세요.'
          : err.message,
      );
    } finally {
      clearTimeout(timeout);
      locked.current = false;
      if (alive.current) setBusy(false);
    }
  }
  const level = data?.hand.level || 0,
    stage = rpsHandStages[level],
    next = rpsHandStages[level + 1],
    result = data?.result;
  const wallet = data?.points.current ?? 0;
  const effect = busy ? 'is-forging' : result ? (result.success ? 'is-success' : 'is-failure') : '';
  return (
    <Modal
      title="손 강화"
      onClose={() => {
        if (!locked.current) onClose();
      }}
      className="rps-enhancement-modal"
    >
      <div className="hand-forge-heading">
        <span>ARCANE FORGE</span>
        <small>최대 +{rpsMaxHandLevel}</small>
      </div>
      <div
        className={`hand-forge-stage ${effect}`}
        style={handAppearance(level)}
        key={busy ? 'forging' : result?.requestId || 'idle'}
      >
        <div className="hand-forge-visual">
          <EnchantedHand level={level} effect={effect} />
          <span className="hand-level">+{level}</span>
          <h2>{stage.name}</h2>
          <p className="hand-forge-success">
            {next ? (
              <>
                강화 성공 확률 <strong>{next.successPercent}%</strong>
              </>
            ) : (
              '최고 강화 달성'
            )}
          </p>
        </div>
        <div className={`hand-forge-result ${effect}`} role="status" aria-live="polite">
          {busy ? (
            <>
              <Flame size={18} /> 손에 마력을 새기고 있습니다…
            </>
          ) : result ? (
            <>
              <Sparkles size={18} />
              <span>
                <b className="hand-forge-result-title">
                  {result.success ? '강화 성공!' : '강화 실패'}
                </b>{' '}
                <strong>
                  +{result.from} → +{result.to}
                </strong>
                {!result.success && result.from === result.to && ' · 단계 유지'}
              </span>
            </>
          ) : (
            <>
              <Shield size={17} /> 강화 효과는 가위·바위·보 모두에 적용됩니다.
            </>
          )}
        </div>
      </div>
      {next ? (
        <>
          <div className="hand-forge-next">
            <span>다음 강화</span>
            <strong>
              +{level} → +{next.level} · {next.name}
            </strong>
            <ArrowRight size={17} />
          </div>
          <dl className="hand-forge-stats">
            <div>
              <dt>강화 비용</dt>
              <dd>
                {number(next.cost)} <small>P</small>
              </dd>
            </div>
            <div>
              <dt>실패 시</dt>
              <dd>{next.failureDrop ? `-${next.failureDrop}강` : '단계 유지'}</dd>
            </div>
          </dl>
          <Button
            type="button"
            className="hand-forge-button"
            disabled={!data || busy || (!pending && wallet < next.cost)}
            onClick={enhance}
          >
            {pending && !busy ? <RotateCcw size={18} /> : <Sparkles size={18} />}
            {busy
              ? '강화 중…'
              : pending
                ? '강화 결과 다시 확인'
                : `+${next.level} 강화 · ${number(next.cost)}P`}
          </Button>
          <p className="hand-forge-wallet">
            보유 {number(wallet)}P
            {data && wallet < next.cost && !pending ? ' · 포인트가 부족합니다.' : ''}
          </p>
        </>
      ) : (
        <div className="hand-forge-max">
          <Sparkles size={22} />
          <strong>최고 단계에 도달했습니다</strong>
          <span>창세의 마력이 손에 깃들었습니다.</span>
        </div>
      )}
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!data && !busy && (
        <Button type="button" onClick={refresh}>
          강화 정보 다시 불러오기
        </Button>
      )}
      {data && !busy && !pending && (
        <div className="hand-forge-share">
          <GameResultShare
            game="rps-hand"
            resultId={String(data.hand.version)}
            label="내 손 강화 공유"
          />
        </div>
      )}
      <details className="hand-forge-guide">
        <summary>강화 확률과 규칙 보기</summary>
        <p>손을 강화하면 가위·바위·보에서 이길 확률이 높아집니다.</p>
        <p>
          도전하는 목표 단계 기준으로 +1~5 실패 시 유지, +6~10 실패 시 -1강, +11~20 실패 시
          -2강입니다. 성공·실패 모두 비용을 사용하며 도전 횟수는 소모하지 않습니다.
        </p>
        <div className="hand-forge-table">
          <table>
            <thead>
              <tr>
                <th>강화 단계</th>
                <th>성공 확률</th>
                <th>비용</th>
                <th>실패</th>
              </tr>
            </thead>
            <tbody>
              {rpsHandStages.slice(1).map((item) => (
                <tr key={item.level} className={item.level === next?.level ? 'is-current' : ''}>
                  <th>
                    +{item.level - 1} → +{item.level}
                  </th>
                  <td>{item.successPercent}%</td>
                  <td>{number(item.cost)}P</td>
                  <td>{item.failureDrop ? `-${item.failureDrop}강` : '유지'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </Modal>
  );
}
