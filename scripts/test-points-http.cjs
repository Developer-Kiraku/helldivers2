const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
module.exports = async function ({ guest, admin, deputy, member, apprentice, file }) {
  const settingsPath = '/api/admin/settings/points';
  const defaults = { post: 20, comment: 5, like: 2, daily: 50, bonusMultiplier: 2 };
  const balances = async (actor) => (await actor.call('/api/bootstrap')).data.user.points;
  const post = async (board = 'talk') =>
    (
      await member.call('/api/posts', 'POST', {
        board,
        category: board === 'guide' ? '무기' : '잡담',
        title: '포인트 회수 검증',
        content: '이력 확인',
        images: [],
      })
    ).data.post;
  const users = [admin, deputy, member, apprentice];
  await guest.call(settingsPath, 'GET', undefined, 401);
  for (const actor of users.slice(1)) await actor.call(settingsPath, 'GET', undefined, 403);
  await admin.call(settingsPath, 'PATCH', defaults);
  const welcome = (await admin.call(settingsPath)).data;
  assert.equal(welcome.settings.signup, 10000);
  assert.equal(welcome.initialGrant.amount, 10000);
  assert.equal(welcome.initialGrant.count, 4);
  await admin.call(settingsPath, 'PATCH', { ...defaults, signup: -1 }, 400);
  await admin.call(settingsPath, 'PATCH', { ...defaults, signup: 2500 });
  assert.equal((await admin.call(settingsPath)).data.settings.signup, 2500);
  await admin.call(settingsPath, 'PATCH', { ...defaults, signup: 10000 });
  await admin.call(settingsPath, 'PATCH', { ...defaults, post: -1 }, 400);
  await admin.call(settingsPath, 'PATCH', { ...defaults, like: 1.1 }, 400);
  await admin.call(settingsPath, 'PATCH', { ...defaults, bonusMultiplier: 0 }, 400);
  for (const actor of users) await balances(actor);
  const first = await balances(member);
  await Promise.all(Array.from({ length: 5 }, () => balances(member)));
  assert.deepEqual(
    await balances(member),
    first,
    'Daily points are awarded once across repeated requests',
  );
  const base = await Promise.all(users.map(balances));
  const normal = await post();
  assert.equal((await balances(member)).current, base[2].current + 20);
  const boosted = await post('guide');
  assert.equal((await balances(member)).current, base[2].current + 60);
  const vote = '/api/posts/' + boosted.id + '/vote';
  await admin.call(vote, 'POST', { value: 1 });
  await admin.call(vote, 'POST', { value: 1 });
  assert.equal((await balances(admin)).current, base[0].current + 4);
  assert.equal((await balances(member)).current, base[2].current + 64);
  await member.call(vote, 'POST', { value: 1 });
  assert.equal(
    (await balances(member)).current,
    base[2].current + 64,
    'Self recommendations do not earn points',
  );
  const comment = (
    await deputy.call('/api/posts/' + boosted.id + '/comments', 'POST', { body: '댓글 적립 확인' })
  ).data.comment;
  assert.equal((await balances(deputy)).current, base[1].current + 10);
  const commentVote = '/api/posts/' + boosted.id + '/comments/' + comment.id + '/vote';
  await admin.call(commentVote, 'POST', { value: 1 });
  assert.equal((await balances(deputy)).current, base[1].current + 14);
  assert.equal((await balances(admin)).current, base[0].current + 8);
  await admin.call(settingsPath, 'PATCH', {
    post: 30,
    comment: 7,
    like: 3,
    daily: 11,
    bonusMultiplier: 3,
  });
  await admin.call(vote, 'POST', { value: -1 });
  assert.equal((await balances(admin)).current, base[0].current + 4);
  assert.equal((await balances(member)).current, base[2].current + 60);
  await admin.call(vote, 'POST', { value: 0 });
  const next = await post('guide');
  assert.equal((await balances(member)).current, base[2].current + 150);
  await deputy.call('/api/posts/' + boosted.id + '/comments/' + comment.id, 'DELETE');
  assert.equal((await balances(deputy)).current, base[1].current);
  assert.equal((await balances(admin)).current, base[0].current);
  await admin.call('/api/admin/posts/bulk', 'POST', {
    action: 'delete',
    ids: [boosted.id, next.id],
    sourceBoard: 'guide',
  });
  assert.equal((await balances(member)).current, base[2].current + 20);
  await member.call('/api/posts/' + normal.id, 'DELETE');
  assert.deepEqual(await balances(member), base[2]);
  // Approval-based deletion goes through a separate audit action.
  await admin.call(settingsPath, 'PATCH', defaults);
  const operatorPost = await post();
  const request = (
    await deputy.call('/api/admin/requests', 'POST', {
      type: 'post_delete',
      targetId: operatorPost.id,
      reason: '포인트 회수 확인',
    })
  ).data.request;
  await admin.call('/api/admin/requests/' + request.id + '/review', 'POST', {
    decision: 'approved',
    note: '확인',
  });
  assert.deepEqual(await balances(admin), base[0]);
  assert.deepEqual(await balances(member), base[2]);
  const db = JSON.parse(await fs.readFile(file, 'utf8'));
  for (const id of ['u-admin', 'u-subadmin', 'u-user1', 'u-user2']) {
    const user = db.users.find((u) => u.id === id);
    const total = db.pointLedger
      .filter((row) => row.userId === id && !row.reversedAt)
      .reduce((sum, row) => sum + row.amount, 0);
    assert.equal(user.points.total, total);
    assert.equal(user.points.current, total);
    const daily = db.pointLedger.filter(
      (row) => row.userId === id && row.sourceKey.startsWith('daily:'),
    );
    assert.equal(daily.length, 1);
  }
  console.log(
    'PASS: daily deduplication, both recommendation recipients, doubled post/comment/vote awards, self-vote exclusion, settings permissions, original-value refunds, bulk and approved deletion, ledger/balance consistency',
  );
};
