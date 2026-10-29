const assert = require('node:assert/strict');

module.exports = async function ({ guest, admin, deputy, member, apprentice }) {
  const endpoint = '/api/admin/users/u-user1/mute';
  const setting = { duration: 'day', reason: '반복 도배 테스트' };
  const draft = {
    board: 'talk',
    title: '벙어리 검증',
    category: '잡담',
    content: '검증 본문',
    bodyHtml: '<p>검증 본문</p>',
    images: [],
  };
  const post = (await member.call('/api/posts', 'POST', draft)).data.post;
  const deputyPost = (
    await deputy.call('/api/posts', 'POST', { ...draft, board: 'notice', category: '공지' })
  ).data.post;
  const comments = `/api/posts/${post.id}/comments`;
  await guest.call(endpoint, 'POST', setting, 401);
  for (const actor of [member, apprentice]) {
    await actor.call(endpoint, 'POST', setting, 403);
    await actor.call(endpoint, 'DELETE', {}, 403);
  }
  for (const id of ['u-subadmin', 'u-admin']) {
    await deputy.call(`/api/admin/users/${id}/mute`, 'POST', setting, 403);
    await deputy.call(`/api/admin/users/${id}/mute`, 'DELETE', {}, 403);
  }
  await deputy.call(endpoint, 'POST', { duration: 'forever' }, 400);
  await deputy.call(endpoint, 'POST', { duration: 1 }, 400);
  await deputy.call(endpoint, 'POST', { duration: ['day'] }, 400);
  await deputy.call(endpoint, 'POST', { duration: { toString: null } }, 400);
  await deputy.call(endpoint, 'POST', { ...setting, reason: 'x'.repeat(1001) }, 400);
  const muted = (await deputy.call(endpoint, 'POST', setting)).data.user;
  assert.ok(Date.parse(muted.mutedUntil) > Date.now() + 86300000);
  assert.equal((await member.call('/api/auth/me')).data.user.mutedUntil, muted.mutedUntil);
  assert.equal((await member.call('/api/bootstrap')).data.user.mutedUntil, muted.mutedUntil);
  await member.call('/api/profile', 'PATCH', { mutedUntil: null });
  for (const board of ['notice', 'guide', 'talk', 'qna', 'report', 'loadout', 'helstagram']) {
    await member.call('/api/posts', 'POST', { ...draft, board }, 403);
  }
  await member.call(`/api/posts/${post.id}`, 'PATCH', draft, 403);
  const text = '민주주의 😀 테스트\n안녕하세요';
  const changed = (await member.call(comments, 'POST', { body: text })).data.comment;
  const characters = new Intl.Segmenter('ko', { granularity: 'grapheme' });
  assert.notEqual(changed.body, text);
  assert.equal([...characters.segment(changed.body)].length, [...characters.segment(text)].length);
  assert.equal(
    (await member.call(`/api/posts/${post.id}`)).data.comments.find((c) => c.id === changed.id)
      .body,
    changed.body,
  );
  const edited = (
    await member.call(`${comments}/${changed.id}`, 'PATCH', { body: '원래대로 복구 시도' })
  ).data.comment;
  assert.notEqual(edited.body, '원래대로 복구 시도');
  assert.equal((await apprentice.call(comments, 'POST', { body: text })).data.comment.body, text);
  const week = (await deputy.call(endpoint, 'POST', { duration: 'week' })).data.user;
  assert.ok(Date.parse(week.mutedUntil) > Date.now() + 6.99 * 86400000);
  const month = (await admin.call(endpoint, 'POST', { duration: 'month' })).data.user;
  assert.ok(Date.parse(month.mutedUntil) > Date.now() + 27.99 * 86400000);
  const log = (await deputy.call('/api/admin/logs?type=member_mute')).data.logs.find(
    (l) => l.muteDuration === 'day',
  );
  assert.equal(log.targetName, '헬다이버');
  assert.equal(log.reason, setting.reason);
  assert.equal(log.mutedUntil, muted.mutedUntil);
  assert.equal(
    (await deputy.call(endpoint, 'DELETE', { reason: '해제 테스트' })).data.user.mutedUntil,
    null,
  );
  assert.ok(
    (await admin.call('/api/admin/logs?type=member_unmute')).data.logs.some(
      (l) => l.reason === '해제 테스트',
    ),
  );
  await deputy.call(endpoint, 'DELETE', {}, 409);
  assert.equal((await member.call(comments, 'POST', { body: text })).data.comment.body, text);
  await member.call(`/api/posts/${post.id}`, 'PATCH', draft);
  await member.call(`${comments}/${changed.id}`, 'DELETE', {});
  await deputy.call('/api/admin/users/u-user2/mute', 'POST', setting);
  await apprentice.call('/api/posts', 'POST', draft, 403);
  await deputy.call('/api/admin/users/u-user2/mute', 'DELETE', {});
  await admin.call('/api/admin/users/u-subadmin/mute', 'POST', setting);
  await deputy.call('/api/posts', 'POST', { ...draft, board: 'notice' }, 403);
  await deputy.call(`/api/posts/${deputyPost.id}`, 'PATCH', draft, 403);
  await admin.call('/api/admin/users/u-subadmin/mute', 'DELETE', {});
  const selfEndpoint = '/api/admin/users/u-admin/mute';
  assert.equal(
    (await admin.call('/api/admin/users')).data.users.find((u) => u.id === 'u-admin').canMute,
    true,
  );
  await admin.call(selfEndpoint, 'POST', { duration: 'day', reason: '본인 기능 테스트' });
  await admin.call('/api/posts', 'POST', draft, 403);
  await admin.call('/api/posts', 'POST', { ...draft, board: 'notice', category: '공지' }, 403);
  const ownComment = (await admin.call(comments, 'POST', { body: text })).data.comment;
  assert.notEqual(ownComment.body, text);
  assert.equal(
    [...characters.segment(ownComment.body)].length,
    [...characters.segment(text)].length,
  );
  assert.ok(
    (await admin.call('/api/admin/logs?type=member_mute')).data.logs.some(
      (l) => l.selfTest && l.reason === '본인 기능 테스트',
    ),
  );
  await admin.call('/admin/users');
  assert.equal(
    (await admin.call('/api/admin/users')).data.users.find((u) => u.id === 'u-admin').canMute,
    true,
  );
  assert.equal((await admin.call(selfEndpoint, 'DELETE', {})).data.user.mutedUntil, null);
  assert.equal((await admin.call('/api/auth/me')).data.user.mutedUntil, null);
  assert.ok(
    (await admin.call('/api/admin/logs?type=member_unmute')).data.logs.some((l) => l.selfTest),
  );
  assert.equal(
    (await admin.call(`${comments}/${ownComment.id}`, 'PATCH', { body: text })).data.comment.body,
    text,
  );
  const recoveredPost = (await admin.call('/api/posts', 'POST', draft)).data.post;
  await admin.call(`/api/posts/${recoveredPost.id}`, 'DELETE', {});
  await member.call(`/api/posts/${post.id}`, 'DELETE', {});
  await deputy.call(`/api/posts/${deputyPost.id}`, 'DELETE', {});
  console.log(
    'PASS: mute permissions, board restrictions, comments, operator self-test/recovery, unmute and audit logs',
  );
};
