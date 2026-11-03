const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
module.exports = async function ({ guest, admin, member, file }) {
  const base = '/api/games/sliding-puzzle';
  await guest.call(base + '/start', 'POST', {}, 401);
  const run = (await member.call(base + '/start', 'POST', {})).data.run;
  const db = JSON.parse(await fs.readFile(file, 'utf8'));
  db.puzzleRuns.find((item) => item.id === run.id).board = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 14, 15,
  ];
  await fs.writeFile(file, JSON.stringify(db));
  await guest.call(base + '/move', 'POST', { runId: run.id, tile: 14, step: 0 }, 401);
  await admin.call(base + '/move', 'POST', { runId: run.id, tile: 14, step: 0 }, 404);
  await admin.call(base + '/state?runId=' + run.id, 'GET', undefined, 404);
  await admin.call(base + '/stop', 'POST', { runId: run.id }, 404);
  await member.call(base + '/begin', 'POST', { runId: run.id, tile: 14 }, 404);
  await member.call(base + '/move', 'POST', { runId: run.id, tile: 14, step: 1 }, 409);
  await member.call(base + '/move', 'POST', { runId: run.id, tile: 1, step: 0 }, 400);
  const first = { runId: run.id, tile: 14, step: 0 };
  const duplicates = await Promise.all([
    member.call(base + '/move', 'POST', first),
    member.call(base + '/move', 'POST', first),
  ]);
  assert.ok(duplicates.every(({ data }) => data.run.moves === 1 && data.run.step === 1));
  await member.call(
    base + '/finish',
    'POST',
    {
      runId: run.id,
      board: Array.from({ length: 16 }, (_, i) => (i + 1) % 16),
      elapsedMs: 0,
      moves: [14, 15],
    },
    400,
  );
  await member.call(base + '/move', 'POST', { runId: run.id, tile: 15, step: 0 }, 409);
  const complete = (await member.call(base + '/move', 'POST', { runId: run.id, tile: 15, step: 1 }))
    .data.run;
  assert.ok(complete.completedAt);
  const result = (
    await member.call(base + '/finish', 'POST', {
      runId: run.id,
      elapsedMs: -10,
      moves: [],
      month: '2000-01',
    })
  ).data;
  assert.equal(result.record.moves, 2);
  assert.equal(result.record.elapsedMs, complete.elapsedMs);
  assert.equal(result.record.finishedAt, complete.completedAt);
  assert.notEqual(result.record.month, '2000-01');
  assert.deepEqual((await member.call(base + '/finish', 'POST', { runId: run.id })).data, result);
  const stopped = (await admin.call(base + '/start', 'POST', {})).data.run;
  await admin.call(base + '/stop', 'POST', { runId: stopped.id });
  await admin.call(base + '/move', 'POST', { runId: stopped.id, tile: 15, step: 0 }, 409);
  await admin.call(base + '/finish', 'POST', { runId: stopped.id, moves: [15] }, 409);
  assert.equal((await admin.call(base + '/state?runId=' + stopped.id)).data.run.stopped, true);
  console.log(
    'PASS: server-authoritative puzzle moves/time/count, forged finish rejection, owner isolation, concurrent retry deduplication, sequential steps, stop invalidation and result idempotency',
  );
};
