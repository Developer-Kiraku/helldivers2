import assert from 'node:assert/strict';
import { recordStratagemClear, stratagemRanking } from '../src/lib/server/stratagem-rankings.mjs';
const db = {
  users: ['a', 'b', 'owner', 'test', 'left'].map((id) => ({
    id,
    nickname: id,
    status: id === 'left' ? 'withdrawn' : 'active',
    isTestPlayer: id === 'test',
  })),
  ownerSetup: { ownerId: 'owner' },
};
const clear = (id, stage, elapsed, finishedAt = 100000) =>
  recordStratagemClear(
    db,
    {
      id: `run-${id}`,
      userId: id,
      stage,
      timingVersion: 1,
      elapsedMs: elapsed - 1000,
      readyAt: finishedAt - 1000,
    },
    finishedAt,
  );
clear('a', 10, 50000);
clear('b', 10, 40000);
clear('owner', 15, 30000);
clear('test', 15, 20000);
clear('left', 15, 10000);
let ranks = stratagemRanking(db, db.users[0]);
assert.deepEqual(
  ranks.rankings.map((row) => row.nickname),
  ['b', 'a'],
);
assert.equal(ranks.mine.rank, 2);
assert.deepEqual(
  ranks.unranked.map((row) => row.nickname),
  ['owner'],
);
clear('a', 11, 60000);
assert.equal(
  stratagemRanking(db, db.users[0]).mine.rank,
  1,
  'A higher stage beats a faster lower stage',
);
clear('a', 10, 10000);
assert.equal(
  stratagemRanking(db, db.users[0]).mine.stage,
  11,
  'An inferior new run must not replace the personal best',
);
clear('b', 11, 60000, 90000);
assert.equal(
  stratagemRanking(db, db.users[1]).mine.rank,
  1,
  'Equal stage/time uses the earlier completion',
);
recordStratagemClear(db, { id: 'old', userId: 'b', stage: 15, readyAt: 0 }, 10000);
assert.equal(
  stratagemRanking(db, db.users[1]).mine.stage,
  11,
  'Unmeasured historical runs are not ranked',
);
console.log(
  'PASS: stage/time ranking, best retention, deterministic ties, owner/test exclusion and legacy timing',
);
