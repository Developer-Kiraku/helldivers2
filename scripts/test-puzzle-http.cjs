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
  assert.equal(complete.result.record.finishedAt, complete.completedAt);
  const automaticallySaved = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.ok(
    automaticallySaved.puzzleRecords.some((row) => row.id === run.id),
    'The last verified move saves the result without a finish request',
  );
  const notificationCount = automaticallySaved.notifications.length;
  assert.deepEqual(
    (await member.call(base + '/state?runId=' + run.id)).data.run.result,
    complete.result,
  );
  const stoppedCompleted = (await member.call(base + '/stop', 'POST', { runId: run.id })).data.run;
  assert.equal(stoppedCompleted.stopped, false, 'Stop cannot discard an already completed record');
  assert.deepEqual(stoppedCompleted.result, complete.result);
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
  assert.equal(
    JSON.parse(await fs.readFile(file, 'utf8')).notifications.length,
    notificationCount,
    'State/stop/finish retries cannot duplicate result notifications',
  );
  const stopped = (await admin.call(base + '/start', 'POST', {})).data.run;
  const batchFixture = JSON.parse(await fs.readFile(file, 'utf8'));
  batchFixture.puzzleRuns.find((item) => item.id === stopped.id).board = [
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15,
  ];
  await fs.writeFile(file, JSON.stringify(batchFixture));
  await admin.call(base + '/move', 'POST', { runId: stopped.id, tile: 13, step: 0 });
  const batch = { runId: stopped.id, step: 1, tiles: [14, 13, 14] };
  const batched = (await admin.call(base + '/move', 'POST', batch)).data.run;
  assert.equal(batched.step, 4);
  assert.equal(batched.moves, 8);
  const repeatedBatch = (await admin.call(base + '/move', 'POST', batch)).data.run;
  assert.ok(repeatedBatch.elapsedMs >= batched.elapsedMs);
  assert.deepEqual({ ...repeatedBatch, elapsedMs: 0 }, { ...batched, elapsedMs: 0 });
  await admin.call(base + '/move', 'POST', { runId: stopped.id, step: 4, tiles: [13, 2] }, 400);
  assert.equal((await admin.call(base + '/state?runId=' + stopped.id)).data.run.step, 4);
  await admin.call(base + '/stop', 'POST', { runId: stopped.id });
  await admin.call(base + '/move', 'POST', { runId: stopped.id, tile: 15, step: 0 }, 409);
  await admin.call(base + '/finish', 'POST', { runId: stopped.id, moves: [15] }, 409);
  assert.equal((await admin.call(base + '/state?runId=' + stopped.id)).data.run.stopped, true);
  const legacyFixture = JSON.parse(await fs.readFile(file, 'utf8'));
  const legacy = legacyFixture.puzzleRuns.find((item) => item.id === stopped.id);
  Object.assign(legacy, {
    board: Array.from({ length: 16 }, (_, i) => (i + 1) % 16),
    completedAt: new Date().toISOString(),
    startedAt: new Date(Date.now() - 1000).toISOString(),
    moves: [15],
    step: 1,
  });
  delete legacy.stoppedAt;
  delete legacy.result;
  await fs.writeFile(file, JSON.stringify(legacyFixture));
  const recovered = (await admin.call(base + '/state?runId=' + stopped.id)).data.run.result;
  assert.ok(recovered);
  assert.ok(
    JSON.parse(await fs.readFile(file, 'utf8')).puzzleRecords.some(
      (item) => item.id === stopped.id,
    ),
    'State recovery persists a legacy completed record rather than only returning it',
  );
  console.log(
    'PASS: server-authoritative puzzle moves/time/count, forged finish rejection, owner isolation, concurrent retry deduplication, sequential steps, stop invalidation and result idempotency',
  );
};
