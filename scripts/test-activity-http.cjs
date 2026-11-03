const assert = require('node:assert/strict');
module.exports = async function ({ guest, admin, deputy, member, apprentice }) {
  const create = async (actor, board = 'talk', more = {}) =>
    (
      await actor.call('/api/posts', 'POST', {
        board,
        category: board === 'report' ? '신고' : '잡담',
        title: '알림 동작 확인',
        content: '본문',
        images: [],
        ...more,
      })
    ).data.post;
  const list = async (actor, post) =>
    (await actor.call('/api/notifications')).data.notifications.filter((n) =>
      n.href.startsWith('/boards/' + post.board + '/' + post.id),
    );
  const comment = async (actor, post, body, parentId) =>
    (await actor.call('/api/posts/' + post.id + '/comments', 'POST', { body, parentId })).data
      .comment;
  for (const path of ['/api/notifications', '/api/activity/unread', '/api/mentions?q=라'])
    await guest.call(path, 'GET', undefined, 401);
  await member.call('/notifications');
  const options = (await member.call('/api/mentions?q=라')).data.users;
  assert.deepEqual(
    options.find((item) => item.id === 'u-admin'),
    { id: 'u-admin', nickname: '라미아' },
  );
  const post = await create(member, 'talk', {
    bodyHtml: '<p>문의 @라미아</p><p>다음 문단</p><p>hello@부운영자</p>',
  });
  assert.equal((await list(admin, post))[0].kind, 'mention');
  assert.equal((await list(deputy, post)).length, 0, 'Email addresses are not mentions');
  const root = await comment(deputy, post, '부모 댓글');
  const reply = await comment(apprentice, post, '@헬다이버 @헬다이버 답글', root.id);
  assert.equal(reply.parentId, root.id);
  assert.equal(reply.rootId, root.id);
  assert.deepEqual(
    (await list(member, post)).filter((n) => n.commentId === reply.id).map((n) => n.kind),
    ['mention'],
  );
  const replyNotice = (await list(deputy, post)).find((n) => n.commentId === reply.id);
  assert.equal(replyNotice.kind, 'reply');
  assert.ok(replyNotice.href.endsWith('#comment-' + reply.id));
  await admin.call('/api/notifications/' + replyNotice.id + '/read', 'POST', {}, 404);
  await deputy.call('/api/notifications/' + replyNotice.id + '/read', 'POST', {});
  const editUrl = '/api/posts/' + post.id + '/comments/' + reply.id;
  await apprentice.call(editUrl, 'PATCH', { body: '답글 수정 @헬다이버 @라미아' });
  assert.equal((await list(admin, post)).filter((n) => n.commentId === reply.id).length, 1);
  assert.ok((await list(deputy, post)).find((n) => n.id === replyNotice.id).readAt);
  assert.equal((await list(apprentice, post)).length, 0, 'No self notifications');
  const other = await create(admin);
  await member.call(
    '/api/posts/' + other.id + '/comments',
    'POST',
    { parentId: root.id, body: '다른 글의 댓글' },
    404,
  );
  const sub = await comment(member, post, '한 단계 더', reply.id);
  assert.equal(sub.rootId, root.id);
  assert.equal(sub.parentId, reply.id);
  for (const [url, recipient, target] of [
    ['/api/posts/' + post.id + '/vote', member, null],
    [editUrl + '/vote', apprentice, reply.id],
  ]) {
    const vote = async (value) => (await admin.call(url, 'POST', { value })).data;
    const votes = async () =>
      (await list(recipient, post)).filter(
        (n) => n.commentId === target && ['like', 'dislike'].includes(n.kind),
      );
    await vote(1);
    await vote(1);
    assert.equal((await votes()).length, 1);
    assert.equal((await votes())[0].actor, null);
    const result = await vote(-1);
    if (target) {
      assert.equal(result.comment.dislikes, 1);
      assert.equal(result.comment.likes, 0);
      assert.equal(result.comment.myVote, -1);
      assert.ok(!('votes' in result.comment));
    }
    assert.deepEqual(
      (await votes()).map((n) => n.kind),
      ['dislike'],
    );
    await vote(0);
    assert.equal((await votes()).length, 0);
  }
  await member.call('/api/notifications/read', 'POST', {});
  assert.equal((await member.call('/api/activity/unread')).data.notifications, 0);
  await deputy.call('/api/posts/' + post.id + '/comments/' + root.id, 'DELETE');
  await member.call(
    '/api/posts/' + post.id + '/comments',
    'POST',
    { parentId: root.id, body: '삭제된 댓글' },
    404,
  );
  assert.ok(
    (await member.call('/api/posts/' + post.id)).data.comments.some((c) => c.id === reply.id),
  );
  const privatePost = await create(member, 'report', { content: '@견습헬다이버 @라미아' });
  assert.equal((await list(apprentice, privatePost)).length, 0);
  assert.equal((await list(admin, privatePost))[0].kind, 'mention');
  await admin.call('/api/admin/posts/bulk', 'POST', {
    ids: [post.id],
    sourceBoard: 'talk',
    targetBoard: 'report',
    action: 'move',
  });
  assert.equal(
    (await apprentice.call('/api/notifications')).data.notifications.filter((n) =>
      n.href.includes(post.id),
    ).length,
    0,
  );
  await member.call('/api/posts/' + post.id, 'DELETE');
  await member.call('/api/posts/' + privatePost.id, 'DELETE');
  await admin.call('/api/posts/' + other.id, 'DELETE');
  assert.equal((await list(admin, privatePost)).length, 0);
  console.log(
    'PASS: threaded replies, mention matching and edits, one notification per recipient, private reports after moves, post/comment reactions, cancellation and private read receipts',
  );
};
