import { randomInt, randomUUID } from 'node:crypto';
import { fail } from './auth';
import { transferGamePoints } from './points.mjs';
import { challengeEntry, challengeStages } from '../stratagem-challenge.mjs';
import { stratagemCommands } from '../stratagem-codes.mjs';

const active = (run) => ['playing', 'checkpoint'].includes(run.status);
const validId = (value) =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
function nextCommand(run, now, rng) {
  const stage = challengeStages[run.stage - 1];
  const candidates = stratagemCommands.filter(
    (item) =>
      item.code.length >= stage.minLength &&
      item.code.length <= stage.maxLength &&
      item.id !== run.command?.id,
  );
  run.command = { ...candidates[rng(candidates.length)], token: randomUUID() };
  run.commandAt = now;
}
function beginStage(run, now, rng) {
  run.stage++;
  run.completed = 0;
  run.readyAt = now;
  run.deadlineAt = run.readyAt + challengeStages[run.stage - 1].seconds * 1000;
  run.status = 'playing';
  nextCommand(run, run.readyAt, rng);
}
function finish(db, run, status, now) {
  if (!active(run)) return;
  run.status = status;
  run.finishedAt = now;
  run.payout = ['failed', 'abandoned'].includes(status) ? 0 : challengeStages[run.stage - 1].payout;
  if (run.payout)
    transferGamePoints(db, run.userId, `stratagem:${run.id}:payout`, run.payout, run.id);
}
const closePrevious = (db, run, now) =>
  finish(db, run, run.status === 'checkpoint' ? 'cashed' : 'abandoned', now);
function publicRun(run) {
  if (!run) return null;
  const {
    id,
    status,
    stage,
    completed,
    readyAt,
    deadlineAt,
    payout,
    finishedAt,
    createdAt,
    requestId,
  } = run;
  return {
    id,
    status,
    stage,
    completed,
    readyAt,
    deadlineAt,
    payout: payout || 0,
    finishedAt,
    createdAt,
    requestId,
    command: status === 'playing' ? run.command : null,
  };
}
export function handleStratagemChallenge(db, actor, segments, method, input = {}, options = {}) {
  const now = options.now ?? Date.now();
  const rng = options.randomInt || randomInt;
  db.stratagemRuns ||= [];
  const own = db.stratagemRuns.filter((run) => run.userId === actor.id);
  for (const run of own)
    if (run.status === 'playing' && now >= run.deadlineAt) finish(db, run, 'failed', now);
  const snapshot = (run) => ({
    serverTime: now,
    points: { ...(actor.points || { current: 0, total: 0 }) },
    run: publicRun(run === undefined ? own.findLast(active) || own.at(-1) : run),
  });
  if (segments.length === 2 && method === 'GET') return snapshot();
  if (segments.length !== 3 || method !== 'POST') fail(404, '게임 요청을 찾을 수 없습니다.');
  if (actor.actualRole) fail(403, '실제 등급으로 돌아온 뒤 게임에 참여해주세요.');
  const action = segments[2];
  if (action === 'start') {
    if (!validId(input.requestId)) fail(400, '도전 요청을 확인해주세요.');
    const previous = own.find((run) => run.requestId === input.requestId);
    if (previous) return snapshot(previous);
    if (input.replacePrevious === true)
      for (const run of own.filter(active)) closePrevious(db, run, now);
    if (own.some(active)) fail(409, '진행 중인 도전을 먼저 완료해주세요.');
    if ((actor.points?.current || 0) < challengeEntry) fail(400, '도전하려면 100P가 필요합니다.');
    const run = {
      id: randomUUID(),
      userId: actor.id,
      requestId: input.requestId,
      stage: 0,
      status: 'playing',
      receipts: [],
      createdAt: now,
    };
    transferGamePoints(db, actor.id, `stratagem:${run.id}:entry`, -challengeEntry, run.id);
    beginStage(run, now, rng);
    db.stratagemRuns.push(run);
    return snapshot(run);
  }
  const run = own.find((run) => run.id === input.runId);
  if (!run) fail(404, '도전을 찾을 수 없습니다.');
  if (action === 'reset') {
    // Target the observed run, so a delayed reset cannot cancel a newer challenge.
    closePrevious(db, run, now);
    return snapshot(null);
  } else if (action === 'answer') {
    if (
      !validId(input.token) ||
      typeof input.answer !== 'string' ||
      !/^[UDLR]{3,8}$/.test(input.answer)
    )
      fail(400, '입력한 명령을 확인해주세요.');
    const receipt = run.receipts.find((item) => item.token === input.token);
    if (receipt) {
      if (receipt.answer !== input.answer) fail(409, '이미 처리된 명령입니다.');
      return snapshot(run);
    }
    if (run.status !== 'playing') return snapshot(run);
    if (run.command.token !== input.token) fail(409, '현재 표시된 명령을 입력해주세요.');
    if (now < run.commandAt + run.command.code.length * 35)
      fail(409, '명령을 차례대로 입력해주세요.');
    if (input.answer !== run.command.code)
      fail(400, '명령이 다릅니다. 처음부터 다시 입력해주세요.');
    run.receipts.push({ token: input.token, answer: input.answer });
    run.completed++;
    if (run.completed === challengeStages[run.stage - 1].commands) {
      run.status = 'checkpoint';
      if (run.stage === challengeStages.length) finish(db, run, 'completed', now);
    } else nextCommand(run, now, rng);
  } else if (action === 'continue') {
    if (!Number.isInteger(input.stage) || input.stage < 1 || input.stage >= challengeStages.length)
      fail(400, '단계를 확인해주세요.');
    if (run.stage > input.stage) return snapshot(run);
    if (run.status !== 'checkpoint' || run.stage !== input.stage)
      fail(409, '단계 완료 후 계속 도전할 수 있습니다.');
    beginStage(run, now, rng);
  } else if (action === 'cashout') {
    if (['cashed', 'completed'].includes(run.status)) return snapshot(run);
    if (run.status !== 'checkpoint') fail(409, '단계를 완료한 뒤 보상을 받을 수 있습니다.');
    finish(db, run, 'cashed', now);
  } else fail(404, '게임 요청을 찾을 수 없습니다.');
  return snapshot(run);
}
