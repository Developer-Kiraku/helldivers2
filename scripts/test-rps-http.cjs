const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
const fs = require('node:fs/promises');
module.exports = async function ({ guest, member, apprentice, admin, file }) {
  const base = '/api/games/rps';
  await guest.call('/games/rps', 'GET', undefined, 307);
  await guest.call('/points/guide', 'GET', undefined, 307);
  await guest.call(base, 'GET', undefined, 401);
  await guest.call('/api/points/guide', 'GET', undefined, 401);
  const settings = (await member.call('/api/points/guide')).data.settings;
  assert.deepEqual(settings, (await admin.call('/api/admin/settings/points')).data.settings);
  const before = (await member.call(base)).data;
  const packet = {
    requestId: randomUUID(),
    stake: 50,
    choice: 'rock',
    outcome: 'win',
    multiplier: 10,
  };
  await member.call(base + '/play', 'POST', packet, 403, { Origin: null });
  await guest.call(base + '/play', 'POST', packet, 401);
  await member.call(base + '/play', 'POST', { ...packet, stake: 51 }, 400);
  const responses = await Promise.all(
    Array.from({ length: 6 }, () => member.call(base + '/play', 'POST', packet)),
  );
  const first = responses[0].data;
  for (const response of responses) assert.deepEqual(response.data.round, first.round);
  assert.equal(first.points.current, before.points.current + first.round.profit);
  assert.equal(first.points.total, before.points.total);
  assert.equal(
    first.attempts.total,
    before.attempts.total - (first.round.outcome === 'draw' ? 0 : 1),
  );
  const store = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(store.rpsRounds.filter((round) => round.requestId === packet.requestId).length, 1);
  assert.equal(
    store.pointLedger.filter((row) => row.sourceKey === `rps:u-user1:${packet.requestId}:stake`)
      .length,
    1,
  );
  assert.deepEqual(
    (await member.call(base + '?requestId=' + packet.requestId)).data.round,
    first.round,
  );
  assert.equal((await apprentice.call(base + '?requestId=' + packet.requestId)).data.round, null);
  await member.call(base + '/play', 'POST', { ...packet, choice: 'paper' }, 409);
  const beforePost = (await member.call(base)).data.attempts.bonus;
  const postInput = {
    board: 'talk',
    category: '잡담',
    title: 'RPS 추가 도전 검증',
    content: '새 글에만 도전권을 지급하는지 확인합니다.',
    bodyHtml: '<p>추가 도전 검증</p>',
    images: [],
  };
  const post = (await member.call('/api/posts', 'POST', postInput)).data.post;
  assert.equal((await member.call(base)).data.attempts.bonus, beforePost + 1);
  await member.call('/api/posts/' + post.id, 'PATCH', { ...postInput, title: 'RPS 수정 검증' });
  await member.call('/api/posts/' + post.id + '/comments', 'POST', {
    body: '댓글은 추가 횟수를 지급하지 않습니다.',
  });
  assert.equal((await member.call(base)).data.attempts.bonus, beforePost + 1);
  await admin.call('/api/profile/view-role', 'POST', { role: 'member' });
  const viewCookie = admin.cookie;
  admin.cookie += '; hd_view_role=member';
  await admin.call(
    base + '/play',
    'POST',
    { requestId: randomUUID(), stake: 50, choice: 'paper' },
    403,
  );
  admin.cookie = viewCookie;
  await admin.call('/api/profile/view-role', 'POST', { role: 'operator' });
  console.log(
    'PASS: RPS authenticated HTTP, CSRF, concurrent retry settlement, private recovery, post bonus and live point guide settings',
  );
};
