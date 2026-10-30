const assert = require('node:assert/strict');

module.exports = async function ({ guest, apprentice, member, deputy, admin }) {
  const { canDeletePost } = await import('../src/lib/post-access.mjs');
  for (const actorRole of ['apprentice', 'member', 'deputy', 'operator']) {
    for (const authorRole of ['apprentice', 'member', 'deputy', 'operator']) {
      const expected =
        actorRole === 'operator' ||
        (actorRole === 'deputy' && ['apprentice', 'member'].includes(authorRole));
      assert.equal(
        canDeletePost({ id: 'actor', role: actorRole }, { id: 'author', role: authorRole }),
        expected,
      );
      assert.equal(
        canDeletePost({ id: 'self', role: actorRole }, { id: 'self', role: authorRole }),
        true,
      );
    }
  }
  assert.equal(canDeletePost(null, { id: 'author', role: 'member' }), false);
  const { selectableEquipment } = await import('../src/lib/equipment.mjs');
  const { emptyTierList } = await import('../src/lib/tier-list.mjs');
  const tierList = emptyTierList();
  tierList.rows[0].items = [selectableEquipment('primary')[0].id];
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
    tierlist: '주무기',
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
      ...(board === 'tierlist' ? { tierList } : {}),
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
    const author = board === 'notice' ? deputy : member;
    for (const moderator of board === 'notice' ? [admin] : [admin, deputy]) {
      const title = `${board} ${moderator === admin ? '총운영자' : '부운영자'} 삭제 검증`;
      const post = (await author.call('/api/posts', 'POST', { ...draft, title })).data.post;
      const url = `/api/posts/${post.id}`;
      const detail = (await moderator.call(url)).data.post;
      assert.equal(detail.canDelete, true);
      assert.equal(detail.canEdit, false);
      assert.equal(detail.canRequestDelete, false);
      const listed = (await moderator.call('/api/bootstrap')).data.posts[board].find(
        (p) => p.id === post.id,
      );
      assert.equal(listed.canDelete, true);
      await apprentice.call(url, 'DELETE', {}, board === 'report' ? 404 : 403);
      const reason = `${board} 운영진 삭제 검증`;
      await moderator.call(url, 'DELETE', { reason });
      await author.call(url, 'GET', undefined, 404);
      const logs = (
        await admin.call('/api/admin/logs?type=post_delete&q=' + encodeURIComponent(title))
      ).data;
      assert.ok(
        logs.logs.some((entry) => entry.reason === reason),
        'Moderator deletion must leave its reason in an audit log',
      );
    }
    const staffPost = (await admin.call('/api/posts', 'POST', draft)).data.post;
    assert.equal((await deputy.call(`/api/posts/${staffPost.id}`)).data.post.canDelete, false);
    await deputy.call(`/api/posts/${staffPost.id}`, 'DELETE', {}, 403);
    await admin.call(`/api/posts/${staffPost.id}`, 'DELETE', {});
  }
  console.log(
    'PASS: all 8 boards × guest/apprentice/member/deputy/operator writing permissions, guest write-page redirect, owner edit, authenticated comments',
  );
};
