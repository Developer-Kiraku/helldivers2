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
  now += 5000;
  assert.throws(() => call('b', 'accept', { gameId: pending.id }), { status: 409 });
  assert.equal(db.pointLedger.length, 0);
  const game = accept(invite());
  const own = presence('a').game;
  assert.deepEqual(own.players.find((p) => p.id === 'b').dice, []);
  assert.equal(own.players.find((p) => p.id === 'b').sum, null);
  assert.equal(own.players.find((p) => p.id === 'a').dice.length, 1);
  decide('a', game);
  decide('a', game); // Retry is not another debit.
  assert.equal(db.users[0].points.current, 9900);
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
  call('a', 'rematch', { gameId: game.id, accept: true });
  assert.equal(db.diceGames.length, 2);
  call('b', 'rematch', { gameId: game.id, accept: true });
  assert.equal(db.diceGames.length, 3);
  assert.equal(db.diceGames.at(-1).status, 'playing');
  call('a', 'rematch', { gameId: game.id, accept: true });
  assert.equal(db.diceGames.length, 3);
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
    'PASS: dice invitation presence/expiry/cooldown, secret serialization, server rolls, staged CALL/DIE, unequal bets, atomic current-only wallets, duplicate requests, draw/fold/timeouts/withdrawal and mutual rematches',
  );
} finally {
  Date.now = originalNow;
  await fs.rm(directory, { recursive: true, force: true });
}
