import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import {
  rpsChoices,
  rpsOutcome,
  rpsMultiplier,
  rpsRewards,
  rpsOpponent,
  rpsOutcomeTickets,
} from '../src/lib/rps-rules.mjs';
import {
  rpsAttempts,
  awardRpsPostAttempt,
  consumeRpsAttempt,
} from '../src/lib/server/rps-attempts.mjs';

const counts = Array(10).fill(0);
for (let ticket = 0; ticket < 1000; ticket++) counts[rpsMultiplier(ticket) - 1]++;
assert.deepEqual(
  counts,
  rpsRewards.map((item) => item.weight),
);
assert.equal(counts[0], 200);
assert.equal(counts[1], 300);
assert.equal(counts[9], 10);
assert.ok(counts.every((count, i) => i < 2 || count < counts[i - 1]));
for (const mine of rpsChoices) {
  assert.deepEqual(rpsChoices.map((opponent) => rpsOutcome(mine.id, opponent.id)).sort(), [
    'draw',
    'lose',
    'win',
  ]);
}
const directory = await fs.mkdtemp(path.resolve('work/rps-domain-'));
try {
  const outfile = path.join(directory, 'rps.cjs');
  await build({
    entryPoints: ['src/lib/server/rps-game.js'],
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
  const { handleRpsGame } = createRequire(import.meta.url)(outfile);
  let now = Date.parse('2026-11-04T14:30:00Z');
  const db = {
    users: ['a', 'b'].map((id) => ({
      id,
      status: 'active',
      points: { current: 10000, total: 10000 },
    })),
    posts: [],
  };
  const actor = db.users[0];
  const read = (user = actor, requestId) =>
    handleRpsGame(
      db,
      user,
      ['games', 'rps'],
      'GET',
      {},
      new URLSearchParams(requestId ? { requestId } : {}),
      { now },
    );
  const play = (outcomeTicket = 0, ticket = 999, extra = {}, user = actor) => {
    const randoms = [outcomeTicket, ticket];
    return handleRpsGame(
      db,
      user,
      ['games', 'rps', 'play'],
      'POST',
      { requestId: randomUUID(), stake: 100, choice: 'rock', ...extra },
      undefined,
      { now, randomInt: () => randoms.shift() },
    );
  };
  assert.equal(read().attempts.total, 5);
  assert.equal(actor.rps, undefined, 'Reading the daily allowance does not write user state');
  let result = play();
  assert.equal(result.round.outcome, 'win');
  assert.equal(result.round.multiplier, 10);
  assert.equal(result.points.current, 10900);
  assert.equal(result.points.total, 10000);
  assert.equal(result.attempts.daily, 4);
  const retry = { requestId: result.round.requestId };
  assert.deepEqual(
    play(6000, 0, retry),
    result,
    'Identical retry returns the committed result without charging',
  );
  assert.equal(db.pointLedger.length, 2);
  assert.throws(() => play(0, 0, { ...retry, stake: 500 }), { status: 409 });
  assert.throws(() => play(), { status: 429 });
  assert.equal(
    read(db.users[1], retry.requestId).round,
    null,
    'Another user cannot retrieve a round',
  );
  assert.ok(!('userId' in result.round));
  now += 2000;
  result = play(3000);
  assert.equal(result.round.outcome, 'draw');
  assert.equal(result.round.profit, 0);
  assert.equal(result.points.current, 10900);
  assert.equal(result.attempts.daily, 4);
  now += 2000;
  result = play(0, 0);
  assert.equal(result.round.multiplier, 1);
  assert.equal(result.round.profit, 0, 'One times includes the original stake');
  assert.equal(result.attempts.daily, 3);
  now += 2000;
  result = play(6000, 999, { multiplier: 10, outcome: 'win', payout: 1000000, handLevel: 20 });
  assert.equal(result.round.outcome, 'lose');
  assert.equal(
    result.points.current,
    10800,
    'Client result and payout fields do not control settlement',
  );
  assert.equal(result.attempts.daily, 2);
  now += 2000;
  for (const stake of [0, -100, 10, 101, 100.5, '100', Number.MAX_SAFE_INTEGER])
    assert.throws(() => play(0, 0, { stake }), { status: 400 });
  assert.throws(() => play(0, 0, { choice: 'lizard' }), { status: 400 });
  assert.throws(() => play(0, 0, { requestId: 'bad' }), { status: 400 });
  assert.throws(() => play(0, 0, {}, { ...actor, actualRole: 'operator' }), { status: 403 });
  actor.points.current = 49;
  const ledgerCount = db.pointLedger.length;
  assert.throws(() => play(0, 0, { stake: 50 }), { status: 400 });
  assert.equal(db.pointLedger.length, ledgerCount);
  actor.points.current = 10000;
  db.posts.push(
    { id: 'draft', authorId: actor.id, status: 'draft' },
    { id: 'published', authorId: actor.id },
  );
  awardRpsPostAttempt(db, 'draft');
  assert.equal(read().attempts.bonus, 0);
  awardRpsPostAttempt(db, 'published');
  awardRpsPostAttempt(db, 'published');
  assert.equal(read().attempts.bonus, 1, 'A post can grant only once');
  db.posts[0].status = 'published';
  awardRpsPostAttempt(db, 'draft');
  assert.equal(read().attempts.bonus, 2);
  for (let i = 0; i < 2; i++) {
    now += 2000;
    result = play(6000);
  }
  assert.equal(result.attempts.daily, 0);
  assert.equal(result.attempts.bonus, 2, 'Daily attempts are used before saved attempts');
  now += 2000;
  result = play(3000);
  assert.equal(result.attempts.bonus, 2, 'A draw preserves a saved attempt too');
  now += 2000;
  result = play(6000);
  assert.equal(result.round.attemptSource, 'bonus');
  assert.equal(result.attempts.bonus, 1);
  now = Date.parse('2026-11-04T15:00:00Z');
  assert.equal(read().attempts.daily, 5, 'KST midnight refills to five');
  assert.equal(read().attempts.bonus, 1);
  consumeRpsAttempt(actor, now);
  now += 86400000 * 3;
  assert.equal(read().attempts.daily, 5, 'Daily attempts never accumulate across days');
  assert.equal(read().attempts.bonus, 1);
  actor.rps = { day: rpsAttempts(actor, now).day, dailyUsed: 5, bonus: 0 };
  assert.throws(() => play(), { status: 409 });
  assert.equal(
    play(0, 0, retry).round.requestId,
    retry.requestId,
    'Retries work even after attempts are exhausted',
  );
  assert.equal(read().history.length, 5);
  assert.equal(actor.points.total, 10000);
  // Exhaust the server's complete outcome sample space for each hand and stake.
  // Exhaust tier boundaries against independent expected weights (not the production formula).
  assert.equal(rpsOutcomeTickets, 9000);
  for (const [level, win, draw, lose] of [
    [0, 3000, 3000, 3000],
    [1, 3090, 2968, 2942],
    [5, 3450, 2840, 2710],
    [6, 3585, 2792, 2623],
    [10, 4125, 2600, 2275],
    [11, 4305, 2536, 2159],
    [15, 5025, 2280, 1695],
    [16, 5295, 2184, 1521],
    [20, 6375, 1800, 825],
  ]) {
    for (const choice of rpsChoices) {
      for (const stake of [50, 100, 500, 1000]) {
        const outcomes = { win: 0, draw: 0, lose: 0 };
        for (let ticket = 0; ticket < 9000; ticket++) {
          const player = {
            id: 'probability-test',
            status: 'active',
            points: { current: 10000, total: 10000 },
            rpsHand: { level, version: 0 },
          };
          const isolated = { users: [player] };
          const limits = [];
          const settled = handleRpsGame(
            isolated,
            player,
            ['games', 'rps', 'play'],
            'POST',
            { requestId: randomUUID(), choice: choice.id, stake },
            undefined,
            {
              now,
              randomInt: (limit) => {
                limits.push(limit);
                return limits.length === 1 ? ticket : 999;
              },
            },
          );
          const round = settled.round;
          outcomes[round.outcome]++;
          assert.equal(rpsOutcome(choice.id, round.opponent), round.outcome);
          assert.deepEqual(limits, round.outcome === 'win' ? [9000, 1000] : [9000]);
          assert.equal(round.handLevel, level);
          assert.equal(
            settled.points.current,
            10000 + (round.outcome === 'win' ? stake * 9 : round.outcome === 'lose' ? -stake : 0),
          );
          assert.equal(settled.attempts.daily, round.outcome === 'draw' ? 5 : 4);
        }
        assert.deepEqual(outcomes, { win, draw, lose });
      }
    }
  }
  for (const ticket of [-1, 9000, 1.5, NaN])
    assert.throws(() => rpsOpponent('rock', ticket), /Invalid outcome ticket/);
  console.log(
    'PASS: RPS balanced 1/1.5/2/3pp tier boundaries and draw/loss reductions across all hands/stakes; rewards, wallet settlement, attempts, retries and forged requests',
  );
} finally {
  // The only removed path is the temporary directory created inside this workspace above.
  await fs.rm(directory, { recursive: true, force: true });
}
