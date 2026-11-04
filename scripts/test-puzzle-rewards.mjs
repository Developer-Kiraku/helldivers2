import assert from 'node:assert/strict';
import { settlePuzzleRewards, puzzleRewardDueAt } from '../src/lib/server/puzzle-rewards.mjs';

const due = Date.parse('2026-11-30T16:00:00Z');
assert.equal(puzzleRewardDueAt('2026-11'), due);
assert.equal(puzzleRewardDueAt('2026-12'), Date.parse('2026-12-31T16:00:00Z'));
const record = (id, userId, month, elapsedMs, moves, finishedAt = month + '-20T00:00:00Z') => ({
  id,
  userId,
  month,
  elapsedMs,
  moves,
  finishedAt,
});
const db = {
  users: Array.from({ length: 5 }, (_, i) => ({
    id: 'u' + i,
    nickname: '대원' + i,
    status: 'active',
    points: { current: 100, total: 300 },
  })),
  puzzleRecords: [
    record('a', 'u0', '2026-11', 1000, 10),
    record('b', 'u1', '2026-11', 1000, 9),
    record('c', 'u2', '2026-11', 2000, 1),
    record('d', 'u3', '2026-11', 3000, 1),
    record('duplicate', 'u1', '2026-11', 4000, 1),
    record('old', 'u4', '2026-10', 100, 1),
    record('future', 'u4', '2026-12', 100, 1),
  ],
};
const original = structuredClone(db);
assert.equal(
  settlePuzzleRewards(db, due - 1),
  false,
  'No award during the registration grace period',
);
assert.deepEqual(db, original);
assert.equal(settlePuzzleRewards(db, due), true);
assert.deepEqual(
  db.users.map((u) => u.points.current),
  [5100, 10100, 2600, 100, 100],
);
assert.deepEqual(
  db.users.map((u) => u.points.total),
  [5300, 10300, 2800, 300, 300],
);
assert.equal(db.puzzleRewards.length, 1);
assert.deepEqual(
  db.puzzleRewards[0].recipients.map((r) => r.userId),
  ['u1', 'u0', 'u2'],
);
assert.equal(db.notifications.length, 3);
assert.deepEqual(
  db.notifications.map((n) => n.amount),
  [10000, 5000, 2500],
);
assert.ok(db.notifications.every((n) => n.kind === 'puzzle_monthly_reward' && !n.readAt));
assert.equal(db.audit.length, 3);
assert.ok(
  db.audit.every((a) => a.action === 'points.grant' && a.details.actorNickname === '시스템'),
);
const settled = JSON.parse(JSON.stringify(db));
assert.equal(settlePuzzleRewards(db, due + 1000), false);
assert.deepEqual(
  db,
  settled,
  'Repeated sweeps cannot pay again or recreate read/deleted notifications',
);
assert.equal(settlePuzzleRewards(settled, due + 1000), false, 'Receipts survive restart');
db.users[4].status = 'withdrawn';
assert.equal(settlePuzzleRewards(db, puzzleRewardDueAt('2026-12')), true);
assert.equal(db.puzzleRewards[1].recipients[0].status, 'withdrawn');
assert.equal(db.pointLedger.length, 3, 'Withdrawn winners are not paid and ranks are not promoted');
assert.equal(settlePuzzleRewards(db, puzzleRewardDueAt('2026-12') + 1000), false);

const missed = {
  users: [{ id: 'u', nickname: '수상자', status: 'active' }],
  puzzleRecords: [
    record('nov', 'u', '2026-11', 1, 1),
    record('dec', 'u', '2026-12', 1, 1),
    record('jan', 'u', '2027-01', 1, 1),
  ],
};
assert.equal(settlePuzzleRewards(missed, puzzleRewardDueAt('2027-01')), true);
assert.equal(missed.users[0].points.current, 30000, 'Missed months catch up after downtime');
assert.equal(missed.puzzleRewards.length, 3);
assert.equal(missed.pointLedger.length, 3);
assert.equal(settlePuzzleRewards(missed, puzzleRewardDueAt('2027-02')), false);
const ties = {
  users: original.users,
  puzzleRecords: [
    record('z', 'u0', '2026-11', 10, 1, '2026-11-21T00:00:00Z'),
    record('a', 'u1', '2026-11', 10, 1, '2026-11-20T00:00:00Z'),
  ],
};
settlePuzzleRewards(ties, due);
assert.deepEqual(
  ties.puzzleRewards[0].recipients.map((r) => r.userId),
  ['u1', 'u0'],
);
console.log(
  'PASS: KST month end and grace boundary, prizes, tie order, both balances, deduplication, restart, missed months, inactive winners and notifications/audit',
);
