const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
module.exports = async function ({ guest, admin, deputy, member, client, file }) {
  const start = '/api/admin/test-player/start';
  const prefix = '/api/test-player/';
  const presence = (actor, test = false, tabId = 'test-player-tab-1234567890') =>
    actor.call((test ? prefix : '/api/') + 'games/dice/presence', 'POST', {
      tabId,
      page: 'dice',
      visible: true,
    });
  await guest.call(start, 'POST', {}, 401);
  for (const actor of [deputy, member]) {
    await actor.call(start, 'POST', {}, 403);
    await actor.call(prefix + 'bootstrap', 'GET', undefined, 403);
    await actor.call('/test-user', 'GET', undefined, 307);
  }
  const starts = await Promise.all([
    admin.call(start, 'POST', {}),
    admin.call(start, 'POST', { role: 'operator', ownerId: 'u-user1' }),
  ]);
  const player = starts[0].data.user;
  assert.equal(player.role, 'member');
  assert.equal(player.actualRole, 'member');
  assert.equal(player.points.current, 10000);
  assert.notEqual(player.id, 'u-admin');
  assert.equal(starts[1].data.user.id, player.id);
  assert.ok(starts.every(({ response }) => !response.headers.get('set-cookie')));
  assert.equal((await admin.call('/api/bootstrap')).data.user.id, 'u-admin');
  assert.equal((await admin.call(prefix + 'bootstrap')).data.user.id, player.id);
  await admin.call(prefix + 'admin/users', 'GET', undefined, 403);
  await admin.call(prefix + 'profile', 'PATCH', { role: 'operator' }, 403);
  const ownerBefore = (await presence(admin)).data.points;
  const testBefore = (await presence(admin, true)).data.points;
  assert.ok((await presence(admin)).data.online.some((user) => user.id === player.id));
  const game = (
    await admin.call('/api/games/dice/invite', 'POST', {
      tabId: 'test-player-tab-1234567890',
      targetId: player.id,
      stake: 10,
    })
  ).data.game;
  await admin.call(prefix + 'games/dice/accept', 'POST', { gameId: game.id });
  const ready = async () => {
    const db = JSON.parse(await fs.readFile(file, 'utf8'));
    db.diceGames.find((item) => item.id === game.id).readyAt = Date.now() - 1;
    await fs.writeFile(file, JSON.stringify(db));
  };
  await ready();
  await admin.call('/api/games/dice/decision', 'POST', {
    gameId: game.id,
    round: 1,
    choice: 'call',
  });
  await admin.call(prefix + 'games/dice/decision', 'POST', {
    gameId: game.id,
    round: 1,
    choice: 'call',
  });
  const resumed = (await presence(admin, true, 'new-test-tab-after-reload-123')).data.game;
  assert.equal(resumed.id, game.id);
  assert.equal(resumed.round, 2);
  assert.equal(resumed.players.find((user) => user.id === 'u-admin').sum, null);
  assert.equal(
    (await presence(admin)).data.game.players.find((user) => user.id === player.id).sum,
    null,
  );
  await ready();
  await admin.call('/api/games/dice/decision', 'POST', {
    gameId: game.id,
    round: 2,
    choice: 'call',
    multiplier: 2,
  });
  await admin.call(prefix + 'games/dice/decision', 'POST', {
    gameId: game.id,
    round: 2,
    choice: 'die',
  });
  assert.equal((await presence(admin)).data.points.current, ownerBefore.current + 10);
  assert.equal((await presence(admin, true)).data.points.current, testBefore.current - 10);
  const testAfter = (await presence(admin, true)).data.points;
  await admin.call('/api/admin/test-player/stop', 'POST', {});
  await admin.call(prefix + 'bootstrap', 'GET', undefined, 401);
  assert.equal((await admin.call('/api/bootstrap')).data.user.role, 'operator');
  assert.deepEqual((await admin.call(start, 'POST', {})).data.user.points, testAfter);
  const other = client();
  await other.call('/api/auth/login', 'POST', { loginId: 'admin', password: '1234' });
  assert.equal((await other.call(start, 'POST', {})).data.user.id, player.id);
  await other.call('/api/auth/logout', 'POST', {});
  await other.call(prefix + 'bootstrap', 'GET', undefined, 401);
  assert.equal((await admin.call('/api/admin/test-player/status')).data.active, true);
  await admin.call('/api/admin/test-player/stop', 'POST', {});
  const db = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(
    db.users.filter((user) => user.isTestPlayer && user.testOwnerId === 'u-admin').length,
    1,
  );
  assert.equal(
    db.pointLedger.filter((row) => row.userId === player.id && row.sourceKey.startsWith('signup:'))
      .length,
    1,
  );
  console.log(
    'PASS: operator-only test player, isolated same-cookie owner/member game requests, private rolls, wallet settlement, refresh, stop/reopen without refills and owner-session revocation',
  );
};
