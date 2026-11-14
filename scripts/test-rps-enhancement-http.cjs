const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
module.exports = async ({ guest, admin, member, file }) => {
  const base = '/api/games/rps/enhance';
  await guest.call(base, 'GET', undefined, 401);
  const before = (await member.call(base)).data;
  const input = {
    requestId: randomUUID(),
    expectedVersion: before.hand.version,
    cost: 0,
    level: 20,
  };
  await member.call(base, 'POST', input, 403, { Origin: null });
  const replies = await Promise.all(
    Array.from({ length: 5 }, () => member.call(base, 'POST', input)),
  );
  for (const reply of replies) assert.deepEqual(reply.data, replies[0].data);
  const after = replies[0].data;
  assert.equal(after.hand.level, 1);
  assert.equal(after.points.current, before.points.current - 100);
  assert.equal(after.points.total, before.points.total);
  assert.deepEqual((await member.call(base + '?requestId=' + input.requestId)).data, after);
  assert.equal((await admin.call(base + '?requestId=' + input.requestId)).data.result, null);
  await member.call(base, 'POST', { ...input, requestId: randomUUID() }, 409);
  const saved = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(saved.rpsEnhancements.filter((row) => row.requestId === input.requestId).length, 1);
  assert.equal(
    saved.pointLedger.filter((row) => row.sourceKey === 'rps-enhance:u-user1:' + input.requestId)
      .length,
    1,
  );
  assert.equal((await member.call('/api/games/rps')).data.hand.level, 1);
  console.log(
    'PASS: enhancement HTTP auth/CSRF, concurrent retry, exact server charge, game sync, persistence and private receipts',
  );
};
