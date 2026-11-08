import { isRankingExcluded, separateRankingUsers } from './ranking-policy.mjs';

export const compareStratagemRecords = (a, b) =>
  b.stage - a.stage ||
  a.elapsedMs - b.elapsedMs ||
  a.finishedAt - b.finishedAt ||
  a.id.localeCompare(b.id);

export function recordStratagemClear(db, run, now) {
  // Earlier runs did not measure active time. Never infer a competitive time from wall time.
  if (run.timingVersion !== 1) return;
  run.clearedStage = run.stage;
  run.elapsedMs += now - run.readyAt;
  const record = {
    id: run.userId,
    userId: run.userId,
    runId: run.id,
    stage: run.stage,
    elapsedMs: run.elapsedMs,
    finishedAt: now,
  };
  db.stratagemRecords ||= [];
  const index = db.stratagemRecords.findIndex((row) => row.userId === run.userId);
  if (index < 0) db.stratagemRecords.push(record);
  else if (compareStratagemRecords(record, db.stratagemRecords[index]) < 0)
    db.stratagemRecords[index] = record;
}

export function stratagemRanking(db, actor) {
  const records = (db.stratagemRecords || []).filter((row) =>
    db.users.some((user) => user.id === row.userId && user.status === 'active'),
  );
  const ranked = records
    .filter((row) => !isRankingExcluded(db, row.userId))
    .sort(compareStratagemRecords);
  const serialize = (row, index) => ({
    id: row.id,
    rank: index < 0 ? null : index + 1,
    stage: row.stage,
    elapsedMs: row.elapsedMs,
    finishedAt: row.finishedAt,
    nickname: db.users.find((user) => user.id === row.userId).nickname,
    own: row.userId === actor.id,
  });
  const separateIds = new Set(separateRankingUsers(db).map((user) => user.id));
  const unranked = records
    .filter((row) => separateIds.has(row.userId))
    .map((row) => serialize(row, -1));
  const mineIndex = ranked.findIndex((row) => row.userId === actor.id);
  return {
    rankings: ranked.slice(0, 50).map(serialize),
    total: ranked.length,
    unranked,
    mine:
      mineIndex >= 0
        ? serialize(ranked[mineIndex], mineIndex)
        : unranked.find((row) => row.own) || null,
  };
}
