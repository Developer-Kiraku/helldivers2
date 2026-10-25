const assert = require('node:assert/strict');

module.exports = async function testPrivateReports({ guest, admin, deputy, member, apprentice }) {
  await guest.call('/boards/report', 'GET', undefined, 307);
  await member.call('/boards/report');
  await apprentice.call('/boards/report/write');
  const draft = {
    board: 'report',
    category: '신고',
    title: '비공개 신고 제목 검증',
    content: '신고 본문은 작성자와 운영진만 열람',
    bodyHtml: '<p>신고 본문은 작성자와 운영진만 열람</p>',
    images: [],
  };
  const reports = [];
  for (const [author, other] of [
    [member, apprentice],
    [apprentice, member],
    [deputy, member],
    [admin, apprentice],
  ]) {
    const post = (await author.call('/api/posts', 'POST', draft)).data.post;
    reports.push([author, post]);
    const comment = (
      await author.call(`/api/posts/${post.id}/comments`, 'POST', { body: '비공개 댓글 검증' })
    ).data.comment;
    for (const viewer of new Set([author, admin, deputy])) {
      const detail = (await viewer.call(`/api/posts/${post.id}`)).data;
      assert.equal(detail.post.title, draft.title);
      assert.equal(detail.comments[0].body, '비공개 댓글 검증');
      const list = (await viewer.call('/api/bootstrap')).data.posts.report;
      assert.ok(list.some((item) => item.id === post.id));
    }
    const hiddenList = (await other.call('/api/bootstrap')).data.posts.report;
    assert.ok(!hiddenList.some((item) => item.id === post.id));
    assert.ok(hiddenList.every((item) => item.own));
    for (const [suffix, method, body] of [
      ['', 'GET'],
      ['', 'PATCH', draft],
      ['', 'DELETE', {}],
      ['/view', 'POST', {}],
      ['/comments', 'POST', { body: '접근 금지 댓글' }],
      [`/comments/${comment.id}`, 'PATCH', { body: '접근 금지 수정' }],
      [`/comments/${comment.id}`, 'DELETE', {}],
      ['/vote', 'POST', { value: 1 }],
      ['/poll', 'POST', { choices: [] }],
      ['/poll', 'PATCH', { close: true }],
    ]) {
      const result = await other.call(`/api/posts/${post.id}${suffix}`, method, body, 404);
      assert.ok(!JSON.stringify(result.data).includes(draft.title));
    }
    for (const viewer of [guest, other]) {
      const shared = await viewer.call(post.sharePath, 'GET', undefined, 404);
      assert.ok(!shared.data.includes(draft.title));
      assert.ok(!shared.data.includes(draft.content));
    }
    for (const viewer of new Set([author, admin, deputy]))
      await viewer.call(post.sharePath, 'GET', undefined, 307);
    // Route HTML and metadata must not publish titles before the authorized API load.
    const route = await other.call(`/boards/report/${post.id}`);
    assert.ok(!route.data.includes(draft.title));
  }
  const preview = {
    call: admin.call,
    cookie: `${admin.cookie}; hd_view_role=member`,
  };
  const previewList = (await preview.call('/api/bootstrap')).data.posts.report;
  assert.ok(previewList.every((post) => post.authorId === 'u-admin'));
  await preview.call(`/api/posts/${reports[0][1].id}`, 'GET', undefined, 404);
  await deputy.call(`/api/posts/${reports[0][1].id}/comments`, 'POST', {
    body: '운영진 답변',
  });
  assert.equal(
    (await member.call(`/api/posts/${reports[0][1].id}`)).data.comments.at(-1).body,
    '운영진 답변',
  );
  for (const [author, post] of reports) {
    await author.call(`/api/posts/${post.id}`, 'PATCH', { ...draft, title: '신고 수정 검증' });
    await author.call(`/api/posts/${post.id}`, 'DELETE', {});
    await admin.call(`/api/posts/${post.id}`, 'GET', undefined, 404);
    await admin.call(post.sharePath, 'GET', undefined, 404);
  }
  console.log(
    'Private reports: author/staff access, hidden titles, nested APIs and sharing passed.',
  );
};
