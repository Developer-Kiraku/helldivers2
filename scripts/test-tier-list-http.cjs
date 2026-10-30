const assert = require('node:assert/strict');

module.exports = async function ({ guest, member, apprentice, deputy, admin }) {
  const { emptyTierList, normalizeTierList, moveTierItem, unrankedEquipment } =
    await import('../src/lib/tier-list.mjs');
  const { equipmentGroups, selectableEquipment, equipment } =
    await import('../src/lib/equipment.mjs');
  const [a, b, c] = selectableEquipment('primary')
    .slice(0, 3)
    .map((item) => item.id);
  let value = emptyTierList();
  value = moveTierItem(value, a, 0);
  value = moveTierItem(value, b, 0);
  value = moveTierItem(value, c, 0, b);
  assert.deepEqual(value.rows[0].items, [a, c, b]);
  value = moveTierItem(value, a, 0);
  assert.deepEqual(value.rows[0].items, [c, b, a]);
  value = moveTierItem(value, a, 1);
  assert.deepEqual(value.rows[0].items, [c, b]);
  assert.deepEqual(value.rows[1].items, [a]);
  value = moveTierItem(value, c, null);
  assert.ok(unrankedEquipment(value).some((item) => item.id === c));
  assert.ok(!unrankedEquipment(value).some((item) => item.id === a));
  assert.deepEqual(moveTierItem(value, a, 99), value);
  assert.deepEqual(normalizeTierList(value), value);
  const payload = {
    board: 'tierlist',
    title: '티어 임시저장 비공개 테스트',
    status: 'draft',
    tierList: emptyTierList(),
  };
  await guest.call('/api/posts', 'POST', payload, 401);
  await guest.call('/boards/tierlist/write', 'GET', undefined, 307);
  const draft = (await member.call('/api/posts', 'POST', payload)).data.post;
  assert.equal(draft.status, 'draft');
  const url = `/api/posts/${draft.id}`;
  assert.equal((await member.call(url)).data.post.title, payload.title);
  assert.ok(
    (await member.call('/api/bootstrap')).data.posts.tierlist.some((post) => post.id === draft.id),
  );
  await guest.call(draft.sharePath, 'GET', undefined, 404);
  for (const other of [apprentice, deputy, admin]) {
    await other.call(url, 'GET', undefined, 404);
    await other.call(url, 'PATCH', payload, 404);
    await other.call(url, 'DELETE', {}, 404);
    await other.call(`${url}/view`, 'POST', {}, 404);
    await other.call(`${url}/vote`, 'POST', { value: 1 }, 404);
    await other.call(`${url}/comments`, 'POST', { body: '비공개 테스트' }, 404);
    await other.call(draft.sharePath, 'GET', undefined, 404);
    assert.ok(
      !(await other.call('/api/bootstrap')).data.posts.tierlist.some(
        (post) => post.id === draft.id,
      ),
    );
  }
  await deputy.call(
    '/api/admin/requests',
    'POST',
    { type: 'post_delete', targetId: draft.id, reason: '임시저장 접근 테스트' },
    404,
  );
  await member.call(`${url}/comments`, 'POST', { body: '임시저장 댓글 차단' }, 400);
  await member.call(`${url}/vote`, 'POST', { value: 1 }, 400);
  assert.equal((await member.call(`${url}/view`, 'POST', {})).data.views, 0);
  value.rows[0].name = '내가 제일 좋아함';
  await member.call(url, 'PATCH', { ...payload, tierList: value });
  assert.deepEqual((await member.call(url)).data.post.tierList, value);
  assert.equal(
    (await admin.call('/api/admin/logs?q=' + encodeURIComponent(payload.title))).data.total,
    0,
  );
  assert.equal(
    (await admin.call('/api/admin/post-history?q=' + encodeURIComponent(payload.title))).data.total,
    0,
  );
  for (const invalid of [
    null,
    { ...value, group: 'bad' },
    { ...value, faction: 'bad' },
    { ...value, rows: [] },
    { ...value, rows: [{ name: '', items: [] }, ...value.rows.slice(1)] },
    { ...value, rows: [{ name: 'x'.repeat(21), items: [] }, ...value.rows.slice(1)] },
    { ...value, rows: [{ name: 'S', items: [a, a] }, ...emptyTierList().rows.slice(1)] },
    {
      ...value,
      rows: [
        { name: 'S', items: [selectableEquipment('secondary')[0].id] },
        ...emptyTierList().rows.slice(1),
      ],
    },
    { ...value, rows: [{ name: 'S', items: ['missing-id'] }, ...emptyTierList().rows.slice(1)] },
  ]) {
    await member.call('/api/posts', 'POST', { ...payload, tierList: invalid }, 400);
  }
  const mission = equipment.find((item) => item.group === 'stratagem' && item.selectable === false);
  const invalidMission = emptyTierList('stratagem');
  invalidMission.rows[0].items = [mission.id];
  await member.call('/api/posts', 'POST', { ...payload, tierList: invalidMission }, 400);
  await member.call('/api/posts', 'POST', { ...payload, status: 'anything' }, 400);
  await member.call('/api/posts', 'POST', { ...payload, status: 'published' }, 400);
  await member.call(url, 'PATCH', {
    ...payload,
    title: '완성된 티어리스트',
    status: 'published',
    tierList: value,
  });
  const published = (await apprentice.call(url)).data.post;
  assert.equal(published.status, 'published');
  assert.deepEqual(published.tierList, value);
  await guest.call(published.sharePath);
  await deputy.call(url, 'PATCH', { ...payload, tierList: value, status: 'published' }, 403);
  await member.call(url, 'PATCH', { ...payload, tierList: value }, 400);
  await apprentice.call(`${url}/vote`, 'POST', { value: 1 });
  assert.equal((await member.call(url)).data.post.likes, 1);
  assert.equal((await apprentice.call(`${url}/view`, 'POST', {})).data.views, 1);
  for (const route of [
    '/boards/tierlist',
    '/boards/tierlist/write',
    `/boards/tierlist/${draft.id}`,
    `/boards/tierlist/${draft.id}/edit`,
  ])
    await member.call(route);
  for (const [group, label] of equipmentGroups) {
    const tierList = emptyTierList(group);
    tierList.rows[6].items = [selectableEquipment(group)[0].id];
    tierList.faction = '일루미닛';
    const post = (
      await apprentice.call('/api/posts', 'POST', {
        ...payload,
        title: label,
        status: 'published',
        tierList,
        content: '무시할 본문',
        poll: { invalid: true },
      })
    ).data.post;
    assert.equal(post.category, label);
    assert.equal(post.content, '');
    assert.equal(post.poll, null);
    await apprentice.call(`/api/posts/${post.id}`, 'DELETE', {});
  }
  const removed = (await member.call('/api/posts', 'POST', payload)).data.post;
  await member.call(`/api/posts/${removed.id}`, 'DELETE', {});
  await member.call(`/api/posts/${removed.id}`, 'GET', undefined, 404);
  assert.equal(
    (await admin.call('/api/admin/logs?q=' + encodeURIComponent(payload.title))).data.total,
    0,
  );
  await member.call(url, 'DELETE', {});
  console.log(
    'PASS: tier list placement/reorder/pool, 7 categories, validation, drafts private even from staff/share/logs, publish/update/ownership/votes/views/delete',
  );
};
