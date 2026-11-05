import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { solvedPuzzle, movePuzzle } from '../src/lib/sliding-puzzle.mjs';
const directory = await fs.mkdtemp(path.resolve('work/ranking-policy-'));
const originalNow = Date.now;
try {
  const outfile = path.join(directory, 'policy.cjs');
  await build({
    stdin: {
      contents:
        'export {dashboardRanking} from "./src/lib/server/rankings.js"; export {handlePuzzle} from "./src/lib/server/sliding-puzzle.js"; export {settlePuzzleRewards,puzzleRewardDueAt} from "./src/lib/server/puzzle-rewards.mjs";',
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'auth',
        setup(builder) {
          builder.onResolve({ filter: /\/auth$/ }, () => ({ path: 'auth', namespace: 'stub' }));
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents:
              'export function fail(status,message){throw Object.assign(new Error(message),{status});}',
          }));
        },
      },
    ],
  });
  const { dashboardRanking, handlePuzzle, settlePuzzleRewards, puzzleRewardDueAt } = createRequire(
    import.meta.url,
  )(outfile);
  let now = Date.parse('2026-11-20T00:00:00Z');
  Date.now = () => now;
  const db = {
    ownerSetup: { ownerId: 'owner' },
    users: ['owner', 'member', 'deputy', 'other-operator', 'test'].map((id, i) => ({
      id,
      nickname: id,
      role: id.includes('operator') || id === 'owner' ? 'operator' : 'member',
      status: 'active',
      isTestPlayer: id === 'test',
      points: { current: 10000 - i * 100, total: 20000 },
    })),
    puzzleRecords: [],
    puzzleRuns: [],
  };
  db.puzzleRecords = db.users.map((u, i) => ({
    id: 'record-' + u.id,
    userId: u.id,
    month: '2026-11',
    elapsedMs: 1000 + i * 1000,
    moves: 50,
    finishedAt: new Date(now).toISOString(),
  }));
  const owner = db.users[0],
    viewer = db.users[1];
  const rank = (kind) => dashboardRanking(db, viewer, kind, new URLSearchParams());
  for (const kind of ['points', 'puzzle']) {
    const data = rank(kind);
    assert.equal(data.total, 3);
    assert.deepEqual(
      data.rankings.map((row) => row.rank),
      [1, 2, 3],
    );
    assert.deepEqual(
      data.rankings.map((row) => row.nickname),
      ['member', 'deputy', 'other-operator'],
    );
    assert.equal(data.unranked.length, 1);
    assert.equal(data.unranked[0].nickname, 'owner');
    assert.equal(data.unranked[0].rank, null);
  }
  owner.nickname = '라미아 변경';
  assert.equal(rank('points').unranked[0].nickname, '라미아 변경');
  const call = (action = '', input = {}) =>
    handlePuzzle(
      db,
      owner,
      ['games', 'sliding-puzzle', ...(action ? [action] : [])],
      action ? 'POST' : 'GET',
      input,
      new URLSearchParams(),
    );
  assert.equal(call().mine.excluded, true);
  assert.equal(call().mine.rank, null);
  const finish = (elapsed) => {
    now += 3000;
    const run = call('start').run;
    db.puzzleRuns.find((row) => row.id === run.id).board = movePuzzle(
      movePuzzle(solvedPuzzle(), 15),
      14,
    );
    call('move', { runId: run.id, tile: 14, step: 0 });
    now += elapsed;
    call('move', { runId: run.id, tile: 15, step: 1 });
    return call('finish', { runId: run.id });
  };
  assert.equal(
    finish(2000).improved,
    false,
    'An excluded personal best must not be overwritten by a slower run',
  );
  const best = finish(500);
  assert.equal(best.improved, true);
  assert.equal(best.rank, null);
  assert.equal(best.excluded, true);
  assert.equal(call().mine.elapsedMs, 500);
  const legacyRun = db.puzzleRuns.at(-1);
  legacyRun.result = { ...legacyRun.result, rank: 1, excluded: false };
  assert.equal(call('finish', { runId: legacyRun.id }).rank, null);
  const restored = handlePuzzle(
    db,
    owner,
    ['games', 'sliding-puzzle', 'state'],
    'GET',
    {},
    new URLSearchParams({ runId: legacyRun.id }),
  );
  assert.equal(restored.run.result.excluded, true);
  assert.equal(restored.run.result.rank, null);
  assert.equal(
    db.notifications?.length || 0,
    0,
    'Excluded scores never enter or displace the podium',
  );
  settlePuzzleRewards(db, puzzleRewardDueAt('2026-11'));
  assert.deepEqual(
    db.puzzleRewards[0].recipients.map((row) => row.userId),
    ['member', 'deputy', 'other-operator'],
  );
  assert.equal(owner.points.current, 10000);
  assert.equal(db.users[1].points.current, 19900);
  assert.equal(db.notifications.filter((row) => row.recipientId === 'owner').length, 0);
  assert.equal(db.puzzleRecords.filter((row) => row.userId === 'owner').length, 1);
  console.log(
    'PASS: owner/test account exclusion, separate public records, contiguous ranks, personal best preservation, no podium alerts or monthly awards, other operators unaffected',
  );
} finally {
  Date.now = originalNow;
  await fs.rm(directory, { recursive: true, force: true });
}
