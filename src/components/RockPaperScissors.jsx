'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  HandFist,
  Hand,
  Coins,
  Ticket,
  Sparkles,
  Trophy,
  ArrowRight,
  RotateCcw,
  CircleHelp,
} from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button } from './ui';
import Modal from './Modal';
import GameResultShare from './GameResultShare';
import RpsHandEnhancement, { EnchantedHand } from './RpsHandEnhancement';
import { rpsHandStages } from '@/lib/rps-enhancement.mjs';
import useRefreshOnReturn from '@/hooks/useRefreshOnReturn';
import {
  rpsChoices,
  rpsStakes,
  rpsDefaultStake,
  rpsDailyAttempts,
  rpsRewards,
  rpsOutcomeWeights,
  rpsOutcomeTickets,
} from '@/lib/rps-rules.mjs';

const apiPath = 'games/rps';
const number = (value = 0) => value.toLocaleString('ko-KR');
const labels = Object.fromEntries(rpsChoices.map((choice) => [choice.id, choice.label]));
const outcomeLabels = { win: '승리', draw: '무승부', lose: '패배' };
function ScissorsHand({ size = 60, strokeWidth = 1.6, ...props }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      {...props}
    >
      <path d="m6.3 14.2-2.3-9.5a1.9 1.9 0 0 1 3.7-.9L10 11l3.7-7.8a1.9 1.9 0 1 1 3.4 1.6L14 11.4" />
      <path d="M18 14v-3a2 2 0 0 0-4 0v3" />
      <path d="m7 15-1.76-1.76a2 2 0 0 0-2.83 2.82l3.6 3.6C7.5 21.14 9.2 22 12 22h2a8 8 0 0 0 8-8v-1a2 2 0 1 0-4 0" />
      <path d="M10 18a3 3 0 0 1 3-3h1" />
    </svg>
  );
}
const glyphs = { scissors: ScissorsHand, rock: HandFist, paper: Hand };
function Gesture({ choice, size = 60 }) {
  const Glyph = glyphs[choice] || CircleHelp;
  return <Glyph size={size} strokeWidth={1.6} aria-hidden="true" />;
}
function RewardReveal({ round, onClose }) {
  const [revealed, setRevealed] = useState(false);
  const [display, setDisplay] = useState(1);
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setRevealed(true);
      return;
    }
    const interval = setInterval(() => setDisplay((value) => (value % 10) + 1), 90);
    const timer = setTimeout(() => {
      clearInterval(interval);
      setRevealed(true);
    }, 1800);
    return () => {
      clearInterval(interval);
      clearTimeout(timer);
    };
  }, []);
  const level =
    round.multiplier >= 8
      ? 'legendary'
      : round.multiplier >= 5
        ? 'epic'
        : round.multiplier >= 3
          ? 'rare'
          : 'standard';
  return (
    <Modal
      title={revealed ? '승리 보상' : '승리! 보상 배율을 확인합니다'}
      onClose={onClose}
      className={`rps-reward-modal ${revealed ? 'is-revealed' : 'is-spinning'} level-${level}`}
      footer={
        <Button type="button" onClick={() => (revealed ? onClose() : setRevealed(true))}>
          {revealed ? '확인' : '결과 바로 보기'}
          <ArrowRight size={16} />
        </Button>
      }
    >
      <div className="rps-reward-scene" aria-hidden="true">
        <div className="rps-reward-halo" />
        {revealed &&
          Array.from({ length: 8 + round.multiplier * 3 }, (_, index) => (
            <i
              key={index}
              className="rps-reward-particle"
              style={{
                '--angle': `${index * 137.5}deg`,
                '--distance': `${70 + (index % 4) * 32}px`,
                '--delay': `${(index % 6) * 60}ms`,
              }}
            />
          ))}
        <Trophy size={38} />
        <span className="eyebrow">
          {revealed
            ? round.multiplier === 10
              ? 'SUPER EARTH JACKPOT'
              : 'VICTORY REWARD'
            : 'ROLLING REWARD'}
        </span>
        <strong className="rps-reward-multiplier">
          {revealed ? round.multiplier : display}
          <small>배</small>
        </strong>
      </div>
      <div className="rps-reward-copy" role="status" aria-live="polite" aria-atomic="true">
        {revealed ? (
          <>
            <h2>
              {round.multiplier === 10 ? '민주주의의 대승리!' : `${round.multiplier}배 당첨!`}
            </h2>
            <strong>
              {number(round.payout)} <small>P 지급</small>
            </strong>
            <p>
              배팅 {number(round.stake)}P × {round.multiplier}배
            </p>
            <span>
              {round.profit ? `순이익 +${number(round.profit)}P` : '배팅액을 돌려받았습니다.'}
            </span>
          </>
        ) : (
          <>
            <h2>배율을 뽑고 있어요</h2>
            <p>1배부터 10배까지, 행운의 순간!</p>
          </>
        )}
      </div>
    </Modal>
  );
}

