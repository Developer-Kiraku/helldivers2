import assert from 'node:assert/strict';
import { build } from 'esbuild';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import fs from 'node:fs/promises';
import path from 'node:path';
import { rpsHandStages } from '../src/lib/rps-enhancement.mjs';

const directory = await fs.mkdtemp(path.resolve('work/rps-enhancement-'));
try {
  const outfile = path.join(directory, 'domain.cjs');
  await build({
    entryPoints: ['src/lib/server/rps-enhancement.js'],
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
  const { handleRpsEnhancement: handle } = createRequire(import.meta.url)(outfile);
  const make = (level = 0) => {
    const user = {
      id: 'a',
      status: 'active',
      points: { current: 100000, total: 100000 },
      rps: { bonus: 3 },
      rpsHand: { level, version: 4 },
    };
    return { user, db: { users: [user] } };
  };
  const packet = () => ({ requestId: randomUUID(), expectedVersion: 4 });
  const play = ({ db, user }, input = packet(), ticket = 0, now = 5000) =>
    handle(db, user, 'POST', input, undefined, {
      now,
      randomInt: (limit) => {
        assert.equal(limit, 100);
        return ticket;
      },
    });
  assert.equal(new Set(rpsHandStages.map((row) => row.name)).size, 21);
  for (let level = 0; level < 20; level++) {
    const stage = rpsHandStages[level + 1];
    let successes = 0;
    for (let ticket = 0; ticket < 100; ticket++) {
      const fixture = make(level),
        request = packet();
      const result = play(fixture, request, ticket);
      if (result.result.success) successes++;
      assert.equal(
        result.hand.level,
        result.result.success
          ? level + 1
          : Math.max(0, level - (level < 5 ? 0 : level < 10 ? 1 : 2)),
      );
      assert.equal(result.hand.version, 5);
      assert.equal(result.points.current, 100000 - stage.cost);
      assert.equal(result.points.total, 100000);
      assert.equal(fixture.user.rps.bonus, 3);
      assert.equal(fixture.db.pointLedger.length, 1);
      assert.deepEqual(
        play(fixture, request, 99),
        result,
        'Same request must not reroll or charge again',
      );
      assert.equal(fixture.db.pointLedger.length, 1);
    }
    assert.equal(successes, stage.successPercent);
    if (level) assert.ok(stage.cost > rpsHandStages[level].cost);
  }
  for (const [level, after] of [
    [4, 4],
    [5, 4],
    [9, 8],
    [10, 8],
    [19, 17],
  ])
    assert.equal(play(make(level), packet(), 99).hand.level, after);
  assert.throws(() => play(make(20)), { status: 409 });
  const f = make();
  f.user.points.current = 99;
  assert.throws(() => play(f), { status: 400 });
  assert.equal(f.db.pointLedger, undefined);
  f.user.points.current = 100;
  const request = packet();
  const first = play(f, { ...request, cost: 0, level: 20, success: true });
  assert.equal(first.hand.level, 1);
  assert.equal(first.points.current, 0);
  assert.throws(() => play(f, { ...packet(), expectedVersion: 4 }), { status: 409 });
  assert.throws(() => play(f, { ...packet(), expectedVersion: 5 }), { status: 429 });
  assert.throws(() => play(f, { ...packet(), expectedVersion: -1 }), { status: 400 });
  assert.throws(() => play({ ...f, user: { ...f.user, actualRole: 'operator' } }), { status: 403 });
  assert.equal(
    handle(
      f.db,
      { id: 'b', points: {} },
      'GET',
      {},
      new URLSearchParams({ requestId: request.requestId }),
    ).result,
    null,
  );
  const restored = JSON.parse(JSON.stringify(f));
  restored.user = restored.db.users[0];
  assert.equal(play(restored, request).result.to, 1);
  console.log(
    'PASS: enhancement all 20 success distributions, target-level failure boundaries, costs, max/insufficient/stale/preview guards, retry persistence and ownership',
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
