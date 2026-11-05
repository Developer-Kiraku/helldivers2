const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
module.exports = async function ({ guest, member, apprentice, admin, file }) {
  const base = '/api/games/dice/';
  const tabs = {
    member: 'member-tab-1234567890',
    apprentice: 'apprentice-tab-1234567890',
    admin: 'admin-tab-1234567890',
  };
  const heartbeat = (actor, tabId, page = 'dice', focused = true) =>
    actor.call(base + 'presence', 'POST', { tabId, page, visible: true, focused });
  const fixture = async (change) => {
    const db = JSON.parse(await fs.readFile(file, 'utf8'));
    change(db);
    await fs.writeFile(file, JSON.stringify(db));
  };
  await guest.call(base + 'skin', 'POST', { skin: 'eagle' }, 401);
  for (const skin of ['helldiver', 'super-earth', 'eagle', 'automaton']) {
    assert.equal(
      (await member.call(base + 'skin', 'POST', { skin, userId: 'u-user2' })).data.skin,
      skin,
    );
  }
  await member.call(base + 'skin', 'POST', { skin: 'unknown' }, 400);
  assert.equal((await heartbeat(member, tabs.member)).data.skin, 'automaton');
  assert.equal((await heartbeat(apprentice, tabs.apprentice, 'site')).data.skin, 'helldiver');
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
  await heartbeat(apprentice, tabs.apprentice, 'site');
  assert.equal(
    (await heartbeat(member, tabs.member)).data.online.find((user) => user.id === 'u-user2')
      .focused,
    true,
  );
  await heartbeat(apprentice, tabs.apprentice, 'site', false);
  assert.equal(
    (await heartbeat(member, tabs.member)).data.online.find((user) => user.id === 'u-user2')
      .focused,
    false,
  );
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
  assert.equal(
    (await heartbeat(apprentice, tabs.apprentice)).data.game.players.find(
      (player) => player.id === 'u-user1',
    ).skin,
    'automaton',
  );
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
    db.diceGames.find((item) => item.id === rematch.id).finishedAt = Date.now() - 5001;
    db.users.find((user) => user.id === 'u-user1').lastDiceInviteAt = Date.now() - 5001;
  });
  assert.equal((await heartbeat(member, tabs.member)).data.game, null);
  assert.equal((await heartbeat(apprentice, tabs.apprentice)).data.game, null);
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
  await fixture((db) => {
    db.users.find((user) => user.id === 'u-user1').lastDiceInviteAt = Date.now() - 5001;
  });
  const limited = (
    await member.call(base + 'invite', 'POST', {
      tabId: tabs.member,
      targetId: 'u-user2',
      stake: 10,
    })
  ).data.game;
  await apprentice.call(base + 'accept', 'POST', { gameId: limited.id });
  await fixture((db) => {
    db.diceGames.find((item) => item.id === limited.id).readyAt = Date.now() - 1;
    db.users.find((user) => user.id === 'u-user1').points.current = 10;
  });
  await member.call(base + 'decision', 'POST', { gameId: limited.id, round: 1, choice: 'call' });
  const secondTurn = (
    await apprentice.call(base + 'decision', 'POST', {
      gameId: limited.id,
      round: 1,
      choice: 'call',
    })
  ).data.game;
  assert.equal(secondTurn.round, 2);
  assert.equal(secondTurn.autoContinue, false);
  assert.equal(secondTurn.players.find((p) => p.id === 'u-user1').decision, 'locked');
  const automatic = (await heartbeat(member, 'reload-auto-die-1234567890')).data;
  assert.equal(automatic.points.current, 0);
  assert.equal(automatic.game.players.find((p) => p.id === 'u-user1').decision, 'die');
  assert.equal(automatic.game.players.find((p) => p.id === 'u-user1').decisionReason, 'points');
  await fixture((db) => {
    db.diceGames.find((item) => item.id === limited.id).readyAt = Date.now() - 1;
  });
  const completed = await Promise.all(
    [1, 2].map(() =>
      apprentice.call(base + 'decision', 'POST', {
        gameId: limited.id,
        round: 2,
        choice: 'call',
        multiplier: 2,
      }),
    ),
  );
  assert.equal(completed[0].data.game.status, 'finished');
  assert.equal(completed[0].data.game.reason, 'points');
  assert.equal(completed[0].data.game.winnerId, 'u-user2');
  assert.equal(completed[0].data.game.pot, 20);
  assert.equal(completed[0].data.points.current, peer.points.current + 10);
  assert.deepEqual(
    completed[1].data.points,
    completed[0].data.points,
    'Concurrent retries settle only once',
  );
  const compensated = (await heartbeat(member, 'reload-auto-die-1234567890')).data;
  assert.equal(compensated.game.consolation, 5000);
  assert.equal(compensated.points.current, 5000);
  assert.equal(compensated.points.total, before.total);
  assert.equal(compensated.game.autoContinue, false);
  const notices = (await member.call('/api/notifications')).data.notifications.filter(
    (item) => item.kind === 'dice_consolation',
  );
  assert.equal(notices.length, 1);
  assert.equal(notices[0].amount, 5000);
  assert.equal(notices[0].href, '/games/dice');
  assert.equal(notices[0].readAt, null);
  assert.ok(
    !(await admin.call('/api/notifications')).data.notifications.some(
      (item) => item.id === notices[0].id,
    ),
  );
  await admin.call('/api/notifications/' + notices[0].id + '/read', 'POST', {}, 404);
  await admin.call('/api/notifications/' + notices[0].id, 'DELETE', undefined, 404);
  await member.call('/api/notifications/' + notices[0].id + '/read', 'POST', {});
  const stored = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(
    stored.pointLedger.filter(
      (row) => row.gameId === limited.id && row.sourceKey.endsWith(':consolation'),
    ).length,
    1,
  );
  assert.equal(
    stored.audit.filter((row) => row.targetId === limited.id && row.action === 'points.grant')
      .length,
    1,
  );
  await fixture((db) => {
    db.diceGames.find((item) => item.id === limited.id).finishedAt = Date.now() - 5001;
    db.users.find((user) => user.id === 'u-user1').points.current = state.points.current;
    db.users.find((user) => user.id === 'u-user2').points.current = peer.points.current;
  });
  assert.equal((await heartbeat(member, tabs.member)).data.game, null);
  console.log(
    'PASS: dice HTTP auth, private rolls, concurrent CALL/cancel deduplication, unequal bets, automatic rounds, consolation payment/notification/audit deduplication and recipient authorization',
  );
};
