const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
module.exports = async function ({ guest, admin, member, file }) {
  const base = '/api/games/extermination';
  await guest.call(base, 'GET', undefined, 401);
  await guest.call(base + '/start', 'POST', { requestId: randomUUID() }, 401);
  const start = { requestId: randomUUID() };
  const run = (await member.call(base + '/start', 'POST', start)).data.run;
  assert.equal((await member.call(base + '/start', 'POST', start)).data.run.id, run.id);
  await admin.call(base + '/sync', 'POST', { runId: run.id, step: 0, at: 0, events: [] }, 404);
  await member.call(
    base + '/sync',
    'POST',
    { runId: run.id, step: 0, at: 999999, events: [] },
    400,
  );
  await member.call(
    base + '/sync',
    'POST',
    { runId: run.id, step: 0, at: 1, events: [{ type: 'shot', t: 1, x: -10, y: 40 }] },
    400,
  );
  const db = JSON.parse(await fs.readFile(file, 'utf8'));
  const stored = db.trainingRuns.find((row) => row.id === run.id);
  const user = db.users.find((row) => row.id === stored.userId);
  const balance = user.points.current;
  Object.assign(stored, {
    hp: 4,
    nextSpawn: 10000,
    totalKills: 1,
    points: 6,
    counts: [1, 0, 0, 0, 0, 0, 0],
    income: [6, 0, 0, 0, 0, 0, 0],
    enemies: [{ id: 1, kind: 0, slot: 0, hp: 1, born: 0, expires: 20, x: 500, y: 300, phase: 0 }],
  });
  await fs.writeFile(file, JSON.stringify(db));
  const payload = { runId: run.id, step: 0, at: 30, events: [] };
  const duplicate = await Promise.all([
    member.call(base + '/sync', 'POST', payload),
    member.call(base + '/sync', 'POST', payload),
  ]);
  assert.ok(duplicate.every(({ data }) => data.run.result.record.points === 6));
  const settled = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(settled.trainingRecords.filter((row) => row.id === run.id).length, 1);
  assert.equal(
    settled.pointLedger.filter((row) => row.sourceKey === 'extermination:' + run.id).length,
    1,
  );
  assert.equal(settled.users.find((row) => row.id === stored.userId).points.current, balance + 6);
  const ranking = (await member.call(base)).data;
  assert.equal(ranking.mine.points, 6);
  const share = (
    await member.call('/api/games/share', 'POST', { game: 'extermination', resultId: run.id })
  ).data.share;
  assert.equal(share.result.gameLabel, '슈퍼 지구 소탕 훈련');
  const publicPage = await guest.call(share.path);
  assert.match(publicPage.data, /슈퍼 지구 소탕 훈련/);
  const own = (await member.call('/api/bootstrap?posts=none')).data.user;
  assert.ok(own.points.current >= balance + 6);
  console.log(
    'PASS training HTTP auth, ownership, forged time/coordinates, concurrent replay, one payout, ranking, public result sharing and wallet persistence',
  );
};
