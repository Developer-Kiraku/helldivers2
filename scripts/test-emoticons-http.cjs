const assert = require('node:assert/strict');
module.exports = async function ({ admin, member, deputy }) {
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
      title: '이모티콘 저장 검증',
      content: '안녕 :hd42:',
      images: board === 'helstagram' ? ['/images/helldivers-logo.png'] : [],
      bodyHtml:
        board === 'helstagram'
          ? ''
          : '<p>안녕 <img src="/emoticons/42.webp" onerror="bad()" class="evil"></p>',
    };
    const created = (await actor.call('/api/posts', 'POST', draft)).data.post;
    assert.equal(created.content, '안녕 :hd42:');
    if (board !== 'helstagram') {
      assert.ok(created.bodyHtml.includes('class="post-emoticon"'));
      assert.ok(!/onerror|evil/.test(created.bodyHtml));
      assert.equal(created.images.length, 0);
      await actor.call(`/api/posts/${created.id}`, 'PATCH', {
        ...draft,
        content: ':hd50:',
        bodyHtml: '<p><img src="/emoticons/50.webp"></p>',
      });
      assert.ok(
        (await actor.call(`/api/posts/${created.id}`)).data.post.bodyHtml.includes(
          '/emoticons/50.webp',
        ),
      );
    }
    const added = (
      await deputy.call(`/api/posts/${created.id}/comments`, 'POST', {
        body: '수고했어요 :hd32: :hd03:',
      })
    ).data.comment;
    assert.equal(
      (await actor.call(`/api/posts/${created.id}`)).data.comments.at(-1).body,
      '수고했어요 :hd32: :hd03:',
    );
    const endpoint = `/api/posts/${created.id}/comments/${added.id}`;
    assert.equal(added.own, true);
    for (const other of [admin, member]) {
      await other.call(endpoint, 'PATCH', { body: '다른 회원 수정' }, 403);
      await other.call(endpoint, 'DELETE', {}, 403);
    }
    await deputy.call(endpoint, 'PATCH', { body: '   ' }, 400);
    await deputy.call(endpoint, 'PATCH', { body: '가'.repeat(1001) }, 400);
    const edited = (await deputy.call(endpoint, 'PATCH', { body: '수정했어요 :hd42:' })).data
      .comment;
    assert.equal(edited.body, '수정했어요 :hd42:');
    assert.ok(edited.updatedAt);
    assert.equal(
      (await actor.call(`/api/posts/${created.id}`)).data.comments.at(-1).body,
      edited.body,
    );
    await deputy.call(endpoint, 'DELETE', {});
    assert.equal((await actor.call(`/api/posts/${created.id}`)).data.comments.length, 0);
    assert.equal((await actor.call(`/api/posts/${created.id}`)).data.post.comments, 0);
    await deputy.call(endpoint, 'PATCH', { body: '삭제 후 수정' }, 404);
    await deputy.call(endpoint, 'DELETE', {}, 404);
    await actor.call(`/api/posts/${created.id}`, 'DELETE', {});
  }
  console.log(
    'PASS: emoticon post creation/editing and comment persistence across all six boards.',
  );
};
