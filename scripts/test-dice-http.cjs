const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
module.exports = async function ({ guest, member, apprentice, admin, file }) {
  const base = '/api/games/dice/';
  const tabs = {
    member: 'member-tab-1234567890',
    apprentice: 'apprentice-tab-1234567890',
    admin: 'admin-tab-1234567890',
  };
  const heartbeat = (actor, tabId, page = 'dice') =>
    actor.call(base + 'presence', 'POST', { tabId, page, visible: true });
  const fixture = async (change) => {
    const db = JSON.parse(await fs.readFile(file, 'utf8'));
    change(db);
    await fs.writeFile(file, JSON.stringify(db));
  };
  await guest.call(
    base + 'presence',
    'POST',
    { tabId: tabs.member, page: 'dice', visible: true },
    401,
  );
  await heartbeat(member, tabs.member, 'site');
  await member.call(
    base + 'invite',
    'POST',
    { tabId: tabs.member, targetId: 'u-user2', stake: 10 },
    403,
  );
  const lobby = (await heartbeat(member, tabs.member)).data;
  const before = lobby.points;
  assert.ok(
    lobby.online.some((user) => user.id === 'u-user2'),
    'Logged-in member can be invited without visiting the game page',
  );
  const peerBefore = (await apprentice.call('/api/bootstrap')).data.user.points;
  const game = (
    await member.call(base + 'invite', 'POST', {
      tabId: tabs.member,
      targetId: 'u-user2',
      stake: 10,
    })
  ).data.game;
  assert.equal(game.status, 'invited');
  await member.call(
    base + 'invite',
    'POST',
    { tabId: tabs.member, targetId: 'u-user2', stake: 10 },
    429,
  );
  await admin.call(base + 'accept', 'POST', { gameId: game.id }, 404);
  await member.call(base + 'accept', 'POST', { gameId: game.id }, 403);
  await apprentice.call(base + 'accept', 'POST', { gameId: game.id });
  let state = (await heartbeat(member, tabs.member)).data;
  assert.equal(state.game.players.find((player) => player.id === 'u-user2').sum, null);
  assert.deepEqual(state.game.players.find((player) => player.id === 'u-user2').dice, []);
  assert.equal((await heartbeat(admin, tabs.admin)).data.game, null);
  await member.call(base + 'decision', 'POST', { gameId: game.id, round: 1, choice: 'call' }, 409);
  await fixture((db) => {
    db.diceGames.find((item) => item.id === game.id).readyAt = Date.now() - 1;
  });
  const first = { gameId: game.id, round: 1, choice: 'call' };
  await Promise.all([
    member.call(base + 'decision', 'POST', first),
    member.call(base + 'decision', 'POST', first),
  ]);
  assert.equal((await heartbeat(member, tabs.member)).data.points.current, before.current - 10);
  const resumed = (await heartbeat(member, 'refreshed-tab-1234567890')).data.game;
  assert.equal(resumed.id, game.id);
  assert.equal(resumed.round, 1);
  assert.equal(resumed.players.find((player) => player.id === 'u-user1').decision, 'call');
  assert.equal(resumed.pot, 10);
  await apprentice.call(base + 'decision', 'POST', first);
  await fixture((db) => {
    db.diceGames.find((item) => item.id === game.id).readyAt = Date.now() - 1;
  });
  await member.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 11 }, 400);
  await member.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 2 });
  await apprentice.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 3 });
  assert.equal(
    (await heartbeat(member, tabs.member)).data.game.players.find(
      (player) => player.id === 'u-user2',
    ).sum,
    null,
  );
  await fixture((db) => {
    const stored = db.diceGames.find((item) => item.id === game.id);
    stored.dice['u-user1'] = [6, 6, 6];
    stored.dice['u-user2'] = [1, 1, 1];
    stored.revealAt = Date.now() - 1;
  });
  state = (await heartbeat(member, tabs.member)).data;
  assert.equal(state.game.winnerId, 'u-user1');
  assert.equal(state.game.pot, 70);
  assert.equal(state.points.current, before.current + 40);
  assert.equal(state.points.total, before.total);
  const peer = (await heartbeat(apprentice, tabs.apprentice)).data;
  assert.equal(peer.points.current, peerBefore.current - 40);
  assert.equal(peer.points.total, peerBefore.total);
  await member.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 2 });
  assert.deepEqual((await heartbeat(member, tabs.member)).data.points, state.points);
  await member.call(base + 'rematch', 'POST', { gameId: game.id, accept: true });
  const rematch = (
    await apprentice.call(base + 'rematch', 'POST', { gameId: game.id, accept: true })
  ).data.game;
  assert.notEqual(rematch.id, game.id);
  await fixture((db) => {
    db.diceGames.find((item) => item.id === rematch.id).readyAt = Date.now() - 1;
  });
  await member.call(base + 'decision', 'POST', { gameId: rematch.id, round: 1, choice: 'die' });
  assert.deepEqual((await heartbeat(member, tabs.member)).data.points, state.points);
  console.log(
    'PASS: dice HTTP auth/page-only invitations, cooldown, private rolls, out-of-turn rejection, concurrent CALL deduplication, unequal bets, current-only settlement and mutual rematches',
  );
};
