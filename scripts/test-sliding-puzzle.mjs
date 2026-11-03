import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import {
  solvedPuzzle,
  shufflePuzzle,
  movePuzzle,
  slidePuzzle,
  puzzleSolved,
  puzzleMonth,
  comparePuzzleRecords,
} from '../src/lib/sliding-puzzle.mjs';

for (let sample = 0; sample < 150; sample++) {
  const board = shufflePuzzle();
  assert.deepEqual(
    [...board].sort((a, b) => a - b),
    Array.from({ length: 16 }, (_, i) => i),
  );
  let inversions = 0;
  for (let i = 0; i < 16; i++)
    for (let j = i + 1; j < 16; j++) if (board[i] && board[j] && board[i] > board[j]) inversions++;
  assert.equal((inversions + 4 - Math.floor(board.indexOf(0) / 4)) % 2, 1);
  assert.equal(puzzleSolved(board), false);
}
assert.equal(movePuzzle(solvedPuzzle(), 13), null);
assert.deepEqual(slidePuzzle(solvedPuzzle(), 13).moves, [15, 14, 13]);
assert.deepEqual(slidePuzzle(solvedPuzzle(), 13).board.slice(12), [0, 13, 14, 15]);
assert.deepEqual(slidePuzzle(solvedPuzzle(), 4).moves, [12, 8, 4]);
assert.equal(slidePuzzle(solvedPuzzle(), 1), null);
assert.equal(movePuzzle(solvedPuzzle(), 0), null);
assert.equal(puzzleMonth(Date.parse('2026-11-30T14:59:59.999Z')), '2026-11');
assert.equal(puzzleMonth(Date.parse('2026-11-30T15:00:00Z')), '2026-12');
assert.ok(comparePuzzleRecords({ elapsedMs: 100, moves: 9 }, { elapsedMs: 100, moves: 10 }) < 0);
assert.ok(
  comparePuzzleRecords(
    { elapsedMs: 100, moves: 9, finishedAt: '2026-01-01', id: 'b' },
    { elapsedMs: 100, moves: 9, finishedAt: '2026-01-02', id: 'a' },
  ) < 0,
);
await fs.mkdir('work', { recursive: true });
const directory = await fs.mkdtemp(path.resolve('work/puzzle-test-'));
const originalNow = Date.now;
try {
  const outfile = path.join(directory, 'game.cjs');
  await build({
    stdin: {
      contents:
        'export {handlePuzzle} from "./src/lib/server/sliding-puzzle.js"; export {handleNotifications} from "./src/lib/server/activity.js";',
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'auth-errors',
        setup(builder) {
          builder.onResolve({ filter: /\/auth$/ }, () => ({ path: 'auth', namespace: 'test' }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents:
              'export function fail(status,message){throw Object.assign(new Error(message),{status});}',
          }));
        },
      },
    ],
  });
  const { handlePuzzle, handleNotifications } = createRequire(import.meta.url)(outfile);
  let now = Date.parse('2026-11-20T12:00:00Z');
  Date.now = () => now;
  const db = {
    users: Array.from({ length: 4 }, (_, i) => ({
      id: 'u' + i,
      nickname: '대원' + i,
      status: 'active',
    })),
    posts: [],
    comments: [],
    puzzleRuns: [],
    puzzleRecords: [],
  };
  const call = (user, action, body = {}, method = 'POST', query = '') =>
    handlePuzzle(
      db,
      db.users[user],
      ['games', 'sliding-puzzle', ...(action ? [action] : [])],
      method,
      body,
      new URLSearchParams(query),
    );
  const finish = (user, elapsedMs, moves = [15]) => {
    now += 5000;
    const run = call(user, 'start').run;
    db.puzzleRuns.find((r) => r.id === run.id).board = movePuzzle(solvedPuzzle(), 15);
    assert.equal(db.puzzleRuns.find((r) => r.id === run.id).startedAt, null);
    now += 60000; // Looking at the board must not count toward the clear time.
    call(user, 'begin', { runId: run.id, tile: 15 });
    now += elapsedMs;
    return { result: call(user, 'finish', { runId: run.id, moves }), id: run.id };
  };
  for (let user = 0; user < 4; user++)
    finish(user, 4000 - user * 1000, user === 0 ? [15, 15, 15] : [15]);
  assert.equal(finish(0, 4000).result.improved, true);
  assert.equal(call(0, '', {}, 'GET').mine.moves, 1);
  let table = call(0, '', {}, 'GET');
  assert.deepEqual(
    table.rankings.map((r) => r.nickname),
    ['대원3', '대원2', '대원1', '대원0'],
  );
  assert.equal(table.mine.rank, 4);
  assert.ok(
    db.notifications.some(
      (n) => n.recipientId === 'u0' && n.kind === 'puzzle_rank_drop' && n.rank === 4,
    ),
  );
  const notifications = handleNotifications(
    db,
    db.users[0],
    ['notifications'],
    'GET',
    new URLSearchParams(),
  );
  assert.ok(
    notifications.notifications.every((n) => n.href === '/games/sliding-puzzle?month=2026-11'),
  );
  const slower = finish(0, 5000);
  assert.equal(slower.result.improved, false);
  assert.equal(call(0, '', {}, 'GET').mine.elapsedMs, 4000);
  const noticeCount = db.notifications.length;
  assert.deepEqual(call(0, 'finish', { runId: slower.id, moves: [1] }), slower.result);
  assert.equal(db.notifications.length, noticeCount);
  assert.throws(() => call(1, 'finish', { runId: slower.id, moves: [15] }), { status: 404 });
  const run = call(0, 'start').run;
  assert.throws(() => call(0, 'start'), { status: 429 });
  db.puzzleRuns.find((r) => r.id === run.id).board = movePuzzle(solvedPuzzle(), 15);
  assert.throws(() => call(0, 'finish', { runId: run.id, moves: [15] }), { status: 400 });
  assert.throws(() => call(1, 'begin', { runId: run.id, tile: 15 }), { status: 404 });
  assert.throws(() => call(0, 'begin', { runId: run.id, tile: 1 }), { status: 400 });
  const began = call(0, 'begin', { runId: run.id, tile: 15 });
  now += 100;
  assert.equal(call(0, 'begin', { runId: run.id, tile: 15 }).startedAt, began.startedAt);
  assert.throws(() => call(0, 'finish', { runId: run.id, moves: [1] }), { status: 400 });
  assert.throws(() => call(0, 'finish', { runId: run.id, moves: [] }), { status: 400 });
  const oldMonthCount = db.puzzleRecords.length;
  now = Date.parse('2026-11-30T14:59:59.900Z');
  const newMonth = call(0, 'start').run;
  db.puzzleRuns.find((r) => r.id === newMonth.id).board = movePuzzle(solvedPuzzle(), 15);
  call(0, 'begin', { runId: newMonth.id, tile: 15 });
  now += 300;
  assert.equal(call(0, 'finish', { runId: newMonth.id, moves: [15] }).record.month, '2026-12');
  assert.equal(db.puzzleRecords.length, oldMonthCount + 1);
  assert.equal(call(0, '', {}, 'GET', 'month=2026-11').total, 4);
  assert.equal(call(0, '', {}, 'GET', 'month=2026-12').total, 1);
  console.log(
    'PASS: solvable shuffles, legal moves, server time/replay, monthly personal bests, KST boundary, ties, private ownership, retry idempotency and podium entry/displacement notifications',
  );
} finally {
  Date.now = originalNow;
  await fs.rm(directory, { recursive: true, force: true });
}
