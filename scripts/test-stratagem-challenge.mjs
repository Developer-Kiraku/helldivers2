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
    [100, 150, 220, 320, 450, 650, 900, 1200, 1500, 2000],
  );
  assert.ok(challengeStages.every((stage) => stage.commands >= 5));
  assert.deepEqual(
    challengeStages.map((stage) => stage.commands),
    [5, 6, 7, 8, 9, 10, 11, 12, 13, 15],
  );
  for (const [index, stage] of challengeStages.entries()) {
    const candidates = stratagemCommands.filter(
      ({ code }) => code.length >= stage.minLength && code.length <= stage.maxLength,
    );
    assert.ok(candidates.length >= 2, 'Every stage can avoid consecutive duplicate commands');
    if (index > 0) {
      const previous = challengeStages[index - 1];
      assert.ok(
        stage.seconds / stage.commands < previous.seconds / previous.commands,
        'Time per command decreases at every stage',
      );
    }
  }
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
  const start = () =>
    call('start', {
      requestId: randomUUID(),
      payout: 99999,
      stage: 7,
      stages: [{ commands: 1, payout: 99999 }],
    });
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
  for (let count = 1; count < 5; count++) {
    state.run = answer(state.run);
    assert.equal(state.run.completed, count);
    assert.equal(state.run.status, 'playing', 'A stage cannot finish before the fifth command');
    assert.throws(() => call('cashout', { runId: state.run.id }), { status: 409 });
  }
  state.run = answer(state.run);
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
  for (let stage = 1; stage <= challengeStages.length; stage++) {
    run = checkpoint(run);
    assert.equal(run.stage, stage);
    if (stage < challengeStages.length) {
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
  assert.equal(run.stage, 10);
  assert.equal(run.payout, 2000);
  assert.equal(db.stratagemRuns[0].receipts.length, 96);
  assert.equal(call().points.current, 2900);
  assert.equal(call().points.total, 2000);
  assert.equal(db.pointLedger.length, 2);
  assert.equal(call('cashout', { runId: run.id }).points.current, 2900);
  // Seven-stage runs already in progress must still finish and pay out under their saved rules.
  db = make();
  start();
  const savedStages = challengeStages.slice(0, 7).map((stage, index) => ({
    ...stage,
    commands: [5, 5, 6, 7, 8, 9, 10][index],
    seconds: [25, 24, 26, 28, 28, 27, 25][index],
  }));
  db.stratagemRuns[0].stages = savedStages;
  db.stratagemRuns[0].deadlineAt = now + savedStages[0].seconds * 1000;
  db = JSON.parse(JSON.stringify(db));
  run = call().run;
  assert.deepEqual(run.stages, savedStages);
  for (let stage = 1; stage <= savedStages.length; stage++) {
    assert.equal(run.deadlineAt - run.readyAt, savedStages[stage - 1].seconds * 1000);
    run = checkpoint(run);
    if (stage < savedStages.length) run = call('continue', { runId: run.id, stage }).run;
  }
  assert.equal(run.status, 'completed');
  assert.equal(run.stage, 7);
  assert.equal(run.payout, 900);
  assert.equal(db.stratagemRuns[0].receipts.length, 50);
  assert.equal(call().points.current, 1800);
  db = make();
  start();
  db.stratagemRuns[0].stages = challengeStages.map((stage, index) => ({
    ...stage,
    commands: [5, 5, 6, 7, 8, 9, 10, 11, 12, 13][index],
    seconds: [24, 22, 24, 25, 25, 24, 22, 23, 23, 23][index],
  }));
  run = call().run;
  for (let stage = 1; stage <= 10; stage++) {
    run = checkpoint(run);
    if (stage < 10) run = call('continue', { runId: run.id, stage }).run;
  }
  assert.equal(run.status, 'completed');
  assert.equal(run.completed, 13, 'Existing ten-stage games keep their old final target');
  assert.equal(db.stratagemRuns[0].receipts.length, 86);
  assert.equal(run.payout, 2000);
  // One prefetched command removes network waits without accepting skipped or instant inputs.
  db = make();
  run = start().run;
  assert.ok(run.nextCommand);
  assert.notEqual(run.command.id, run.nextCommand.id);
  const first = run.command,
    second = run.nextCommand;
  now += 500;
  assert.throws(() => call('answer', { runId: run.id, token: second.token, answer: second.code }), {
    status: 409,
  });
  run = call('answer', { runId: run.id, token: first.token, answer: first.code }).run;
  assert.deepEqual(run.command, second);
  const third = run.nextCommand;
  // The player may have already typed the prefetched command before the first response arrived.
  run = call('answer', { runId: run.id, token: second.token, answer: second.code }).run;
  assert.equal(run.completed, 2);
  assert.deepEqual(run.command, third);
  assert.equal(
    call('answer', { runId: run.id, token: first.token, answer: first.code }).run.completed,
    2,
  );
  now = db.stratagemRuns[0].inputAfter;
  assert.throws(
    () => call('answer', { runId: run.id, token: run.command.token, answer: run.command.code }),
    { status: 409 },
  );
  run = checkpoint(run);
  assert.equal(run.nextCommand, null, 'No preview leaks into the next stage');
  assert.equal(run.command, null);
  // Stored runs from before the balance change keep their original counts and rewards.
  db = make();
  start();
  delete db.stratagemRuns[0].stages;
  run = call().run;
  assert.equal(run.stages[0].commands, 1);
  assert.equal(answer(run).status, 'checkpoint');
  run = call('continue', { runId: run.id, stage: 1 }).run;
  assert.equal(run.deadlineAt - run.readyAt, 11000);
  run = checkpoint(run);
  assert.equal(run.completed, 2);
  assert.equal(call('cashout', { runId: run.id }).run.payout, 120);
  assert.equal(call().points.current, 1020);
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
  for (const stageTarget of [1, 3, 5, 7, 10]) {
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
    'PASS: stratagem codes, ten-stage progression/rewards, saved seven-stage runs, timers, ownership, funds, reset/retries and unchanged cumulative points',
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
