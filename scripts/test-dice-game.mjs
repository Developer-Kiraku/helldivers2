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
    call(id, 'presence', { tabId: id.repeat(20), page, visible, focused: visible });
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
  assert.equal(db.diceGames.at(-1).matchNumber, 1);
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
  assert.deepEqual(own.players.find((p) => p.id === 'b').dice, [null]);
  assert.equal(own.publicDieIndex, 1);
  assert.equal(own.roundCount, 4);
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
  assert.deepEqual(presence('a').game.players.find((p) => p.id === 'b').dice, [
    null,
    game.dice.b[1],
  ]);
  assert.throws(() => decide('a', game), { status: 409 }); // Still rolling.
  now += 1800;
  decide('a', game, 'call', 1, 1); // Previous round retry cannot apply to round two.
  assert.equal(db.users[0].points.current, 9900);
  assert.throws(() => decide('a', game, 'call', 11), { status: 400 });
  decide('a', game, 'call', 2);
  assert.throws(() => decide('b', game, 'call', 6), { status: 400 });
  decide('b', game, 'call', 5);
  assert.equal(game.round, 3);
  assert.equal(game.status, 'playing');
  assert.deepEqual(presence('a').game.players.find((p) => p.id === 'b').dice, [
    null,
    game.dice.b[1],
    null,
  ]);
  now += 1800;
  decide('a', game, 'call', 2);
  decide('b', game, 'call', 2);
  assert.equal(game.status, 'revealing');
  assert.equal(presence('a').game.players.find((p) => p.id === 'b').sum, null);
  game.dice.a = [6, 6, 6, 6];
  game.dice.b = [1, 1, 1, 1];
  now = game.revealAt;
  const revealed = presence('a').game;
  assert.equal(revealed.winnerId, 'a');
  assert.equal(revealed.pot, 1300);
  assert.equal(revealed.players.find((p) => p.id === 'b').sum, 4);
  assert.equal(db.users[0].points.current, 10800);
  assert.equal(db.users[1].points.current, 9200);
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
  assert.equal(db.diceGames.at(-1).matchNumber, 2);
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
  decide('b', waitingGame, 'die');
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
        decide('b', test, 'call', 5);
        now += 1800;
        decide('a', test, 'call', 2);
        decide('b', test, 'call', 4);
        test.dice.a = [1, 2, 3, 4];
        test.dice.b = [4, 3, 2, 1];
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
  db.users[0].points.current = 1000;
  assert.throws(() => decide('a', poor, 'call', 5), { status: 400 });
  assert.equal(db.users[0].points.current, 1000);
  db = make();
  const minimum = accept(invite());
  for (const round of [1, 2, 3]) {
    assert.throws(() => decide('a', minimum, 'call', 0, round === 1 ? 2 : round), {
      status: round === 1 ? 409 : 400,
    });
    decide('a', minimum, 'call', 1);
    decide('b', minimum, 'call', 1);
    now += 1800;
  }
  assert.equal(minimum.status, 'revealing');
  assert.deepEqual(
    minimum.bets,
    { a: 300, b: 300 },
    'Every betting turn accepts the minimum stake',
  );
  for (const turn of [1, 2, 3]) {
    for (const choices of [
      ['die', 'die'],
      ['die', 'call'],
      ['call', 'die'],
    ]) {
      for (const order of [
        ['a', 'b'],
        ['b', 'a'],
      ]) {
        db = make();
        const test = accept(invite());
        while (test.round < turn) {
          decide('a', test, 'call', 2);
          decide('b', test, 'call', 3);
          now += 1800;
        }
        const prior = { ...test.bets };
        const choose = (id) => decide(id, test, choices[id === 'a' ? 0 : 1], id === 'a' ? 2 : 5);
        choose(order[0]);
        assert.equal(test.status, 'playing', 'First DIE waits for both decisions');
        const peerView = presence(order[1]).game;
        assert.equal(peerView.players.find((p) => p.id === order[0]).decision, 'locked');
        assert.equal(peerView.players.find((p) => p.id === order[0]).bet, prior[order[0]]);
        assert.equal(
          peerView.pot,
          prior.a + prior.b,
          'Pending CALL amounts cannot disclose a choice',
        );
        choose(order[1]);
        const winner = choices[0] === choices[1] ? null : choices[0] === 'call' ? 'a' : 'b';
        assert.equal(test.winnerId, winner);
        assert.equal(test.status, 'finished');
        assert.equal(presence('a').game.pot, prior.a + prior.b, 'Only earlier turns are contested');
        assert.equal(
          db.users[0].points.current,
          winner === 'a' ? 10000 + prior.b : winner === 'b' ? 10000 - prior.a : 10000,
        );
        assert.equal(db.users[1].points.current, 20000 - db.users[0].points.current);
        const entries = db.pointLedger.length;
        choose(order[1]);
        settleDiceGames(db, now);
        assert.equal(db.pointLedger.length, entries, 'Retry cannot repeat refunds or payout');
      }
    }
  }
  db = make();
  const dieTimeout = accept(invite());
  decide('a', dieTimeout, 'die');
  now = dieTimeout.deadlineAt;
  settleDiceGames(db, now);
  assert.equal(dieTimeout.winnerId, null, 'DIE plus an unanswered turn is a draw');
  assert.equal(dieTimeout.autoContinue, false);
  db = make();
  const cancellable = invite();
  const cancel = (id = 'a') => call(id, 'cancel', { gameId: cancellable.id });
  assert.throws(() => cancel('c'), { status: 404 });
  assert.throws(() => cancel('b'), { status: 403 });
  const cancelled = cancel();
  assert.equal(cancelled.game.status, 'cancelled');
  assert.equal(cancelled.game.autoContinue, false);
  assert.ok(cancelled.online.every((user) => !user.busy));
  assert.equal(presence('b', 'site').game.status, 'cancelled');
  assert.equal(cancel().game.revision, cancelled.game.revision, 'Cancel retries are idempotent');
  assert.throws(() => call('b', 'accept', { gameId: cancellable.id }), { status: 409 });
  assert.throws(() => call('a', 'invite', { tabId: 'a'.repeat(20), targetId: 'b', stake: 100 }), {
    status: 429,
  });
  assert.ok(db.users.every((user) => user.points.current === 10000));
  assert.equal(db.pointLedger.length, 0, 'Invitation cancellation never moves points');
  const replacement = invite();
  assert.equal(cancel().game.id, replacement.id, 'A late retry cannot cancel a new invitation');
  assert.equal(presence('b').game.status, 'invited');
  const accepted = accept(replacement);
  assert.throws(() => call('a', 'cancel', { gameId: accepted.id }), { status: 409 });
  assert.equal(accepted.status, 'playing', 'Accept winning the race keeps the game running');
  assert.equal(accepted.autoContinue, true);
  for (const round of [1, 2, 3]) {
    db = make();
    const limited = accept(invite());
    while (limited.round < round) {
      decide('a', limited, 'call', 1);
      decide('b', limited, 'call', 1);
      now += 1800;
    }
    const multiplier = round === 1 ? 1 : round === 2 ? 5 : 10;
    const amount = limited.stake * multiplier;
    if (round > 1) {
      db.users[0].points.current = amount - 1;
      const entries = db.pointLedger.length;
      const previousBet = limited.bets.a;
      assert.throws(() => decide('a', limited, 'call', multiplier), { status: 400 });
      assert.equal(db.users[0].points.current, amount - 1);
      assert.equal(db.pointLedger.length, entries);
      assert.equal(limited.bets.a, previousBet, 'An unaffordable multiple cannot enter the pot');
      assert.equal(limited.actions[round].a, undefined, 'An affordable minimum does not auto-DIE');
    }
    db.users[0].points.current = amount;
    decide('a', limited, 'call', multiplier);
    decide('a', limited, 'call', multiplier);
    assert.equal(db.users[0].points.current, 0, 'Exact-balance CALL succeeds only once');
    assert.equal(limited.actions[round].a.choice, 'call', 'A paid CALL survives an empty wallet');
  }
  for (const round of [1, 2, 3]) {
    for (const peerChoice of ['call', 'die', 'poor']) {
      db = make();
      const limited = accept(invite());
      while (limited.round < round) {
        decide('a', limited, 'call', 1);
        decide('b', limited, 'call', 1);
        now += 1800;
      }
      const prior = { ...limited.bets };
      db.users[0].points.current = 99;
      if (peerChoice === 'poor') db.users[1].points.current = 0;
      const total =
        db.users.reduce((sum, user) => sum + user.points.current, 0) + prior.a + prior.b;
      assert.equal(
        settleDiceGames(db, now),
        true,
        'A heartbeat can automatically fold poor players',
      );
      assert.deepEqual(limited.actions[round].a, { choice: 'die', reason: 'points' });
      assert.equal(limited.autoContinue, false);
      assert.equal(limited.stopReason, 'points');
      if (peerChoice !== 'poor') {
        assert.equal(limited.status, 'playing', 'Keep the peer choice to preserve both-DIE draws');
        const ownView = presence('a').game.players.find((p) => p.id === 'a');
        assert.equal(ownView.decisionReason, 'points');
        const hiddenView = presence('b').game.players.find((p) => p.id === 'a');
        assert.equal(hiddenView.decision, 'locked');
        assert.equal(hiddenView.decisionReason, null);
        decide('b', limited, peerChoice, 2);
      }
      assert.equal(limited.status, 'finished', 'Auto-DIE does not wait for the selection timeout');
      assert.equal(limited.reason, 'points');
      assert.equal(limited.winnerId, peerChoice === 'call' ? 'b' : null);
      assert.deepEqual(limited.bets, prior, 'The current CALL is refunded before settlement');
      assert.equal(db.users[0].points.current, 99 + (peerChoice === 'call' ? 0 : prior.a));
      assert.equal(
        db.users.reduce((sum, user) => sum + user.points.current, 0),
        total,
      );
      const entries = db.pointLedger.length;
      decide('a', limited, 'die');
      assert.equal(settleDiceGames(db, now), false);
      assert.equal(db.pointLedger.length, entries, 'Auto-DIE settlement cannot pay twice');
      db = JSON.parse(JSON.stringify(db));
      assert.equal(presence('a').game.reason, 'points', 'Auto-DIE survives a reload');
      now += 5000;
      assert.equal(presence('a').game, null, 'The ended series returns to the lobby');
      assert.equal(db.diceGames.length, 1, 'Refunded funds do not restart a stopped series');
      unchangedTotals();
    }
  }
  for (const both of [false, true]) {
    db = make();
    const depleted = accept(invite());
    db.users[0].points.current = 100;
    if (both) db.users[1].points.current = 100;
    decide('a', depleted, 'call', 1);
    assert.equal(presence('a').game.players[0].decision, 'call');
    decide('b', depleted, 'call', 1);
    assert.equal(depleted.round, 2);
    assert.equal(
      depleted.actions[2].a.choice,
      'die',
      'A new betting turn checks remaining funds immediately',
    );
    if (!both) {
      now = depleted.readyAt;
      decide('b', depleted, 'call', 1);
    }
    assert.equal(depleted.status, 'finished');
    assert.equal(depleted.winnerId, both ? null : 'b');
  }
  db = make();
  const lastCall = accept(invite());
  db.users[0].points.current = db.users[1].points.current = 300;
  for (const round of [1, 2, 3]) {
    decide('a', lastCall, 'call', 1);
    decide('b', lastCall, 'call', 1);
    now += 1800;
  }
  assert.equal(lastCall.status, 'revealing', 'No further bet is needed for the fourth die');
  assert.ok(db.users.slice(0, 2).every((user) => user.points.current === 0));
  now = lastCall.revealAt;
  settleDiceGames(db, now);
  assert.equal(lastCall.reason, 'showdown', 'Fully paid games still finish by dice totals');
  db = make();
  const peer = () => presence('a').online.find((user) => user.id === 'b');
  assert.equal(peer().focused, false, 'A login session alone is not foreground presence');
  presence('b', 'site');
  assert.equal(peer().focused, true, 'Any focused site page counts, not just the game');
  now += 15000;
  assert.equal(peer().focused, false, 'Closed or disconnected tabs expire');
  const presenceBody = { tabId: 'b'.repeat(20), page: 'site', visible: true };
  call('b', 'presence', { ...presenceBody, focused: true, sequence: 1 });
  assert.equal(peer().focused, true);
  call('b', 'presence', { ...presenceBody, focused: false, sequence: 3 });
  call('b', 'presence', { ...presenceBody, focused: true, sequence: 2 });
  assert.equal(peer().focused, false, 'A late focus request cannot undo a newer blur');
  call('b', 'presence', { ...presenceBody, visible: false, focused: true, sequence: 4 });
  assert.equal(peer().focused, false, 'A hidden tab never counts as focused');
  call('b', 'presence', { ...presenceBody, tabId: 'second-b-tab-12345678', focused: true });
  assert.equal(peer().focused, true, 'Another focused tab keeps the member available');
  call('b', 'presence', {
    ...presenceBody,
    tabId: 'second-b-tab-12345678',
    page: 'away',
    focused: false,
  });
  assert.equal(peer().focused, false, 'Leaving a non-game page releases presence');
  assert.throws(() => call('b', 'presence', { ...presenceBody, sequence: -1 }), { status: 400 });
  db = make();
  assert.equal(presence('a').skin, 'helldiver');
  for (const skin of ['helldiver', 'super-earth', 'eagle', 'automaton']) {
    assert.equal(call('a', 'skin', { skin, userId: 'b' }).skin, skin);
    assert.equal(db.users[0].diceSkin, skin);
    assert.equal(
      db.users[1].diceSkin,
      undefined,
      'Skin updates only affect the authenticated user',
    );
  }
  assert.throws(() => call('a', 'skin', { skin: 'invalid' }), { status: 400 });
  assert.throws(
    () =>
      handleDiceGame(
        db,
        { ...db.users[0], actualRole: 'admin' },
        ['games', 'dice', 'skin'],
        'POST',
        { skin: 'eagle' },
      ),
    { status: 403 },
  );
  db = JSON.parse(JSON.stringify(db));
  assert.equal(presence('a').skin, 'automaton', 'Skin survives stored-state reload');
  const styled = accept(invite());
  const beforeSkin = JSON.stringify({
    game: styled,
    points: db.users.map((u) => u.points),
    ledger: db.pointLedger,
  });
  call('a', 'skin', { skin: 'eagle' });
  assert.equal(
    JSON.stringify({ game: styled, points: db.users.map((u) => u.points), ledger: db.pointLedger }),
    beforeSkin,
    'Changing skins never rerolls, changes deadlines or moves points',
  );
  const styledPeer = presence('b').game.players.find((p) => p.id === 'a');
  assert.equal(styledPeer.skin, 'eagle');
  assert.deepEqual(styledPeer.dice, [null], 'Sharing a skin does not expose private dice');
  call('a', 'stop', { gameId: styled.id });
  decide('a', styled, 'die');
  decide('b', styled, 'die');
  now = styled.finishedAt + 4999;
  assert.equal(presence('a').game.id, styled.id, 'Final result remains briefly visible');
  now++;
  assert.equal(
    presence('a').game,
    null,
    'A fully finished series returns to the lobby after five seconds',
  );
  assert.equal(presence('b').game, null);
  db = JSON.parse(JSON.stringify(db));
  now += 60000;
  assert.equal(presence('a').game, null, 'Reloading does not revive a finished game');
  assert.equal(db.diceGames.length, 1, 'Stored match history is retained');
  assert.equal(presence('a').skin, 'eagle');
  console.log(
    'PASS: dice invitations/cancellation, foreground presence and stale-event ordering, exact/insufficient balances, private rolls, atomic bets/settlement, automatic rounds, stop/navigation/deadline races, refresh recovery, disconnect/timeout/low-balance termination',
  );
} finally {
  Date.now = originalNow;
  await fs.rm(directory, { recursive: true, force: true });
}
