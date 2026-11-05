const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

module.exports = async function ({ guest, member, deputy, admin, file }) {
  const { boards } = await import('../src/lib/data.js');
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
  const records = async (parameters, actor = admin) => {
    const query = new URLSearchParams(parameters);
    const first = (await actor.call(`/api/admin/logs?${query}`)).data;
    const logs = [...first.logs];
    for (let page = 2; page <= first.pageCount; page++) {
      query.set('page', page);
      logs.push(...(await actor.call(`/api/admin/logs?${query}`)).data.logs);
    }
    assert.equal(logs.length, first.total);
    return logs;
  };
  for (const actor of [guest, member])
    await actor.call('/api/admin/logs?board=report', 'GET', undefined, actor === guest ? 401 : 403);

  for (const [board, definition] of Object.entries(boards)) {
    const title = `로그통합 검증 ${board}`;
    const writer = board === 'notice' ? admin : member;
    const payload = {
      board,
      title,
      category: definition.categories[0],
      content: '검증 본문',
      bodyHtml: '<p>검증 본문</p>',
      images: [],
      ...(board === 'tierlist'
        ? { tierList }
        : {
            poll: {
              question: '로그 검증 투표',
              options: ['선택 하나', '선택 둘'],
              anonymous: true,
            },
          }),
      ...(board === 'loadout' ? { loadout } : {}),
      ...(board === 'helstagram' ? { bodyHtml: '', images: ['/images/helldivers-logo.png'] } : {}),
    };
    const post = (await writer.call('/api/posts', 'POST', payload)).data.post;
    const url = `/api/posts/${post.id}`;
    await writer.call(url, 'PATCH', { ...payload, title: `${title} 수정` });
    const comment = (await writer.call(`${url}/comments`, 'POST', { body: '댓글 원문' })).data
      .comment;
    const commentUrl = `${url}/comments/${comment.id}`;
    await writer.call(commentUrl, 'PATCH', { body: '댓글 수정문' });
    await writer.call(commentUrl, 'PATCH', { body: '댓글 수정문' });
    const visibleLogs = await records({ q: title }, deputy);
    assert.equal(
      visibleLogs.find((entry) => entry.type === 'comment_update').postHref,
      `/boards/${board}/${post.id}#comment-${comment.id}`,
    );
    assert.equal(
      visibleLogs.find((entry) => entry.type === 'post_create').postHref,
      `/boards/${board}/${post.id}`,
    );
    await deputy.call(commentUrl, 'DELETE', {}, 403);
    await writer.call(commentUrl, 'DELETE', {});
    await writer.call(commentUrl, 'DELETE', {}, 404);
    await writer.call(`${url}/comments`, 'POST', { body: '' }, 400);
    const votes = board === 'helstagram' ? [1, 1, 0, 0] : [1, 1, -1, -1, 0, 0];
    for (const value of votes) await writer.call(`${url}/vote`, 'POST', { value });
    await writer.call(`${url}/vote`, 'POST', { value: 2 }, 400);
    if (board !== 'tierlist') {
      const [one, two] = post.poll.options.map((option) => option.id);
      for (const choices of [[], [one], [one], [two], [], []])
        await writer.call(`${url}/poll`, 'POST', { choices });
      await writer.call(`${url}/poll`, 'POST', { choices: ['invalid'] }, 400);
      await writer.call(`${url}/poll`, 'PATCH', { close: true });
    }
    const destination = board === 'talk' ? 'guide' : 'talk';
    await admin.call('/api/admin/posts/bulk', 'POST', {
      action: 'move',
      ids: [post.id],
      sourceBoard: board,
      targetBoard: destination,
      confirmVisibility: true,
    });
    const movedLogs = await records({ q: title }, deputy);
    assert.ok(movedLogs.every((entry) => entry.postHref === `/boards/${destination}/${post.id}`));
    await admin.call(url, 'DELETE', { reason: '로그 검증 삭제' });
    await admin.call(url, 'DELETE', {}, 404);
    const logs = await records({ q: title });
    assert.ok(logs.every((entry) => entry.postHref === null && entry.postDeleted));
    const types = [
      'post_create',
      'post_update',
      'comment_create',
      'comment_update',
      'comment_delete',
      'post_like',
      ...(board === 'helstagram' ? ['post_like_cancel'] : ['post_dislike', 'post_dislike_cancel']),
      ...(board === 'tierlist' ? [] : ['poll_vote', 'poll_change', 'poll_cancel', 'poll_close']),
      'post_move',
      'post_delete',
    ];
    assert.deepEqual(logs.map((entry) => entry.type).sort(), types.sort(), board);
    assert.equal(logs.find((entry) => entry.type === 'post_create').targetName, title);
    assert.equal(
      logs.find((entry) => entry.type === 'post_create').targetCreatedAt,
      post.createdAt,
    );
    for (const entry of logs.filter((item) => item.type.startsWith('comment_')))
      assert.equal(entry.targetCreatedAt, comment.createdAt);
    const original = await records({ q: title, board }, deputy);
    assert.equal(original.length, logs.length - 1); // Delete happened in the destination board.
    const moved = await records({ q: title, board: destination });
    assert.deepEqual(moved.map((entry) => entry.type).sort(), ['post_delete', 'post_move']);
    assert.equal((await records({ q: title, type: 'post_create', board })).length, 1);
    assert.equal((await records({ q: title, board: 'missing' })).length, 0);
    const stored = JSON.parse(await fs.readFile(file, 'utf8')).audit.filter(
      (entry) => entry.targetId === post.id || entry.targetId === comment.id,
    );
    assert.equal(stored.length, logs.length);
    assert.ok(
      !JSON.stringify(stored.filter((entry) => /^(comment|poll)\./.test(entry.action))).includes(
        'choices',
      ),
    );
    assert.ok(!JSON.stringify(stored).includes('댓글 원문'));
  }

  const draftTitle = '로그통합 임시저장 비공개';
  const payload = { board: 'tierlist', title: draftTitle, status: 'draft', tierList };
  const draft = (await admin.call('/api/posts', 'POST', payload)).data.post;
  await admin.call(`/api/posts/${draft.id}`, 'PATCH', payload);
  await admin.call('/api/admin/posts/bulk', 'POST', {
    action: 'delete',
    ids: [draft.id],
    sourceBoard: 'tierlist',
  });
  assert.equal((await records({ q: draftTitle }, deputy)).length, 0);
  assert.ok(
    !JSON.parse(await fs.readFile(file, 'utf8')).audit.some((entry) => entry.targetId === draft.id),
  );
  const publish = (await member.call('/api/posts', 'POST', payload)).data.post;
  await member.call(`/api/posts/${publish.id}`, 'PATCH', { ...payload, status: 'published' });
  assert.equal((await records({ q: draftTitle, type: 'post_create' })).length, 1);
  await member.call(`/api/posts/${publish.id}`, 'DELETE', {});
  console.log(
    'PASS: all boards create/edit/delete, comments, votes, polls, moves, filtered audit persistence and draft publishing privacy',
  );
};
