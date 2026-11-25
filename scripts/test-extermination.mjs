import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import {
  createTrainingRun,
  advanceTraining,
  applyTrainingEvent,
  trainingEnemies,
  trainingStage,
  trainingEnemyPosition,
} from '../src/lib/extermination.mjs';

const create = (seed = 12345, level = 0) =>
  createTrainingRun({
    id: 'a'.repeat(36),
    userId: 'member',
    seed,
    handLevel: level,
    now: Date.now(),
  });
assert.deepEqual(
  trainingEnemies.map((enemy) => enemy.hp),
  [1, 2, 1, 3, 4, 5, 5],
);
assert.ok(trainingEnemies[2].exposure < trainingEnemies[0].exposure);
for (let index = 0; index < 7; index++) {
  const run = create(55, 20);
  run.nextSpawn = 100000;
  run.enemies = [
    {
      id: 1,
      kind: index,
      slot: 0,
      hp: trainingEnemies[index].hp,
      x: 500,
      y: 300,
      phase: 0,
      born: 0,
      expires: 20000,
    },
  ];
  for (let shot = 0; shot < trainingEnemies[index].hp; shot++) {
    const t = 300 + shot * 200;
    advanceTraining(run, t);
    const position = trainingEnemyPosition(run.enemies[0], run.clock);
    applyTrainingEvent(run, { type: 'shot', t, ...position });
  }
  assert.equal(run.enemies.length, 0);
  assert.equal(run.totalKills, 1);
  assert.equal(run.hits, trainingEnemies[index].hp);
  assert.ok(run.points > 0);
}
for (const [stage, kind] of [
  [9, null],
  [10, 5],
  [15, 6],
  [20, 6],
]) {
  const run = create();
  run.stage = stage;
  advanceTraining(run, 400);
  if (kind === null) assert.ok(run.enemies.every((enemy) => enemy.kind < 5));
  else assert.equal(run.enemies[0].kind, kind);
}
{
  const a = create(),
    b = create();
  const actions = [
    { type: 'shot', t: 450, x: 500, y: 300 },
    { type: 'shot', t: 700, x: 200, y: 500 },
    { type: 'pause', t: 1100 },
    { type: 'resume', t: 5000 },
    { type: 'shot', t: 5500, x: 500, y: 140 },
  ];
  for (const event of actions) {
    while (a.lastTime + 20 < event.t) advanceTraining(a, a.lastTime + 20);
    applyTrainingEvent(a, event);
    applyTrainingEvent(b, event);
  }
  assert.deepEqual(a, b, 'Animation frames and server batch replay must agree exactly');
  const position = trainingEnemyPosition(a.enemies[0], a.clock);
  assert.notDeepEqual(position, trainingEnemyPosition(a.enemies[0], a.clock + 300));
}
function play(seed, level, reaction, cadence, error) {
  const run = create(seed, level);
  let time = 0,
    lastShot = -1000,
    aimState = seed;
  const aim = () => {
    aimState = (Math.imul(aimState, 1664525) + 1013904223) >>> 0;
    return aimState / 4294967296;
  };
  while (run.status !== 'finished' && time < 1000000) {
    time += 40;
    advanceTraining(run, time);
    if (run.status === 'cleared') {
      time += 800;
      applyTrainingEvent(run, { type: 'next', t: time });
      continue;
    }
    if (run.status !== 'playing' || run.reloadAt || time - lastShot < cadence) continue;
    const target = run.enemies
      .filter((enemy) => run.clock - enemy.born >= reaction)
      .sort((a, b) => a.expires - b.expires)[0];
    if (!target) continue;
    const position = trainingEnemyPosition(target, run.clock);
    applyTrainingEvent(run, {
      type: 'shot',
      t: time,
      x: position.x + (aim() - 0.5) * error,
      y: position.y + (aim() - 0.5) * error,
    });
    lastShot = time;
  }
  return run;
}
const profiles = [
  ['일반 0강', 0, 350, 180, 24],
  ['숙련 0강', 0, 220, 160, 10],
  ['일반 20강', 20, 350, 180, 24],
];
for (const [label, level, reaction, cadence, error] of profiles) {
  const samples = Array.from({ length: 20 }, (_, index) =>
    play(15001 + index * 7919, level, reaction, cadence, error),
  );
  const average = (field) =>
    Math.round(samples.reduce((sum, run) => sum + run[field], 0) / samples.length);
  console.log('BALANCE', label, {
    averageStage: average('stage'),
    averagePoints: average('points'),
    clears: samples.filter((run) => run.reason === 'completed').length,
  });
  if (label === '숙련 0강')
    assert.ok(
      samples.some((run) => run.reason === 'completed'),
      'Unenhanced skilled play must remain completable',
    );
}
await fs.mkdir('work', { recursive: true });
const directory = await fs.mkdtemp(path.resolve('work/training-server-'));
const originalNow = Date.now;
try {
  const outfile = path.join(directory, 'server.cjs');
  await build({
    stdin: {
      contents:
        'export {handleTraining} from "./src/lib/server/extermination.js"; export {createGameShare} from "./src/lib/server/game-shares.js";',
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'errors',
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
  const { handleTraining, createGameShare } = createRequire(import.meta.url)(outfile);
  let now = originalNow();
  Date.now = () => now;
  const user = {
    id: 'member',
    nickname: '대원',
    status: 'active',
    role: 'member',
    points: { current: 100, total: 100 },
    rpsHand: { level: 10 },
  };
  const db = { users: [user], trainingRuns: [], trainingRecords: [], pointLedger: [] };
  const call = (action, body, actor = user) =>
    handleTraining(db, actor, ['games', 'extermination', action], 'POST', body);
  const start = { requestId: '00000000-0000-4000-8000-000000000001' };
  const first = call('start', start).run;
  assert.equal(call('start', start).run.id, first.id);
  assert.equal(first.handLevel, 10);
  now += 2000;
  const payload = { runId: first.id, step: 0, events: [{ type: 'stop', t: 1000 }], at: 1000 };
  const done = call('sync', payload);
  assert.ok(done.run.result);
  assert.equal(db.trainingRecords.length, 1);
  assert.equal(call('sync', payload).run.sequence, 1);
  assert.equal(db.trainingRecords.length, 1);
  assert.equal(db.pointLedger.length, 1);
  assert.throws(() => call('sync', { ...payload, step: 1 }, { ...user, id: 'other' }), {
    status: 404,
  });
  assert.throws(() => call('start', { requestId: 'x' }, { ...user, actualRole: 'operator' }), {
    status: 403,
  });
  const another = call('start', { requestId: '00000000-0000-4000-8000-000000000002' }).run;
  assert.throws(() => call('sync', { runId: another.id, step: 0, events: [], at: 999999 }), {
    status: 400,
  });
  const snapshot = structuredClone(another);
  assert.throws(
    () =>
      call('sync', {
        runId: another.id,
        step: 0,
        events: [
          { type: 'shot', t: 1, x: 500, y: 300 },
          { type: 'shot', t: 2, x: -100, y: 300 },
        ],
        at: 2,
      }),
    { status: 400 },
  );
  assert.deepEqual(another, snapshot, 'A rejected packet must not partially mutate state');
  const share = createGameShare(db, user, { game: 'extermination', resultId: first.id });
  assert.equal(share.share.result.gameLabel, '슈퍼 지구 소탕 훈련');
  assert.equal(share.share.result.stats.length, 3);
  assert.equal(
    createGameShare(db, user, { game: 'extermination', resultId: first.id }).share.path,
    share.share.path,
  );
  console.log(
    'PASS training hit counts, movement, deterministic replay, stage gates, server time, atomic packets, payouts, ownership, ranking and sharing',
  );
} finally {
  Date.now = originalNow;
  await fs.rm(directory, { recursive: true, force: true });
}