export default function RockPaperScissors() {
  const { user } = useCommunity();
  return <Game key={user?.id} />;
}
function Game() {
  const { api, user, role, actualRole, syncPoints } = useCommunity();
  const [data, setData] = useState(null),
    [stake, setStake] = useState(rpsDefaultStake),
    [choice, setChoice] = useState('rock'),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(''),
    [pending, setPending] = useState(null),
    [reward, setReward] = useState(null),
    [handOpen, setHandOpen] = useState(false),
    [clock, setClock] = useState(Date.now()),
    [cooldownUntil, setCooldownUntil] = useState(0),
    [opponentPreview, setOpponentPreview] = useState(rpsChoices[0].id);
  const pendingRef = useRef(null),
    busyRef = useRef(false),
    alive = useRef(true),
    sequence = useRef(0);
  const storageKey = 'hd-rps-pending:' + user.id;
  const preview = role !== actualRole;
  const opponentCycling = busy || !data?.round;
  useEffect(() => {
    if (!opponentCycling) return;
    let index = 0;
    setOpponentPreview(rpsChoices[index].id);
    const interval = setInterval(
      () => {
        index = (index + 1) % rpsChoices.length;
        setOpponentPreview(rpsChoices[index].id);
      },
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 600 : 180,
    );
    return () => clearInterval(interval);
  }, [opponentCycling]);
  const remember = useCallback(
    (packet) => {
      pendingRef.current = packet;
      setPending(packet);
      try {
        if (packet) sessionStorage.setItem(storageKey, JSON.stringify(packet));
        else sessionStorage.removeItem(storageKey);
      } catch {
        /* The in-memory retry remains available when storage is blocked. */
      }
    },
    [storageKey],
  );
  const apply = useCallback(
    (result) => {
      setData(result);
      setClock(Date.now());
      setCooldownUntil(Date.now() + Math.max(0, result.nextPlayableAt - result.serverTime));
      syncPoints(user.id, result.points);
    },
    [syncPoints, user.id],
  );
  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const version = ++sequence.current;
    const packet = pendingRef.current;
    try {
      const result = await api(
        apiPath + (packet ? '?requestId=' + encodeURIComponent(packet.requestId) : ''),
      );
      if (!alive.current || version !== sequence.current || busyRef.current) return;
      apply(result);
      if (packet && result.round?.requestId === packet.requestId) {
        remember(null);
        setError('');
        if (result.round.outcome === 'win') setReward(result.round);
      }
    } catch (err) {
      if (alive.current && version === sequence.current) setError(err.message);
    }
  }, [api, apply, remember]);
  useEffect(() => {
    alive.current = true;
    try {
      const saved = JSON.parse(sessionStorage.getItem(storageKey) || 'null');
      if (
        saved &&
        typeof saved.requestId === 'string' &&
        rpsStakes.includes(saved.stake) &&
        glyphs[saved.choice]
      )
        remember(saved);
    } catch {
      /* Start with the server state if the local retry record is unreadable. */
    }
    void refresh();
    return () => {
      alive.current = false;
      ++sequence.current;
    };
  }, [refresh, storageKey, remember]);
  useRefreshOnReturn(refresh);
  useEffect(() => {
    if (!data) return;
    const remaining = data.attempts.resetsAt - data.serverTime;
    const timer = setTimeout(() => void refresh(), Math.max(1000, remaining));
    return () => clearTimeout(timer);
  }, [data, refresh]);
  useEffect(() => {
    if (!cooldownUntil) return;
    const timer = setTimeout(() => setClock(Date.now()), Math.max(0, cooldownUntil - Date.now()));
    return () => clearTimeout(timer);
  }, [cooldownUntil]);
  async function play() {
    if (busyRef.current || preview) return;
    const packet = pendingRef.current || { requestId: crypto.randomUUID(), stake, choice };
    remember(packet);
    busyRef.current = true;
    ++sequence.current;
    setBusy(true);
    setError('');
    setReward(null);
    const started = Date.now();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 15000);
    try {
      const result = await api(apiPath + '/play', {
        method: 'POST',
        body: packet,
        signal: controller.signal,
      });
      const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      if (!reduced)
        await new Promise((resolve) =>
          setTimeout(resolve, Math.max(0, 1000 - (Date.now() - started))),
        );
      if (!alive.current) return;
      apply(result);
      remember(null);
      if (result.round.outcome === 'win') setReward(result.round);
    } catch (err) {
      if (!alive.current) return;
      if (err.status >= 400 && err.status < 500) remember(null);
      setError(
        err.name === 'AbortError'
          ? '응답이 늦어지고 있습니다. 이전 요청을 다시 확인해주세요.'
          : err.message,
      );
    } finally {
      clearTimeout(timeout);
      busyRef.current = false;
      if (alive.current) {
        setBusy(false);
        if (!pendingRef.current) void refresh();
      }
    }
  }
  const wallet = data?.points.current ?? user.points?.current ?? 0;
  const attempts = data?.attempts;
  const round = data?.round;
  const cooldown = clock < cooldownUntil;
  const disabled =
    !data ||
    busy ||
    preview ||
    Boolean(reward) ||
    Boolean(cooldown) ||
    (!pending && (!attempts?.total || wallet < stake));
  const selectedChoice = pending?.choice || choice;
  const handLevel = data?.hand?.level || 0;
  const hand = rpsHandStages[handLevel];
  const applyEnhancement = useCallback(
    (result) => {
      setData((current) =>
        current ? { ...current, hand: result.hand, points: result.points } : current,
      );
      syncPoints(user.id, result.points);
    },
    [syncPoints, user.id],
  );
  function openEnhancement() {
    if (busyRef.current || pendingRef.current || preview) return;
    busyRef.current = true;
    ++sequence.current;
    setHandOpen(true);
  }
  function closeEnhancement() {
    setHandOpen(false);
    busyRef.current = false;
    void refresh();
  }
  return (
    <section className="rps-page">
      <header className="rps-heading">
        <div>
          <span className="eyebrow">A LITTLE LUCK. A BIG VICTORY.</span>
          <h1>
            <Hand size={30} />
            가위바위보
          </h1>
          <p>한 번의 승부, 최대 10배의 승리 보상.</p>
        </div>
        <div className="rps-wallet">
          <Coins size={23} />
          <span>
            사용 가능한 포인트
            <strong>
              {number(wallet)}
              <small> P</small>
            </strong>
          </span>
        </div>
      </header>
      {preview && <p className="form-error">실제 등급으로 돌아오면 게임에 참여할 수 있습니다.</p>}
      <div className="rps-layout">
        <section className="rps-arena" aria-label="가위바위보 게임판" aria-busy={busy}>
          <div className="rps-arena-heading">
            <span className="eyebrow">ROCK · PAPER · SCISSORS</span>
            <span className="rps-max">
              <Sparkles size={14} /> MAX ×10
            </span>
          </div>
          <div className={'rps-stage' + (busy ? ' is-playing' : '')}>
            <div className="rps-contender">
              <span>나</span>
              <div className="rps-hand">
                <Gesture choice={busy ? selectedChoice : round?.choice || choice} />
              </div>
              <strong>{labels[busy ? selectedChoice : round?.choice || choice]}</strong>
            </div>
            <div className="rps-versus">VS</div>
            <div className="rps-contender is-opponent">
              <span>상대</span>
              <div className="rps-hand">
                <Gesture choice={opponentCycling ? opponentPreview : round.opponent} />
              </div>
              <strong>{opponentCycling ? '선택 중' : labels[round.opponent]}</strong>
            </div>
          </div>
          <div
            className={'rps-result-line' + (round && !busy ? ' outcome-' + round.outcome : '')}
            role="status"
            aria-live="polite"
          >
            {busy ? (
              <strong>가위, 바위, 보!</strong>
            ) : round ? (
              <>
                <strong>
                  {outcomeLabels[round.outcome]}
                  {round.outcome === 'win' ? ` · ${round.multiplier}배` : ''}
                </strong>
                <span>
                  {round.outcome === 'draw'
                    ? '배팅액 반환 · 도전 횟수 유지'
                    : round.outcome === 'lose'
                      ? `배팅액 ${number(round.stake)}P 차감`
                      : `${number(round.payout)}P 지급 · ${round.profit ? '+' + number(round.profit) + 'P' : '본전'}`}
                </span>
                {round.outcome === 'win' && (
                  <button type="button" onClick={() => setReward(round)}>
                    보상 보기
                  </button>
                )}
              </>
            ) : (
              <span>가위·바위·보를 선택하고 도전하세요.</span>
            )}
          </div>
          {round && !busy && (
            <GameResultShare key={user.id} game="rps" resultId={round.requestId} />
          )}
          <fieldset className="rps-choice-field" disabled={busy || Boolean(pending) || preview}>
            <legend>나의 선택</legend>
            <div className="rps-choices">
              {rpsChoices.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  aria-pressed={selectedChoice === item.id}
                  onClick={() => setChoice(item.id)}
                >
                  <Gesture choice={item.id} size={32} />
                  <span>{item.label}</span>
                </button>
              ))}
            </div>
          </fieldset>
          <fieldset className="rps-stake-field" disabled={busy || Boolean(pending) || preview}>
            <legend>배팅액</legend>
            <div className="rps-stakes">
              {rpsStakes.map((value) => (
                <button
                  key={value}
                  type="button"
                  disabled={wallet < value}
                  aria-pressed={(pending?.stake || stake) === value}
                  onClick={() => setStake(value)}
                >
                  {number(value)}
                  <small> P</small>
                </button>
              ))}
            </div>
          </fieldset>
          {error && (
            <p className="form-error" role="alert">
              {error}
            </p>
          )}
          {pending && !busy && (
            <p className="rps-hint">
              이전 요청의 결과를 먼저 확인해주세요. 같은 요청을 다시 확인해도 중복 차감되지
              않습니다.
            </p>
          )}
          {!pending && data && !attempts?.total && (
            <p className="rps-hint">
              오늘의 도전을 모두 사용했어요. 게시글을 작성하면 1회 추가됩니다.
            </p>
          )}
          {!pending && data && wallet < stake && (
            <p className="rps-hint">선택한 배팅액보다 보유 포인트가 적습니다.</p>
          )}
          <Button type="button" className="rps-play-button" disabled={disabled} onClick={play}>
            {busy ? (
              '승부를 확인하는 중…'
            ) : pending ? (
              <>
                <RotateCcw size={18} />
                이전 요청 다시 확인
              </>
            ) : (
              <>
                {number(stake)} P로 도전
                <ArrowRight size={18} />
              </>
            )}
          </Button>
          {!data && (
            <Button type="button" onClick={refresh}>
              게임 정보 다시 불러오기
            </Button>
          )}
          {data?.history.length > 0 && (
            <div className="rps-history">
              <h2>최근 내 승부</h2>
              <ol>
                {data.history.map((item) => (
                  <li key={item.requestId} className={'outcome-' + item.outcome}>
                    <span>{outcomeLabels[item.outcome]}</span>
                    <small>
                      {labels[item.choice]} · 상대 {labels[item.opponent]}
                    </small>
                    <strong>
                      {item.profit > 0 ? '+' : ''}
                      {number(item.profit)} P
                    </strong>
                  </li>
                ))}
              </ol>
            </div>
          )}
        </section>
        <aside className="rps-sidebar">
          <section className="rps-enhancement-card panel">
            <div className="rps-enhancement-card-art">
              <EnchantedHand level={handLevel} compact />
              <span>+{handLevel}</span>
            </div>
            <div>
              <span className="eyebrow">MY ENCHANTED HAND</span>
              <h2>{hand.name}</h2>
              <p>
                {rpsHandStages[handLevel + 1]
                  ? `강화 성공 확률 ${rpsHandStages[handLevel + 1].successPercent}%`
                  : '최고 강화 달성'}
              </p>
            </div>
            <Button
              type="button"
              onClick={openEnhancement}
              disabled={!data || busy || Boolean(pending) || preview}
            >
              <Sparkles size={17} />손 강화
              <ArrowRight size={16} />
            </Button>
          </section>
          <section className="rps-attempts panel">
            <h2>
              <Ticket size={19} />
              남은 도전
            </h2>
            <strong className="rps-attempts-total">
              {attempts?.total ?? '—'}
              <small> 회</small>
            </strong>
            <div className="rps-attempts-breakdown">
              <span>
                오늘의 기본 도전
                <strong>
                  {attempts?.daily ?? '—'} / {rpsDailyAttempts}회
                </strong>
              </span>
              <span>
                보관한 추가 도전<strong>{number(attempts?.bonus)}회</strong>
              </span>
            </div>
            <p>기본 횟수를 먼저 사용합니다.</p>
            <Link className="rps-write-link" href="/boards/talk/write">
              게시글 쓰고 도전 1회 추가
              <ArrowRight size={16} />
            </Link>
          </section>
          <section className="rps-rules panel">
            <h2>플레이 방법</h2>
            <ol>
              <li>배팅액과 가위·바위·보를 선택합니다.</li>
              <li>
                승리하면 1~10배의 보상을 받습니다. 1배는 본전이며, 지급액에는 배팅 원금이
                포함됩니다.
              </li>
              <li>패배하면 배팅액을 잃고, 무승부는 배팅액과 도전 횟수를 그대로 돌려받습니다.</li>
            </ol>
            <h3>도전 횟수는 이렇게 채워요</h3>
            <p>매일 한국 시간 00시에 기본 5회로 리필됩니다. 남은 기본 횟수는 쌓이지 않습니다.</p>
            <p>
              게시판에 글을 새로 등록할 때마다 추가 도전 1회를 받습니다. 임시저장·수정·댓글은
              제외되며, 추가 횟수는 다음 날에도 보관됩니다.
            </p>
          </section>
        </aside>
      </div>
      <section className="rps-probabilities panel" aria-label="승리 배율 확률">
        <header>
          <h2>
            <Sparkles size={18} />
            승리 배율 확률
          </h2>
          <small>전체 확률 공개 · 합계 100%</small>
        </header>
        <p className="rps-outcome-probabilities" aria-label="승패 확률">
          현재 +{handLevel} 손 적용:{' '}
          {Object.entries(rpsOutcomeWeights(handLevel))
            .map(
              ([outcome, weight]) =>
                `${outcomeLabels[outcome]} ${(weight * 100) % rpsOutcomeTickets ? '약 ' : ''}${((weight / rpsOutcomeTickets) * 100).toLocaleString('ko-KR', { maximumFractionDigits: 2 })}%`,
            )
            .join(' · ')}
          . 가위·바위·보 중 무엇을 선택해도 승률은 같습니다.
        </p>
        <p>아래 배율은 승리한 경우에 별도로 추첨하며, 지급액에는 배팅 원금이 포함됩니다.</p>
        <div>
          {rpsRewards.map((item) => (
            <div key={item.multiplier}>
              <strong>
                {item.multiplier}
                <small>배</small>
              </strong>
              <span>{item.percent}%</span>
              <i style={{ '--chance': item.percent / 30 }} />
            </div>
          ))}
        </div>
      </section>
      {reward && (
        <RewardReveal key={reward.requestId} round={reward} onClose={() => setReward(null)} />
      )}
      {handOpen && <RpsHandEnhancement onClose={closeEnhancement} onUpdate={applyEnhancement} />}
    </section>
  );
}
