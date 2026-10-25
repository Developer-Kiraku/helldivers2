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
      content: '안녕 :hd01:',
      images: board === 'helstagram' ? ['/images/helldivers-logo.png'] : [],
      bodyHtml:
        board === 'helstagram'
          ? ''
          : '<p>안녕 <img src="/emoticons/01.webp" onerror="bad()" class="evil"></p>',
    };
    const created = (await actor.call('/api/posts', 'POST', draft)).data.post;
    assert.equal(created.content, '안녕 :hd01:');
    if (board !== 'helstagram') {
      assert.ok(created.bodyHtml.includes('class="post-emoticon"'));
      assert.ok(!/onerror|evil/.test(created.bodyHtml));
      assert.equal(created.images.length, 0);
      await actor.call(`/api/posts/${created.id}`, 'PATCH', {
        ...draft,
        content: ':hd40:',
        bodyHtml: '<p><img src="/emoticons/40.webp"></p>',
      });
      assert.ok(
        (await actor.call(`/api/posts/${created.id}`)).data.post.bodyHtml.includes(
          '/emoticons/40.webp',
        ),
      );
    }
    await deputy.call(`/api/posts/${created.id}/comments`, 'POST', {
      body: '수고했어요 :hd32: :hd03:',
    });
    assert.equal(
      (await actor.call(`/api/posts/${created.id}`)).data.comments.at(-1).body,
      '수고했어요 :hd32: :hd03:',
    );
    await actor.call(`/api/posts/${created.id}`, 'DELETE', {});
  }
  console.log(
    'PASS: emoticon post creation/editing and comment persistence across all six boards.',
  );
};
