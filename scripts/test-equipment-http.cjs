const assert = require('node:assert/strict');
module.exports = async function ({ admin, member }) {
  const { equipment, equipmentHtml } = await import('../src/lib/equipment.mjs');
  const first = equipment[0],
    last = equipment.at(-1);
  for (const [board, category] of [
    ['notice', '공지'],
    ['guide', '기타'],
    ['talk', '잡담'],
    ['qna', '질문'],
    ['report', '신고'],
    ['helstagram', '스크린샷'],
  ]) {
    const actor = board === 'notice' ? admin : member;
    const draft = {
      board,
      category,
      title: '장비 아이콘 검증',
      content: first.token,
      bodyHtml: board === 'helstagram' ? '' : `<p>${equipmentHtml(first)}</p>`,
      images: board === 'helstagram' ? ['/images/helldivers-logo.png'] : [],
    };
    const post = (await actor.call('/api/posts', 'POST', draft)).data.post;
    if (board !== 'helstagram') assert.ok(post.bodyHtml.includes(equipmentHtml(first)));
    await actor.call(`/api/posts/${post.id}`, 'PATCH', {
      ...draft,
      content: last.token,
      bodyHtml: board === 'helstagram' ? '' : equipmentHtml(last),
    });
    const comment = (
      await actor.call(`/api/posts/${post.id}/comments`, 'POST', { body: first.token })
    ).data.comment;
    await actor.call(`/api/posts/${post.id}/comments/${comment.id}`, 'PATCH', { body: last.token });
    const saved = (await actor.call(`/api/posts/${post.id}`)).data;
    assert.equal(saved.post.content, last.token);
    assert.equal(saved.comments.at(-1).body, last.token);
    await actor.call(`/api/posts/${post.id}`, 'DELETE', {});
  }
  console.log('PASS: equipment post/comment create, edit and persistence on all six boards');
};
