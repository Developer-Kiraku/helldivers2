const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { randomUUID } = require('node:crypto');
module.exports = async function ({ guest, admin, deputy, member, apprentice, file }) {
  const endpoint = '/api/admin/settings/point-grants';
  const wallets = async () =>
    Object.fromEntries(
      JSON.parse(await fs.readFile(file, 'utf8')).users.map((user) => [
        user.id,
        { ...user.points },
      ]),
    );
  const base = {
    requestId: randomUUID(),
    scope: 'selected',
    userIds: ['u-user1', 'u-user2'],
    amount: 125,
    reason: '이벤트 보상',
    expectedCount: 2,
  };
  await guest.call(endpoint, 'GET', undefined, 401);
  for (const actor of [deputy, member, apprentice]) {
    await actor.call(endpoint, 'GET', undefined, 403);
    await actor.call(endpoint, 'POST', base, 403);
  }
  for (const amount of [0, -1, 1.5, 1000001, '10', null])
    await admin.call(endpoint, 'POST', { ...base, amount }, 400);
  await admin.call(endpoint, 'POST', { ...base, userIds: [] }, 400);
  await admin.call(endpoint, 'POST', { ...base, requestId: 'invalid' }, 400);
  await admin.call(endpoint, 'POST', { ...base, reason: 'x'.repeat(201) }, 400);
  const before = await wallets();
  await admin.call(endpoint, 'POST', { ...base, userIds: ['u-user1', 'missing-member'] }, 409);
  assert.deepEqual(await wallets(), before, 'A missing recipient rejects the entire operation');
  const repeated = { ...base, userIds: ['u-user1', 'u-user2', 'u-user1'] };
  const results = await Promise.all([
    admin.call(endpoint, 'POST', repeated),
    admin.call(endpoint, 'POST', repeated),
  ]);
  assert.deepEqual(results.map(({ data }) => data.created).sort(), [false, true]);
  assert.equal(results[0].data.grant.count, 2);
  let after = await wallets();
  for (const id of ['u-user1', 'u-user2']) {
    assert.equal(after[id].current, before[id].current + 125);
    assert.equal(after[id].total, before[id].total + 125);
  }
  assert.deepEqual(after['u-admin'], before['u-admin']);
  await admin.call(endpoint, 'POST', { ...base, amount: 126 }, 409);
  await admin.call(endpoint, 'POST', base);
  assert.deepEqual(await wallets(), after, 'Retries do not pay again');
  const selectedLog = (await admin.call('/api/admin/logs?type=point_grant')).data.logs.find(
    (entry) => entry.amount === 125,
  );
  assert.ok(selectedLog.targetName.includes('헬다이버'));
  assert.equal(selectedLog.reason, '이벤트 보상');
  const list = (await admin.call(endpoint)).data;
  const all = {
    requestId: randomUUID(),
    scope: 'all',
    userIds: [],
    amount: 10,
    reason: '전체 지급',
    expectedCount: list.users.length,
    audienceVersion: list.audienceVersion,
  };
  await admin.call(endpoint, 'POST', { ...all, audienceVersion: 'stale' }, 409);
  assert.deepEqual(await wallets(), after);
  const result = (await admin.call(endpoint, 'POST', all)).data.grant;
  assert.equal(result.count, list.users.length);
  assert.equal(result.total, list.users.length * 10);
  const allAfter = await wallets();
  for (const user of list.users) {
    assert.equal(allAfter[user.id].total, after[user.id].total + 10);
    assert.equal(allAfter[user.id].current, after[user.id].current + 10);
  }
  await admin.call(endpoint, 'POST', all);
  assert.deepEqual(await wallets(), allAfter);
  const changed = JSON.parse(await fs.readFile(file, 'utf8'));
  changed.users.find((user) => user.id === 'u-user2').status = 'withdrawn';
  changed.users.push({
    id: 'new-grant-recipient',
    nickname: '신규지급대상',
    status: 'active',
    role: 'member',
    points: { total: 0, current: 0 },
    createdAt: new Date().toISOString(),
  });
  await fs.writeFile(file, JSON.stringify(changed));
  await admin.call(endpoint, 'POST', { ...all, requestId: randomUUID() }, 409);
  await admin.call(endpoint, 'POST', all);
  const restored = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(
    restored.users.find((user) => user.id === 'new-grant-recipient').points.current,
    0,
    'A retry after membership changes cannot pay new recipients',
  );
  restored.users = restored.users.filter((user) => user.id !== 'new-grant-recipient');
  restored.users.find((user) => user.id === 'u-user2').status = 'active';
  await fs.writeFile(file, JSON.stringify(restored));
  const history = (await admin.call(endpoint)).data.history;
  assert.equal(history[0].id, all.requestId);
  assert.equal(history[1].id, base.requestId);
  const db = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(
    db.audit.filter((entry) => entry.action === 'points.grant' && entry.targetId === base.requestId)
      .length,
    1,
  );
  assert.equal(db.pointLedger.filter((entry) => entry.grantId === base.requestId).length, 2);
  const rpsGrant = {
    ...base,
    kind: 'rps',
    requestId: randomUUID(),
    userIds: ['u-user1'],
    amount: 3,
    expectedCount: 1,
  };
  const rpsState = async (client) => (await client.call('/api/games/rps')).data;
  const beforeRps = await rpsState(member);
  const otherRps = await rpsState(apprentice);
  await deputy.call(endpoint, 'POST', rpsGrant, 403);
  await admin.call(endpoint, 'POST', { ...rpsGrant, amount: 0 }, 400);
  await admin.call(endpoint, 'POST', { ...rpsGrant, userIds: ['u-user1', 'missing'] }, 409);
  await admin.call(
    endpoint,
    'POST',
    { ...all, kind: 'rps', requestId: randomUUID(), audienceVersion: 'stale' },
    409,
  );
  assert.deepEqual((await rpsState(member)).attempts, beforeRps.attempts);
  const rpsResults = await Promise.all([
    admin.call(endpoint, 'POST', rpsGrant),
    admin.call(endpoint, 'POST', rpsGrant),
  ]);
  assert.deepEqual(rpsResults.map(({ data }) => data.created).sort(), [false, true]);
  await admin.call(endpoint, 'POST', { ...rpsGrant, kind: 'points' }, 409);
  const afterRps = await rpsState(member);
  assert.equal(afterRps.attempts.bonus, beforeRps.attempts.bonus + 3);
  assert.equal(afterRps.attempts.daily, beforeRps.attempts.daily);
  assert.deepEqual(afterRps.points, beforeRps.points);
  assert.deepEqual((await rpsState(apprentice)).attempts, otherRps.attempts);
  const grantLists = (await admin.call(endpoint)).data;
  assert.equal(grantLists.history[0].id, all.requestId);
  assert.equal(grantLists.rpsHistory[0].id, rpsGrant.requestId);
  assert.equal(
    grantLists.users.find((user) => user.id === 'u-user1').remainingAttempts,
    afterRps.attempts.total,
  );
  const rpsLogs = (await admin.call('/api/admin/logs?type=rps_grant')).data.logs;
  assert.equal(rpsLogs.length, 1);
  assert.equal(rpsLogs[0].amount, 3);
  const memberList = (await deputy.call('/api/admin/users')).data.users;
  assert.deepEqual(memberList.find((user) => user.id === 'u-user1').points, afterRps.points);
  console.log(
    'PASS: operator-only points and RPS grants, recipient validation, concurrent retries, balances, frozen audiences, member list points, receipts and audit history',
  );
};
