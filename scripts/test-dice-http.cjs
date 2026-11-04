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
  const received = (await heartbeat(apprentice, tabs.apprentice, 'site')).data.game;
  assert.ok(received.receivedAt);
  assert.equal(received.expiresAt - received.receivedAt, 60000);
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
  assert.deepEqual(state.game.players.find((player) => player.id === 'u-user2').dice, [null]);
  assert.equal(state.game.publicDieIndex, 1);
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
  await member.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 6 }, 400);
  await member.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 1 });
  await apprentice.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 3 });
  await fixture((db) => {
    db.diceGames.find((item) => item.id === game.id).readyAt = Date.now() - 1;
  });
  await member.call(base + 'decision', 'POST', { ...first, round: 3, multiplier: 1 });
  await apprentice.call(base + 'decision', 'POST', { ...first, round: 3, multiplier: 2 });
  assert.equal(
    (await heartbeat(member, tabs.member)).data.game.players.find(
      (player) => player.id === 'u-user2',
    ).sum,
    null,
  );
  await fixture((db) => {
    const stored = db.diceGames.find((item) => item.id === game.id);
    stored.dice['u-user1'] = [6, 6, 6, 6];
    stored.dice['u-user2'] = [1, 1, 1, 1];
    stored.revealAt = Date.now() - 1;
  });
  state = (await heartbeat(member, tabs.member)).data;
  assert.equal(state.game.winnerId, 'u-user1');
  assert.equal(state.game.pot, 90);
  assert.equal(state.points.current, before.current + 60);
  assert.equal(state.points.total, before.total);
  const peer = (await heartbeat(apprentice, tabs.apprentice)).data;
  assert.equal(peer.points.current, peerBefore.current - 60);
  assert.equal(peer.points.total, peerBefore.total);
  await member.call(base + 'decision', 'POST', { ...first, round: 2, multiplier: 1 });
  assert.deepEqual((await heartbeat(member, tabs.member)).data.points, state.points);
  await admin.call(base + 'stop', 'POST', { gameId: game.id }, 404);
  await fixture((db) => {
    db.diceGames.find((item) => item.id === game.id).nextRoundAt = Date.now() - 1;
  });
  const rematch = (await heartbeat(apprentice, tabs.apprentice)).data.game;
  assert.notEqual(rematch.id, game.id);
  assert.equal((await heartbeat(member, tabs.member)).data.game.id, rematch.id);
  await member.call(base + 'stop', 'POST', { gameId: rematch.id });
  assert.equal((await heartbeat(apprentice, tabs.apprentice)).data.game.autoContinue, false);
  await fixture((db) => {
    db.diceGames.find((item) => item.id === rematch.id).readyAt = Date.now() - 1;
  });
  await member.call(base + 'decision', 'POST', { gameId: rematch.id, round: 1, choice: 'die' });
  assert.equal((await heartbeat(member, tabs.member)).data.game.status, 'playing');
  await apprentice.call(base + 'decision', 'POST', { gameId: rematch.id, round: 1, choice: 'die' });
  assert.equal((await heartbeat(member, tabs.member)).data.game.winnerId, null);
  assert.deepEqual((await heartbeat(member, tabs.member)).data.points, state.points);
  await fixture((db) => {
    db.users.find((user) => user.id === 'u-user1').lastDiceInviteAt = Date.now() - 5001;
  });
  const pending = (
    await member.call(base + 'invite', 'POST', {
      tabId: tabs.member,
      targetId: 'u-user2',
      stake: 10,
    })
  ).data.game;
  await guest.call(base + 'cancel', 'POST', { gameId: pending.id }, 401);
  await admin.call(base + 'cancel', 'POST', { gameId: pending.id }, 404);
  await apprentice.call(base + 'cancel', 'POST', { gameId: pending.id }, 403);
  const cancelled = await Promise.all([
    member.call(base + 'cancel', 'POST', { gameId: pending.id }),
    member.call(base + 'cancel', 'POST', { gameId: pending.id }),
  ]);
  assert.equal(cancelled[0].data.game.status, 'cancelled');
  assert.equal(cancelled[0].data.game.autoContinue, false);
  assert.equal(cancelled[0].data.game.revision, cancelled[1].data.game.revision);
  assert.deepEqual(cancelled[0].data.points, state.points);
  const cancellationNotice = (await heartbeat(apprentice, tabs.apprentice, 'site')).data;
  assert.equal(cancellationNotice.game.status, 'cancelled');
  assert.deepEqual(cancellationNotice.points, peer.points);
  await apprentice.call(base + 'accept', 'POST', { gameId: pending.id }, 409);
  console.log(
    'PASS: dice HTTP auth, private rolls, concurrent CALL/cancel deduplication, invitation cancellation authorization, unequal bets, current-only settlement, automatic rounds and stop authorization',
  );
};
