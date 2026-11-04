import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
const directory = await fs.mkdtemp(path.resolve('work/dice-test-'));
const originalNow = Date.now;
try {
  const outfile = path.join(directory, 'dice.cjs');
  await build({
    entryPoints: ['src/lib/server/dice-game.js'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'auth-errors',
        setup(builder) {
          builder.onResolve({ filter: /\/auth$/ }, () => ({ path: 'auth', namespace: 'test' }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, () => ({
            contents:
              'export function fail(status,message){throw Object.assign(new Error(message),{status});}',
          }));
        },
      },
    ],
  });
  const { handleDiceGame, settleDiceGames } = createRequire(import.meta.url)(outfile);
  let now = Date.parse('2026-11-04T03:00:00Z');
  Date.now = () => now;
  const make = () => ({
    users: ['a', 'b', 'c'].map((id) => ({
      id,
      nickname: id,
      status: 'active',
      points: { current: 10000, total: 10000 },
    })),
    diceGames: [],
    pointLedger: [],
    sessions: ['a', 'b', 'c'].map((userId) => ({
      userId,
      expiresAt: new Date(now + 86400000).toISOString(),
    })),
  });
  let db = make();
  const call = (id, action, input = {}) => {
    settleDiceGames(db, now);
    return handleDiceGame(
      db,
      db.users.find((user) => user.id === id),
      ['games', 'dice', action],
      'POST',
      input,
    );
  };
  const presence = (id, page = 'dice', visible = true) =>
    call(id, 'presence', { tabId: id.repeat(20), page, visible });
  const invite = (stake = 100) => {
    now += 6000;
    presence('a');
    presence('b');
    return call('a', 'invite', { tabId: 'a'.repeat(20), targetId: 'b', stake }).game;
  };
  const accept = (game) => {
    call('b', 'accept', { gameId: game.id });
    now += 1800;
    return db.diceGames.find((item) => item.id === game.id);
  };
  const decide = (id, game, choice = 'call', multiplier = 2, round = game.round) =>
    call(id, 'decision', { gameId: game.id, round, choice, multiplier });
  const unchangedTotals = () => assert.ok(db.users.every((user) => user.points.total === 10000));
  presence('a', 'site');
  presence('b');
  assert.ok(
    presence('a').online.some((user) => user.id === 'c'),
    'A logged-in member without a game-page heartbeat is eligible',
  );
  db.sessions.find((session) => session.userId === 'c').expiresAt = new Date(now - 1).toISOString();
  presence('c');
  assert.ok(
    !presence('a').online.some((user) => user.id === 'c'),
    'An expired login is excluded even with fresh presence',
  );
  presence('a', 'site');
  assert.throws(() => call('a', 'invite', { tabId: 'a'.repeat(20), targetId: 'b', stake: 100 }), {
    status: 403,
  });
  const pending = invite();
  assert.equal(pending.stake, 100);
  assert.equal(pending.pot, 0);
  assert.throws(() => call('a', 'invite', { tabId: 'a'.repeat(20), targetId: 'b', stake: 10 }), {
    status: 429,
  });
  assert.throws(() => call('c', 'accept', { gameId: pending.id }), { status: 404 });
  now += 60000;
  assert.throws(() => call('b', 'accept', { gameId: pending.id }), { status: 409 });
  assert.equal(db.pointLedger.length, 0);
  const originalDb = db;
  db = make();
  const delayed = invite();
  now += 4000;
  presence('b', 'site', false);
  assert.equal(
    db.diceGames.at(-1).receivedAt,
    null,
    'Hidden tabs do not consume the response window',
  );
  call('b', 'presence', { tabId: 'b'.repeat(20), page: 'site', visible: true, focused: false });
  assert.equal(
    db.diceGames.at(-1).receivedAt,
    null,
    'An unfocused window does not consume the response window',
  );
  const delivered = presence('b', 'site').game;
  assert.equal(
    delivered.expiresAt - now,
    60000,
    'The recipient receives a full minute after delivery',
  );
  now += 5001;
  assert.equal(
    presence('b').game.expiresAt,
    delivered.expiresAt,
    'Polling does not reset or extend an existing invitation',
  );
  now = delivered.expiresAt - 1;
  call('b', 'accept', { gameId: delayed.id });
  assert.equal(db.diceGames.at(-1).status, 'playing');
  db = make();
  const expiring = invite();
  const received = presence('b', 'site').game;
  now = received.expiresAt;
  assert.throws(() => call('b', 'accept', { gameId: expiring.id }), { status: 409 });
  assert.equal(db.diceGames.at(-1).status, 'expired');
  assert.equal(db.diceGames.at(-1).autoContinue, false, 'Expired invitations release the lobby');
  db = originalDb;
  let game = accept(invite());
  const own = presence('a').game;
  assert.deepEqual(own.players.find((p) => p.id === 'b').dice, []);
  assert.equal(own.players.find((p) => p.id === 'b').sum, null);
  assert.equal(own.players.find((p) => p.id === 'a').dice.length, 1);
  decide('a', game);
  decide('a', game); // Retry is not another debit.
  assert.equal(db.users[0].points.current, 9900);
  const savedGame = JSON.parse(JSON.stringify(game));
  db = JSON.parse(JSON.stringify(db));
  game = db.diceGames.find((item) => item.id === savedGame.id);
  const resumed = call('a', 'presence', {
    tabId: 'new-tab-after-refresh-12345',
    page: 'dice',
    visible: true,
  }).game;
  assert.equal(resumed.id, savedGame.id);
  assert.equal(resumed.deadlineAt, savedGame.deadlineAt);
  assert.equal(resumed.pot, 100);
  assert.equal(resumed.players.find((player) => player.id === 'a').decision, 'call');
  assert.deepEqual(resumed.players.find((player) => player.id === 'a').dice, savedGame.dice.a);
  decide('b', game);
  assert.equal(game.round, 2);
  assert.throws(() => decide('a', game), { status: 409 }); // Still rolling.
  now += 1800;
  decide('a', game, 'call', 1, 1); // Previous round retry cannot apply to round two.
  assert.equal(db.users[0].points.current, 9900);
  assert.throws(() => decide('a', game, 'call', 11), { status: 400 });
  decide('a', game, 'call', 2);
  decide('b', game, 'call', 10);
  assert.equal(game.status, 'revealing');
  assert.equal(presence('a').game.players.find((p) => p.id === 'b').sum, null);
  game.dice.a = [6, 6, 6];
  game.dice.b = [1, 1, 1];
  now = game.revealAt;
  const revealed = presence('a').game;
  assert.equal(revealed.winnerId, 'a');
  assert.equal(revealed.pot, 1400);
  assert.equal(revealed.players.find((p) => p.id === 'b').sum, 3);
  assert.equal(db.users[0].points.current, 11100);
  assert.equal(db.users[1].points.current, 8900);
  const ledgerSize = db.pointLedger.length;
  settleDiceGames(db, now);
  decide('a', game, 'call', 2, 2);
  assert.equal(db.pointLedger.length, ledgerSize);
  unchangedTotals();
  assert.ok(revealed.autoContinue);
  presence('b');
  now += 4999;
  presence('a');
  assert.equal(db.diceGames.length, 2);
  now++;
  presence('b');
  assert.equal(db.diceGames.length, 3);
  assert.equal(db.diceGames.at(-1).status, 'playing');
  presence('a');
  presence('b');
  assert.equal(db.diceGames.length, 3);
  assert.equal(db.pointLedger.length, ledgerSize, 'Automatic next games never place bets');
  call('a', 'stop', { gameId: game.id });
  assert.equal(db.diceGames.at(-1).autoContinue, false, 'A late stop follows the same series');
  assert.equal(db.diceGames.at(-1).stopBy, 'a');
  for (const stopMode of ['stop', 'navigate', 'reload', 'close', 'poor']) {
    db = make();
    const test = accept(invite());
    if (stopMode === 'stop') {
      assert.throws(() => call('c', 'stop', { gameId: test.id }), { status: 404 });
      call('a', 'stop', { gameId: test.id });
      call('a', 'stop', { gameId: test.id });
      assert.equal(test.status, 'playing');
    }
    if (stopMode === 'navigate') presence('b', 'site');
    decide('a', test);
    decide('b', test, 'die');
    assert.equal(db.users[0].points.current, 10000, 'Current round is still settled');
    if (stopMode === 'poor') db.users[1].points.current = 0;
    presence('a');
    if (['reload', 'close'].includes(stopMode)) presence('b', 'away', false);
    else if (stopMode !== 'navigate') presence('b');
    now += 5000;
    presence('a');
    assert.equal(db.diceGames.length, 1);
    if (stopMode === 'reload') {
      const resumed = presence('b').game;
      assert.notEqual(resumed.id, test.id, 'Returning from a refresh resumes automatic play');
      assert.equal(db.diceGames.length, 2);
    } else if (stopMode === 'close') {
      now += 30000;
      settleDiceGames(db, now);
      assert.equal(test.autoContinue, false, 'An abandoned page cannot retain an endless series');
    } else assert.equal(test.autoContinue, false);
  }
  db = make();
  const waitingGame = accept(invite());
  decide('a', waitingGame, 'die');
  presence('a');
  presence('b');
  now += 5000;
  presence('b', 'site');
  assert.equal(db.diceGames.length, 1, 'Navigation at the next-round deadline prevents a new game');
  assert.equal(waitingGame.autoContinue, false);
  for (const mode of ['die-first', 'die-second', 'tie', 'timeout-one', 'timeout-both', 'left']) {
    db = make();
    const test = accept(invite());
    if (mode === 'die-first') {
      decide('a', test);
      decide('b', test, 'die');
      assert.equal(db.users[0].points.current, 10000);
    } else {
      decide('a', test);
      decide('b', test);
      now += 1800;
      if (mode === 'die-second') {
        decide('a', test, 'call', 2);
        decide('b', test, 'die');
        assert.equal(db.users[0].points.current, 10100);
      }
      if (mode === 'tie') {
        decide('a', test, 'call', 3);
        decide('b', test, 'call', 8);
        test.dice.a = [1, 2, 3];
        test.dice.b = [3, 2, 1];
        now = test.revealAt;
        settleDiceGames(db, now);
        assert.equal(test.winnerId, null);
        assert.equal(db.users[0].points.current, 10000);
        assert.equal(db.users[1].points.current, 10000);
      }
      if (mode === 'timeout-one') {
        decide('a', test, 'call', 2);
        now = test.deadlineAt;
        settleDiceGames(db, now);
        assert.equal(test.winnerId, 'a');
        assert.equal(test.autoContinue, false);
      }
      if (mode === 'timeout-both') {
        now = test.deadlineAt;
        settleDiceGames(db, now);
        assert.equal(test.winnerId, null);
        assert.equal(db.users[0].points.current, 10000);
      }
      if (mode === 'left') {
        db.users[1].status = 'withdrawn';
        settleDiceGames(db, now);
        assert.equal(test.winnerId, 'a');
      }
    }
    assert.equal(test.status, 'finished');
    assert.equal(
      db.users.reduce((sum, user) => sum + user.points.current, 0),
      30000,
    );
    unchangedTotals();
  }
  db = make();
  const poor = accept(invite(1000));
  decide('a', poor);
  decide('b', poor);
  now += 1800;
  assert.throws(() => decide('a', poor, 'call', 10), { status: 400 });
  assert.equal(db.users[0].points.current, 9000);
  console.log(
    'PASS: dice invitations, private rolls, atomic bets/settlement, automatic rounds, stop/navigation/deadline races, refresh recovery, disconnect/timeout/low-balance termination',
  );
} finally {
  Date.now = originalNow;
  await fs.rm(directory, { recursive: true, force: true });
}
