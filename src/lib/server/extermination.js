import { createHash, randomInt, randomUUID } from 'node:crypto';
import { fail } from './auth';
import { createTrainingRun, advanceTraining, applyTrainingEvent } from '../extermination.mjs';
import { rpsHandLevel } from '../rps-enhancement.mjs';
import { puzzleMonth } from '../sliding-puzzle.mjs';
import { transferGamePoints } from './points.mjs';
import { isRankingExcluded } from './ranking-policy.mjs';

const compare = (a, b) =>
  b.points - a.points ||
  b.stage - a.stage ||
  b.accuracy - a.accuracy ||
  a.elapsedMs - b.elapsedMs ||
  a.finishedAt.localeCompare(b.finishedAt) ||
  a.id.localeCompare(b.id);
export function trainingRanking(db, month) {
  const seen = new Set();
  return (db.trainingRecords || [])
    .filter((row) => row.month === month && !isRankingExcluded(db, row.userId))
    .sort(compare)
    .filter((row) => {
      if (seen.has(row.userId)) return false;
      seen.add(row.userId);
      return true;
    });
}
function ranked(db, actor, record) {
  const rows = trainingRanking(db, record.month);
  const index = rows.findIndex((row) => row.userId === actor.id);
  return { record, rank: index < 0 ? null : index + 1, excluded: isRankingExcluded(db, actor.id) };
}
function settle(db, actor, run, now) {
  if (run.status !== 'finished') return;
  db.trainingRecords ||= [];
  let record = db.trainingRecords.find((row) => row.id === run.id);
  if (!record) {
    record = {
      id: run.id,
      userId: actor.id,
      month: puzzleMonth(now),
      finishedAt: new Date(now).toISOString(),
      points: run.income.reduce((sum, amount) => sum + amount, 0),
      stage: run.stage,
      clearedStages: run.clearedStages,
      kills: run.totalKills,
      shots: run.shots,
      hits: run.hits,
      accuracy: run.shots ? Math.round((run.hits / run.shots) * 100) : 0,
      elapsedMs: Math.round(run.clock),
      handLevel: run.handLevel,
      counts: run.counts,
      income: run.income,
      reason: run.reason,
    };
    db.trainingRecords.push(record);
    transferGamePoints(db, actor.id, 'extermination:' + run.id, record.points, run.id);
  }
  run.result = ranked(db, actor, record);
}
const response = (db, actor, run) => ({
  run,
  points: actor.points,
  currentMonth: puzzleMonth(),
  serverTime: Date.now(),
});
export function handleTraining(db, actor, segments, method, input) {
  const now = Date.now();
  if (method !== 'GET' && actor.actualRole) fail(403, '실제 등급으로 돌아온 뒤 이용해주세요.');
  db.trainingRuns ||= [];
  if (segments.length === 2 && method === 'GET') {
    const month = puzzleMonth(now);
    const rows = trainingRanking(db, month);
    const serialize = (row, index) => ({
      ...row,
      rank: index + 1,
      own: row.userId === actor.id,
      nickname:
        db.users.find((user) => user.id === row.userId && user.status === 'active')?.nickname ||
        '탈퇴한 회원',
    });
    const own = rows.findIndex((row) => row.userId === actor.id);
    const active = db.trainingRuns.find(
      (row) => row.userId === actor.id && row.status !== 'finished',
    );
    return {
      month,
      total: rows.length,
      rankings: rows.slice(0, 50).map(serialize),
      mine: own < 0 ? null : serialize(rows[own], own),
      handLevel: rpsHandLevel(actor.rpsHand?.level),
      active: active || null,
      serverTime: now,
    };
  }
  if (segments[2] === 'start' && method === 'POST' && segments.length === 3) {
    if (typeof input.requestId !== 'string' || !/^[a-f0-9-]{36}$/.test(input.requestId))
      fail(400, '시작 요청을 확인해주세요.');
    const repeated = db.trainingRuns.find(
      (row) => row.userId === actor.id && row.requestId === input.requestId,
    );
    if (repeated) return response(db, actor, repeated);
    for (const old of db.trainingRuns.filter(
      (row) => row.userId === actor.id && row.status !== 'finished',
    )) {
      advanceTraining(old, Math.min(now - Date.parse(old.issuedAt), old.lastTime + 60000));
      if (old.status !== 'finished') applyTrainingEvent(old, { type: 'stop', t: old.lastTime });
      settle(db, actor, old, now);
    }
    db.trainingRuns = db.trainingRuns.filter(
      (row) => now - Date.parse(row.issuedAt) < 7 * 86400000,
    );
    const run = createTrainingRun({
      id: randomUUID(),
      userId: actor.id,
      seed: randomInt(1, 0x100000000),
      handLevel: rpsHandLevel(actor.rpsHand?.level),
      now,
    });
    run.requestId = input.requestId;
    db.trainingRuns.push(run);
    return response(db, actor, run);
  }
  if (segments[2] === 'sync' && method === 'POST' && segments.length === 3) {
    const stored = db.trainingRuns.find((row) => row.id === input.runId && row.userId === actor.id);
    if (!stored) fail(404, '게임을 찾을 수 없습니다. 새로 시작해주세요.');
    const hash = createHash('sha256').update(JSON.stringify(input)).digest('hex');
    if (stored.lastPacket === hash) return response(db, actor, stored);
    if (!Number.isInteger(input.step) || input.step !== stored.sequence)
      fail(409, '게임 동기화 순서를 다시 확인해주세요.');
    if (!Array.isArray(input.events) || input.events.length > 128)
      fail(400, '입력 내역을 확인해주세요.');
    if (
      !Number.isFinite(input.at) ||
      input.at < stored.lastTime ||
      input.at > now - Date.parse(stored.issuedAt) + 1500
    )
      fail(400, '게임 시간을 확인해주세요.');
    const run = structuredClone(stored);
    for (const event of input.events) {
      if (
        !event ||
        !['shot', 'pause', 'resume', 'next', 'stop'].includes(event.type) ||
        !Number.isFinite(event.t) ||
        event.t < run.lastTime ||
        event.t > input.at
      )
        fail(400, '입력 시간을 확인해주세요.');
      if (
        event.type === 'shot' &&
        (!Number.isFinite(event.x) ||
          !Number.isFinite(event.y) ||
          event.x < 0 ||
          event.x > 1000 ||
          event.y < 0 ||
          event.y > 650)
      )
        fail(400, '사격 위치를 확인해주세요.');
      applyTrainingEvent(run, event);
    }
    advanceTraining(run, input.at);
    if (now - Date.parse(run.issuedAt) > 3600000 && run.status !== 'finished')
      applyTrainingEvent(run, { type: 'stop', t: run.lastTime });
    settle(db, actor, run, now);
    run.sequence++;
    run.lastPacket = hash;
    Object.assign(stored, run);
    return response(db, actor, stored);
  }
  fail(404, '게임 요청을 찾을 수 없습니다.');
}
