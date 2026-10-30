const assert = require('node:assert/strict');

module.exports = async function ({ guest, apprentice, member, deputy, admin }) {
  const endpoint = '/api/admin/posts/bulk';
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
    loadout: '오토마톤',
    tierlist: '주무기',
  };
  const draft = (board) => ({
    board,
    category: categories[board],
    title: `일괄관리 ${board} 검증`,
    content: '원본 보존',
    bodyHtml: '<p>원본 <strong>보존</strong></p>',
    images: [],
    ...(board === 'loadout' ? { loadout } : {}),
    ...(board === 'tierlist' ? { tierList } : {}),
    ...(board === 'helstagram'
      ? {
          bodyHtml: '',
          images: Array(10).fill('/images/helldivers-logo.png'),
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
        }
      : {}),
  });
  const create = async (board, extra = {}) =>
    (await admin.call('/api/posts', 'POST', { ...draft(board), ...extra })).data.post;
  const get = async (id) => (await admin.call(`/api/posts/${id}`)).data.post;
  const action = (ids, sourceBoard, targetBoard) => ({
    ids,
    sourceBoard,
    action: targetBoard ? 'move' : 'delete',
    targetBoard,
    reason: '일괄관리 테스트',
  });
  const first = await create('talk');
  const second = await create('talk');
  for (const actor of [guest, apprentice, member, deputy])
    await actor.call(endpoint, 'POST', action([first.id], 'talk'), actor === guest ? 401 : 403);
  await admin.call(endpoint, 'POST', action([first.id], 'talk'), 403, {
    Cookie: `${admin.cookie}; hd_view_role=member`,
  });
  for (const ids of [[], Array(101).fill(first.id), [first.id, first.id], [null]])
    await admin.call(endpoint, 'POST', action(ids, 'talk'), 400);
  await admin.call(endpoint, 'POST', action([first.id, 'missing'], 'talk'), 404);
  assert.equal((await get(first.id)).deletedAt, null);
  await admin.call(endpoint, 'POST', action([first.id, second.id], 'talk', 'tierlist'), 400);
  assert.equal((await get(first.id)).board, 'talk');
  await admin.call(endpoint, 'POST', action([first.id], 'talk', 'talk'), 400);
  await admin.call(endpoint, 'POST', action([first.id], 'talk', '__proto__'), 400);
  await admin.call(`/api/posts/${first.id}/comments`, 'POST', { body: '댓글 보존' });
  await member.call(`/api/posts/${first.id}/vote`, 'POST', { value: 1 });
  const before = await get(first.id);
  await admin.call(endpoint, 'POST', action([first.id, second.id], 'talk', 'guide'));
  const after = await get(first.id);
  for (const key of [
    'id',
    'title',
    'authorId',
    'createdAt',
    'content',
    'bodyHtml',
    'comments',
    'likes',
    'views',
    'sharePath',
  ])
    assert.deepEqual(after[key], before[key], key);
  assert.equal(after.category, '기타');
  await admin.call(before.sharePath, 'GET', undefined, 307);
  await admin.call(`/boards/talk/${first.id}`, 'GET', undefined, 307);
  await admin.call(endpoint, 'POST', action([first.id], 'talk'), 409);
  const moveLog = (
    await admin.call('/api/admin/logs?type=post_move&q=' + encodeURIComponent(first.title))
  ).data.logs;
  assert.ok(
    moveLog.some(
      (entry) =>
        entry.sourceBoard === 'talk' &&
        entry.targetBoard === 'guide' &&
        entry.reason === '일괄관리 테스트',
    ),
  );
  await admin.call(endpoint, 'POST', action([first.id, second.id], 'guide'));
  for (const post of [first, second])
    await admin.call(`/api/posts/${post.id}`, 'GET', undefined, 404);
  await admin.call(`/api/posts/${first.id}/comments`, 'GET', undefined, 404);
  // Every board can be managed. Specialized payloads remain editable after moving out and back.
  for (const board of Object.keys(categories)) {
    const post = await create(board, board === 'notice' ? { pinned: true } : {});
    const target = board === 'guide' ? 'qna' : 'guide';
    if (board === 'report')
      await admin.call(endpoint, 'POST', action([post.id], board, target), 400);
    await admin.call(endpoint, 'POST', {
      ...action([post.id], board, target),
      confirmVisibility: true,
    });
    const moved = await get(post.id);
    for (const key of [
      'title',
      'authorId',
      'createdAt',
      'content',
      'bodyHtml',
      'images',
      'maps',
      'tierList',
      'loadout',
      'youtubeUrl',
    ])
      assert.deepEqual(moved[key], post[key], `${board}:${key}`);
    assert.equal(moved.pinned, false);
    await admin.call(`/api/posts/${post.id}`, 'PATCH', {
      ...draft(board),
      category: moved.category,
      title: '이동 후 수정',
      status: 'published',
    });
    const edited = await get(post.id);
    assert.equal(edited.title, '이동 후 수정');
    assert.equal(edited.board, target);
    await admin.call(endpoint, 'POST', action([post.id], target, board));
    const restored = await get(post.id);
    assert.equal(restored.board, board);
    if (board === 'loadout') assert.equal(restored.category, '오토마톤');
    if (board === 'tierlist') assert.equal(restored.category, '주무기');
    if (board === 'helstagram') assert.equal(restored.images.length, 10);
    await admin.call(endpoint, 'POST', action([post.id], board));
    await admin.call(`/api/posts/${post.id}`, 'GET', undefined, 404);
  }
  const privatePost = (await member.call('/api/posts', 'POST', draft('report'))).data.post;
  await apprentice.call(`/api/posts/${privatePost.id}`, 'GET', undefined, 404);
  await admin.call(endpoint, 'POST', {
    ...action([privatePost.id], 'report', 'talk'),
    confirmVisibility: true,
  });
  await apprentice.call(`/api/posts/${privatePost.id}`);
  await admin.call(endpoint, 'POST', action([privatePost.id], 'talk', 'report'));
  await apprentice.call(`/api/posts/${privatePost.id}`, 'GET', undefined, 404);
  await guest.call(privatePost.sharePath, 'GET', undefined, 404);
  await admin.call(endpoint, 'POST', action([privatePost.id], 'report'));
  const draftPost = (
    await member.call('/api/posts', 'POST', { ...draft('tierlist'), status: 'draft' })
  ).data.post;
  await admin.call(endpoint, 'POST', action([draftPost.id], 'tierlist'), 404);
  const ownDraft = await create('tierlist', { status: 'draft' });
  await admin.call(endpoint, 'POST', action([ownDraft.id], 'tierlist', 'guide'), 400);
  await admin.call(endpoint, 'POST', action([ownDraft.id], 'tierlist'));
  await member.call(`/api/posts/${draftPost.id}`, 'DELETE', {});
  console.log(
    'PASS: bulk management across 8 boards, operator-only authority, atomic rejection, format/edit/share preservation, private-report visibility and draft isolation',
  );
};
