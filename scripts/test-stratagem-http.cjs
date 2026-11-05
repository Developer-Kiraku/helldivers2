const assert = require('node:assert/strict');
const { randomUUID } = require('node:crypto');
module.exports = async ({ guest, member, admin }) => {
  const base = '/api/games/stratagem';
  await guest.call('/games/stratagem', 'GET', undefined, 307);
  await guest.call(base, 'GET', undefined, 401);
  const before = (await member.call(base)).data.points;
  const packet = { requestId: randomUUID(), stage: 7, payout: 999999, userId: 'u-admin' };
  await member.call(base + '/start', 'POST', packet, 403, { Origin: 'https://example.invalid' });
  const starts = await Promise.all([
    member.call(base + '/start', 'POST', packet),
    member.call(base + '/start', 'POST', packet),
  ]);
  let run = starts[0].data.run;
  assert.equal(starts[1].data.run.id, run.id);
  assert.equal(run.stage, 1);
  assert.equal(starts[1].data.points.current, before.current - 100);
  await admin.call(base + '/cashout', 'POST', { runId: run.id }, 404);
  await member.call(base + '/cashout', 'POST', { runId: run.id }, 409);
  const wait = (ms) => new Promise((resolve) => setTimeout(resolve, Math.max(0, ms)));
  for (let stage = 1; stage <= 3; stage++) {
    await wait(run.readyAt - Date.now() + 300);
    while (run.status === 'playing') {
      const body = { runId: run.id, token: run.command.token, answer: run.command.code };
      const answers = await Promise.all([
        member.call(base + '/answer', 'POST', body),
        member.call(base + '/answer', 'POST', body),
      ]);
      run = answers[0].data.run;
      assert.equal(answers[1].data.run.completed, run.completed);
      if (run.status === 'playing') await wait(300);
    }
    assert.equal(run.status, 'checkpoint');
    const reloaded = (await member.call(base)).data.run;
    assert.equal(reloaded.id, run.id);
    assert.equal(reloaded.stage, stage);
    if (stage < 3) {
      const continues = await Promise.all([
        member.call(base + '/continue', 'POST', { runId: run.id, stage }),
        member.call(base + '/continue', 'POST', { runId: run.id, stage }),
      ]);
      run = continues[0].data.run;
      assert.equal(continues[1].data.run.deadlineAt, run.deadlineAt);
    }
  }
  const paid = await Promise.all([
    member.call(base + '/cashout', 'POST', { runId: run.id, payout: 90000 }),
    member.call(base + '/cashout', 'POST', { runId: run.id }),
  ]);
  assert.equal(paid[0].data.run.payout, 150);
  assert.equal(paid[1].data.points.current, before.current + 50);
  assert.equal(paid[1].data.points.total, before.total);
  assert.equal((await member.call(base)).data.run.status, 'cashed');
  console.log(
    'PASS: stratagem HTTP login/CSRF, owner isolation, concurrent entry/answer/continue/payout deduplication, refresh and server-priced reward',
  );
};
