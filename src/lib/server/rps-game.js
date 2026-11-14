import { randomInt } from 'node:crypto';
import { fail } from './auth';
import { transferGamePoints } from './points.mjs';
import { rpsAttempts, consumeRpsAttempt } from './rps-attempts.mjs';
import {
  rpsChoices,
  rpsStakes,
  rpsOutcome,
  rpsMultiplier,
  rpsOpponent,
  rpsOutcomeTickets,
} from '../rps-rules.mjs';

const cooldownMs = 1800;
const validRequestId = (value) =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const publicRound = (round) =>
  round &&
  Object.fromEntries(
    [
      'requestId',
      'stake',
      'choice',
      'opponent',
      'outcome',
      'multiplier',
      'payout',
      'profit',
      'attemptSource',
      'createdAt',
    ].map((key) => [key, round[key]]),
  );
function state(db, actor, now, round) {
  const history = (db.rpsRounds || [])
    .filter((item) => item.userId === actor.id)
    .slice(-5)
    .reverse();
  return {
    points: { ...(actor.points || { current: 0, total: 0 }) },
    attempts: rpsAttempts(actor, now),
    serverTime: now,
    nextPlayableAt: history.length ? history[0].createdAt + cooldownMs : 0,
    round: publicRound(round === undefined ? history[0] || null : round),
    history: history.map(publicRound),
  };
}
export function handleRpsGame(
  db,
  actor,
  segments,
  method,
  input,
  query = new URLSearchParams(),
  options = {},
) {
  const now = options.now ?? Date.now();
  const rng = options.randomInt || randomInt;
  if (segments.length === 2 && method === 'GET') {
    const id = query.get('requestId');
    if (id !== null && !validRequestId(id)) fail(400, '게임 요청을 확인해주세요.');
    return state(
      db,
      actor,
      now,
      id === null
        ? undefined
        : (db.rpsRounds || []).find((item) => item.userId === actor.id && item.requestId === id) ||
            null,
    );
  }
  if (segments.length !== 3 || segments[2] !== 'play' || method !== 'POST')
    fail(404, '게임 요청을 찾을 수 없습니다.');
  if (actor.actualRole) fail(403, '실제 등급으로 돌아온 뒤 게임에 참여해주세요.');
  if (
    !validRequestId(input.requestId) ||
    !rpsStakes.includes(input.stake) ||
    !rpsChoices.some((choice) => choice.id === input.choice)
  )
    fail(400, '배팅액과 가위·바위·보 선택을 확인해주세요.');
  const previous = (db.rpsRounds || []).find(
    (item) => item.userId === actor.id && item.requestId === input.requestId,
  );
  if (previous) {
    if (previous.stake !== input.stake || previous.choice !== input.choice)
      fail(409, '이미 처리한 게임 요청입니다. 원래 결과를 확인해주세요.');
    return state(db, actor, now, previous);
  }
  const current = state(db, actor, now);
  if (now < current.nextPlayableAt) fail(429, '진행 중인 게임 결과를 먼저 확인해주세요.');
  if (!current.attempts.total)
    fail(409, '남은 도전 횟수가 없습니다. 게시글을 작성하면 1회 추가됩니다.');
  if (current.points.current < input.stake) fail(400, '배팅할 포인트가 부족합니다.');
  const opponent = rpsOpponent(input.choice, rng(rpsOutcomeTickets));
  const outcome = rpsOutcome(input.choice, opponent);
  const multiplier = outcome === 'win' ? rpsMultiplier(rng(1000)) : 0;
  const payout = outcome === 'draw' ? input.stake : input.stake * multiplier;
  const round = {
    id: actor.id + ':' + input.requestId,
    requestId: input.requestId,
    userId: actor.id,
    stake: input.stake,
    choice: input.choice,
    opponent,
    outcome,
    multiplier,
    payout,
    profit: payout - input.stake,
    attemptSource: outcome === 'draw' ? null : consumeRpsAttempt(actor, now),
    createdAt: now,
  };
  transferGamePoints(db, actor.id, `rps:${round.id}:stake`, -round.stake, round.id);
  if (payout) transferGamePoints(db, actor.id, `rps:${round.id}:payout`, payout, round.id);
  (db.rpsRounds ||= []).push(round);
  return state(db, actor, now, round);
}
