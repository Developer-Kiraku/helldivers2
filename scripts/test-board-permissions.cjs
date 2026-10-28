const assert = require('node:assert/strict');

module.exports = async function ({ guest, apprentice, member, deputy, admin }) {
  const { selectableEquipment } = await import('../src/lib/equipment.mjs');
  const loadout = Object.fromEntries(
    ['primary', 'secondary', 'throwable', 'armor'].map((group) => [
      group,
      selectableEquipment(group)[0].id,
    ]),
  );
  loadout.armorClass = '경장갑';
  loadout.stratagems = selectableEquipment('stratagem')
    .slice(0, 4)
    .map((item) => item.id);
  const categories = {
    notice: '공지',
    guide: '무기',
    talk: '잡담',
    qna: '질문',
    report: '신고',
    helstagram: '스크린샷',
    loadout: '테르미닛',
  };
  for (const [board, category] of Object.entries(categories)) {
    const draft = {
      board,
      category,
      title: '게시판 작성 권한 검증',
      content: '권한 검사',
      bodyHtml: '<p>권한 검사</p>',
      images: board === 'helstagram' ? ['/images/helldivers-logo.png'] : [],
      ...(board === 'loadout' ? { loadout } : {}),
    };
    await guest.call('/api/posts', 'POST', draft, 401);
    await guest.call(`/boards/${board}/write`, 'GET', undefined, 307);
    for (const [role, actor] of Object.entries({ apprentice, member, deputy, admin })) {
      const allowed = board !== 'notice' || ['deputy', 'admin'].includes(role);
      const response = await actor.call('/api/posts', 'POST', draft, allowed ? 200 : 403);
      if (!allowed) continue;
      const post = response.data.post;
      assert.equal(post.board, board);
      await actor.call(`/api/posts/${post.id}`, 'PATCH', {
        ...draft,
        title: '본인 글 수정 권한 검증',
      });
      await guest.call(`/api/posts/${post.id}/comments`, 'POST', { body: '비회원 차단' }, 401);
      await actor.call(`/api/posts/${post.id}/comments`, 'POST', { body: '로그인 회원 댓글' });
      await actor.call(`/api/posts/${post.id}`, 'DELETE', {});
    }
  }
  console.log(
    'PASS: all 7 boards × guest/apprentice/member/deputy/operator writing permissions, guest write-page redirect, owner edit, authenticated comments',
  );
};
