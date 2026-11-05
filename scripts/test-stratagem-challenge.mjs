import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { challengeStages } from '../src/lib/stratagem-challenge.mjs';
import { stratagemCommands } from '../src/lib/stratagem-codes.mjs';
const directory = await fs.mkdtemp(path.resolve('work/stratagem-test-'));
try {
  for (const command of stratagemCommands) {
    await fs.access(path.join('public', command.src));
    assert.match(command.code, /^[UDLR]{3,8}$/);
  }
  assert.deepEqual(
    challengeStages.map((stage) => stage.payout),
    [100, 120, 150, 200, 250, 320, 400],
  );
  const outfile = path.join(directory, 'game.cjs');
  await build({
    entryPoints: ['src/lib/server/stratagem-challenge.js'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'auth',
        setup(builder) {
          builder.onResolve({ filter: /\/auth$/ }, () => ({ path: 'auth', namespace: 'stub' }));
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents:
              'export function fail(status,message){throw Object.assign(new Error(message),{status});}',
          }));
        },
      },
    ],
  });
  const { handleStratagemChallenge: handle } = createRequire(import.meta.url)(outfile);
  let now = 200000;
  const make = () => ({
    users: ['a', 'b'].map((id) => ({ id, points: { current: 1000, total: 2000 } })),
    pointLedger: [],
  });
  let db = make();
  const call = (action = '', input = {}, id = 'a') =>
    handle(
      db,
      db.users.find((u) => u.id === id),
      ['games', 'stratagem', ...(action ? [action] : [])],
      action ? 'POST' : 'GET',
      input,
      { now, randomInt: () => 0 },
    );
  const start = () => call('start', { requestId: randomUUID(), payout: 99999, stage: 7 });
  const answer = (run) => {
    now = Math.max(now + 500, run.readyAt + 500);
    const packet = { runId: run.id, token: run.command.token, answer: run.command.code };
    const result = call('answer', packet);
    const entries = db.pointLedger.length;
    assert.deepEqual(call('answer', packet), result);
    assert.equal(db.pointLedger.length, entries);
    return result.run;
  };
  const checkpoint = (run) => {
    while (run.status === 'playing') run = answer(run);
    return run;
  };
  const firstId = randomUUID();
  let state = call('start', { requestId: firstId });
  assert.equal(state.points.current, 900);
  assert.equal(state.run.stage, 1);
  assert.equal(state.run.readyAt, now, 'Input opens immediately when a stage starts');
  assert.equal(state.run.deadlineAt, now + challengeStages[0].seconds * 1000);
  assert.equal(state.run.receipts, undefined);
  assert.equal(state.run.userId, undefined);
  assert.deepEqual(call('start', { requestId: firstId }), state);
  assert.equal(db.pointLedger.length, 1);
  assert.throws(start, { status: 409 });
  assert.throws(() => call('cashout', { runId: state.run.id }, 'b'), { status: 404 });
  assert.throws(() => call('cashout', { runId: state.run.id }), { status: 409 });
  assert.throws(
    () =>
      call('answer', {
        runId: state.run.id,
        token: state.run.command.token,
        answer: state.run.command.code,
      }),
    { status: 409 },
  );
  now = state.run.readyAt + 500;
  assert.throws(
    () => call('answer', { runId: state.run.id, token: state.run.command.token, answer: 'UUU' }),
    { status: 400 },
  );
  state.run = checkpoint(state.run);
  assert.equal(state.run.status, 'checkpoint');
  now += 86400000;
  assert.equal(call().run.status, 'checkpoint', 'Choosing a reward has no time limit');
  db = JSON.parse(JSON.stringify(db));
  assert.equal(call().run.id, state.run.id);
  const claimed = call('cashout', { runId: state.run.id, payout: 999999 });
  assert.equal(claimed.points.current, 1000);
  assert.equal(claimed.points.total, 2000);
  assert.equal(claimed.run.payout, 100);
  assert.deepEqual(call('cashout', { runId: state.run.id }), claimed);
  db = make();
  let run = start().run;
  for (let stage = 1; stage <= 7; stage++) {
    run = checkpoint(run);
    assert.equal(run.stage, stage);
    if (stage < 7) {
      run = call('continue', { runId: run.id, stage }).run;
      const deadline = run.deadlineAt;
      assert.equal(
        call('continue', { runId: run.id, stage }).run.deadlineAt,
        deadline,
        'Retries never extend time',
      );
      assert.ok(run.command.code.length >= challengeStages[stage].minLength);
    }
  }
  assert.equal(run.status, 'completed');
  assert.equal(run.payout, 400);
  assert.equal(call().points.current, 1300);
  assert.equal(call().points.total, 2000);
  assert.equal(db.pointLedger.length, 2);
  assert.equal(call('cashout', { runId: run.id }).points.current, 1300);
  for (const status of ['playing', 'checkpoint', 'cashed', 'completed', 'failed']) {
    db = make();
    run = start().run;
    if (status === 'checkpoint' || status === 'cashed') run = checkpoint(run);
    if (status === 'cashed') run = call('cashout', { runId: run.id }).run;
    if (status === 'completed' || status === 'failed') {
      Object.assign(db.stratagemRuns[0], { status, payout: status === 'completed' ? 400 : 0 });
    }
    assert.throws(() => call('reset', { runId: run.id }, 'b'), { status: 404 });
    const reset = call('reset', { runId: run.id });
    assert.equal(reset.run, null);
    assert.equal(reset.points.current, ['checkpoint', 'cashed'].includes(status) ? 1000 : 900);
    assert.equal(reset.points.total, 2000);
    assert.deepEqual(call('reset', { runId: run.id }), reset);
    const newer = start().run;
    call('reset', { runId: run.id });
    assert.equal(call().run.id, newer.id, 'Delayed reset must not cancel a newer challenge');
    assert.equal(call().run.status, 'playing');
  }
  db = make();
  run = checkpoint(start().run);
  const replacementId = randomUUID();
  const replacement = call('start', { requestId: replacementId, replacePrevious: true });
  assert.equal(
    replacement.points.current,
    900,
    'An unseen old checkpoint settles before a fresh entry',
  );
  assert.equal(db.stratagemRuns[0].status, 'cashed');
  assert.deepEqual(call('start', { requestId: replacementId, replacePrevious: true }), replacement);
  assert.equal(db.pointLedger.length, 3, 'Replacement retries charge only once');
  for (const stageTarget of [1, 3, 5]) {
    db = make();
    run = start().run;
    while (run.stage < stageTarget) {
      run = checkpoint(run);
      run = call('continue', { runId: run.id, stage: run.stage }).run;
    }
    const oldDeadline = run.deadlineAt;
    db = JSON.parse(JSON.stringify(db));
    assert.equal(call().run.deadlineAt, oldDeadline, 'Refresh cannot reset a running timer');
    now = oldDeadline;
    const failed = call('answer', {
      runId: run.id,
      token: run.command.token,
      answer: run.command.code,
    });
    assert.equal(failed.run.status, 'failed');
    assert.equal(failed.run.payout, 0);
    assert.equal(failed.points.current, 900);
    assert.throws(() => call('cashout', { runId: run.id }), { status: 409 });
  }
  db = make();
  db.users[0].points.current = 99;
  assert.throws(start, { status: 400 });
  db.users[0].points.current = 100;
  assert.equal(start().points.current, 0);
  assert.throws(
    () =>
      handle(
        db,
        { ...db.users[0], actualRole: 'operator' },
        ['games', 'stratagem', 'start'],
        'POST',
        { requestId: randomUUID() },
        { now },
      ),
    { status: 403 },
  );
  console.log(
    'PASS: stratagem icons/codes, server timers, command order, ownership, exact/low funds, resume, cashout/continue retries, seven-stage rewards and unchanged cumulative points',
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
