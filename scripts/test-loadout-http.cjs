const assert = require('node:assert/strict');
module.exports = async function ({ guest, member, deputy }) {
  const { selectableEquipment, equipment } = await import('../src/lib/equipment.mjs');
  const { normalizeLoadout } = await import('../src/lib/loadout.mjs');
  const loadout = {
    primary: selectableEquipment('primary')[0].id,
    secondary: selectableEquipment('secondary')[0].id,
    throwable: selectableEquipment('throwable')[0].id,
    armor: selectableEquipment('armor')[0].id,
    armorClass: '경장갑',
    stratagems: selectableEquipment('stratagem')
      .slice(0, 4)
      .map((item) => item.id),
  };
  const draft = {
    board: 'loadout',
    category: '테르미닛',
    title: '로드아웃 검증',
    content: '',
    bodyHtml: '',
    images: [],
    loadout,
  };
  assert.deepEqual(normalizeLoadout({ ...loadout, ignored: 'x' }), loadout);
  await guest.call('/api/posts', 'POST', draft, 401);
  for (const invalid of [
    null,
    { ...loadout, primary: loadout.secondary },
    { ...loadout, armorClass: '임의' },
    { ...loadout, stratagems: loadout.stratagems.slice(1) },
    { ...loadout, stratagems: Array(4).fill(loadout.stratagems[0]) },
    {
      ...loadout,
      stratagems: [
        equipment.find((item) => item.group === 'stratagem' && item.selectable === false).id,
        ...loadout.stratagems.slice(1),
      ],
    },
  ]) {
    await member.call('/api/posts', 'POST', { ...draft, loadout: invalid }, 400);
  }
  await member.call('/api/posts', 'POST', { ...draft, category: '기타' }, 400);
  const post = (await member.call('/api/posts', 'POST', draft)).data.post;
  assert.deepEqual(post.loadout, loadout);
  await deputy.call(`/api/posts/${post.id}`, 'PATCH', draft, 403);
  const updated = {
    ...draft,
    category: '오토마톤',
    loadout: { ...loadout, armorClass: '중장갑', primary: selectableEquipment('primary')[1].id },
  };
  await member.call(`/api/posts/${post.id}`, 'PATCH', updated);
  const saved = (await member.call(`/api/posts/${post.id}`)).data.post;
  assert.deepEqual(saved.loadout, updated.loadout);
  assert.equal(saved.category, '오토마톤');
  assert.ok(
    (await member.call('/api/bootstrap')).data.posts.loadout.some((row) => row.id === post.id),
  );
  for (const route of [
    '/boards/loadout',
    '/boards/loadout/write',
    `/boards/loadout/${post.id}`,
    `/boards/loadout/${post.id}/edit`,
  ])
    await member.call(route);
  const comment = (
    await member.call(`/api/posts/${post.id}/comments`, 'POST', { body: '좋은 세팅입니다.' })
  ).data.comment;
  assert.ok(comment.id);
  await member.call(`/api/posts/${post.id}`, 'DELETE', {});
  console.log(
    'PASS: loadout create/edit/read/list/delete, optional description, ownership, comments, category, slots, duplicate/mission rejection',
  );
};
