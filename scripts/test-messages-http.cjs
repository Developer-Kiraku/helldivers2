const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
module.exports = async function ({ guest, admin, deputy, member, apprentice }) {
  await guest.call('/api/messages', 'GET', undefined, 401);
  await guest.call('/api/messages/recipients?q=헬', 'GET', undefined, 401);
  await guest.call('/messages', 'GET', undefined, 307);
  const matches = (await member.call('/api/messages/recipients?q=견습')).data.users;
  assert.equal(matches[0].id, 'u-user2');
  assert.ok(!JSON.stringify(matches).match(/passwordHash|kakao|loginId|messageSentAt/));
  assert.equal((await member.call('/api/messages/recipients?q=')).data.users.length, 0);
  assert.ok(
    (await member.call('/api/messages/recipients?q=헬다이버')).data.users.every(
      (user) => user.id !== 'u-user1',
    ),
  );
  const send = (
    body = '비공개 쪽지 검증 <img src=x onerror=alert(1)>',
    recipientId = 'u-user2',
  ) => ({ body, recipientId, requestId: randomUUID() });
  await deputy.call('/api/admin/users/u-user1/mute', 'POST', { duration: 'day' });
  await member.call('/api/messages', 'POST', send(), 403);
  await member.call('/api/messages');
  await deputy.call('/api/admin/users/u-user1/mute', 'DELETE', {});
  const preview = await admin.call('/api/profile/view-role', 'POST', { role: 'member' });
  await admin.call('/api/messages', 'POST', send(), 403, {
    Cookie: `${admin.cookie}; ${preview.response.headers.get('set-cookie').split(';')[0]}`,
  });
  await member.call('/api/messages?box=invalid', 'GET', undefined, 400);
  await member.call('/api/messages', 'POST', send(), 403, { Origin: 'https://untrusted.example' });
  for (const body of ['', '  ', 'x'.repeat(2001), {}])
    await member.call('/api/messages', 'POST', send(body), 400);
  await member.call('/api/messages', 'POST', send('본인', 'u-user1'), 400);
  await member.call('/api/messages', 'POST', send('없는 회원', 'unknown'), 404);
  const draft = send();
  const sent = (await member.call('/api/messages', 'POST', draft)).data.message;
  const id = sent.id;
  assert.equal(sent.sender.id, 'u-user1');
  assert.equal(sent.body, draft.body);
  assert.equal((await member.call('/api/messages', 'POST', draft)).data.message.id, id);
  await member.call('/api/messages', 'POST', { ...draft, body: 'changed' }, 409);
  assert.equal((await apprentice.call('/api/messages/unread')).data.unreadCount, 1);
  assert.equal((await apprentice.call('/api/bootstrap')).data.unreadMessages, 1);
  assert.equal((await apprentice.call('/api/messages')).data.messages[0].id, id);
  assert.ok(!('body' in (await apprentice.call('/api/messages')).data.messages[0]));
  assert.equal((await member.call('/api/messages?box=sent')).data.messages[0].readAt, null);
  for (const outsider of [guest, admin, deputy]) {
    const status = outsider === guest ? 401 : 404;
    await outsider.call(`/api/messages/${id}`, 'GET', undefined, status);
    await outsider.call(`/api/messages/${id}/read`, 'POST', {}, status);
    await outsider.call(`/api/messages/${id}`, 'DELETE', {}, status);
  }
  await member.call(`/api/messages/${id}/read`, 'POST', {}, 404);
  await apprentice.call(`/api/messages/${id}`);
  assert.equal(
    (await apprentice.call('/api/messages/unread')).data.unreadCount,
    1,
    'GET does not mark read',
  );
  const read = (await apprentice.call(`/api/messages/${id}/read`, 'POST', {})).data;
  assert.equal(read.unreadCount, 0);
  assert.ok(read.message.readAt);
  assert.equal((await member.call(`/api/messages/${id}`)).data.message.readAt, read.message.readAt);
  assert.equal((await apprentice.call('/api/messages?unread=true')).data.total, 0);
  await member.call(`/api/messages/${id}`, 'DELETE', {});
  await member.call(`/api/messages/${id}`, 'GET', undefined, 404);
  assert.equal(
    (await apprentice.call(`/api/messages/${id}`)).data.message.body,
    draft.body,
    'Sender deletion preserves recipient copy',
  );
  await apprentice.call(`/api/messages/${id}`, 'DELETE', {});
  await apprentice.call(`/api/messages/${id}`, 'GET', undefined, 404);
  const reply = (
    await apprentice.call(
      '/api/messages',
      'POST',
      send('견습회원도 쪽지를 보낼 수 있습니다.', 'u-user1'),
    )
  ).data.message;
  await member.call(`/api/messages/${reply.id}`, 'DELETE', {});
  assert.equal((await member.call('/api/messages/unread')).data.unreadCount, 0);
  assert.equal((await apprentice.call(`/api/messages/${reply.id}`)).data.message.readAt, null);
  await apprentice.call(`/api/messages/${reply.id}`, 'DELETE', {});
  assert.ok(
    !JSON.stringify((await admin.call('/api/admin/logs')).data).includes('비공개 쪽지 검증'),
  );
  const limited = [];
  for (let index = 0; index < 10; index++)
    limited.push(
      (await deputy.call('/api/messages', 'POST', send(`횟수 확인 ${index}`))).data.message,
    );
  await deputy.call('/api/messages', 'POST', send('전송 제한 확인'), 429);
  for (const message of limited) {
    await deputy.call(`/api/messages/${message.id}`, 'DELETE', {});
    await apprentice.call(`/api/messages/${message.id}`, 'DELETE', {});
  }
  await deputy.call('/api/messages', 'POST', send('삭제로 전송 제한을 회피할 수 없음'), 429);
  assert.equal((await member.call('/api/messages?page=999')).data.page, 1);
  assert.equal((await member.call('/api/messages?page=-2')).data.page, 1);
  assert.ok(!('messageSentAt' in (await deputy.call('/api/auth/me')).data.user));
  console.log(
    'PASS: private messages auth, search, apprentice send, mute/preview restrictions, validation, rate limits, idempotency, read receipts and independent deletion; no administrator bypass',
  );
};
