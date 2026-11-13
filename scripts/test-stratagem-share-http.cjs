const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
module.exports = async ({ guest, admin, member, file }) => {
  const base = '/api/games/stratagem';
  const started = (
    await admin.call(base + '/start', 'POST', { requestId: randomUUID(), replacePrevious: true })
  ).data;
  const id = started.run.id;
  const shareRequest = { game: 'stratagem', resultId: id };
  await admin.call('/api/games/share', 'POST', shareRequest, 404);
  const fixture = JSON.parse(await fs.readFile(file, 'utf8'));
  const run = fixture.stratagemRuns.find((row) => row.id === id);
  Object.assign(run, {
    stage: 4,
    clearedStage: 3,
    elapsedMs: 30000,
    readyAt: Date.now() - 28000,
    deadlineAt: Date.now() - 1000,
  });
  fixture.ownerSetup = { ...fixture.ownerSetup, ownerId: 'u-admin' };
  fixture.stratagemRecords = (fixture.stratagemRecords || []).filter(
    (row) => row.userId !== 'u-admin',
  );
  fixture.stratagemRecords.push({
    id: 'u-admin',
    userId: 'u-admin',
    runId: id,
    stage: 3,
    elapsedMs: 30000,
    finishedAt: Date.now() - 30000,
  });
  await fs.writeFile(file, JSON.stringify(fixture));
  const ended = (await admin.call(base)).data;
  assert.equal(ended.run.status, 'failed');
  let stored = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(
    stored.stratagemRuns.find((row) => row.id === id).status,
    'failed',
    'Timeout GET must persist the result before offering sharing',
  );
  assert.ok(stored.stratagemRuns.find((row) => row.id === id).finishedAt);
  const beforeRanking = (await admin.call(base + '/rankings')).data;
  assert.equal(beforeRanking.mine.rank, null);
  assert.ok(beforeRanking.unranked.some((row) => row.own));
  const share = (await admin.call('/api/games/share', 'POST', shareRequest)).data.share;
  assert.equal(share.result.headline, '3단계 클리어');
  assert.equal(share.result.stats[2].value, '0 P');
  await guest.call(share.path);
  await member.call('/api/games/share', 'POST', shareRequest, 404);
  assert.deepEqual((await admin.call(base + '/rankings')).data, beforeRanking);
  assert.equal((await admin.call(base)).data.points.current, started.points.current);
  // A result already shown before this fix may still be stored as playing.
  stored = JSON.parse(await fs.readFile(file, 'utf8'));
  const legacy = {
    ...stored.stratagemRuns.find((row) => row.id === id),
    id: randomUUID(),
    requestId: randomUUID(),
    status: 'playing',
    finishedAt: undefined,
  };
  stored.stratagemRuns.push(legacy);
  await fs.writeFile(file, JSON.stringify(stored));
  await member.call('/api/games/share', 'POST', { game: 'stratagem', resultId: legacy.id }, 404);
  const repaired = (
    await admin.call('/api/games/share', 'POST', { game: 'stratagem', resultId: legacy.id })
  ).data.share;
  assert.equal(repaired.result.headline, '3단계 클리어');
  stored = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(stored.stratagemRuns.find((row) => row.id === legacy.id).status, 'failed');
  assert.deepEqual((await admin.call(base + '/rankings')).data, beforeRanking);
  console.log(
    'PASS: excluded owner shares timed-out Hero results, persisted expiry, legacy recovery, no ranking/wallet changes and ownership',
  );
};
