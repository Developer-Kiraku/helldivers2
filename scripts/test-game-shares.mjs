import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { gameResultMessage } from '../src/lib/game-results.mjs';
const directory = await fs.mkdtemp(path.resolve('work/game-share-test-'));
try {
  const outfile = path.join(directory, 'shares.cjs');
  await build({
    entryPoints: ['src/lib/server/game-shares.js'],
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
  const { createGameShare: create, findPublicGameShare: find } = createRequire(import.meta.url)(
    outfile,
  );
  const actor = {
    id: 'me',
    nickname: '한글 대원',
    status: 'active',
    points: { current: 123456789 },
  };
  const other = { id: 'other', nickname: '비공개 상대', status: 'active' };
  const now = Date.now(),
    rps = randomUUID(),
    dice = randomUUID(),
    puzzle = randomUUID(),
    hero = randomUUID();
  const db = {
    users: [actor, other],
    pointLedger: [],
    rpsRounds: [
      {
        requestId: rps,
        userId: 'me',
        createdAt: now,
        choice: 'rock',
        opponent: 'scissors',
        outcome: 'win',
        multiplier: 2,
        stake: 100,
        payout: 200,
        profit: 100,
      },
    ],
    diceGames: [
      {
        id: dice,
        status: 'finished',
        players: ['me', 'other'],
        dice: { me: [1, 2, 3, 4], other: [1, 2, 2, 2] },
        bets: { me: 100, other: 200 },
        winnerId: 'me',
        finishedAt: now,
        reason: 'showdown',
      },
    ],
    puzzleRuns: [
      {
        id: puzzle,
        userId: 'me',
        result: {
          record: {
            id: puzzle,
            finishedAt: new Date(now).toISOString(),
            moves: 55,
            elapsedMs: 23456,
          },
        },
      },
    ],
    stratagemRuns: [
      {
        id: hero,
        userId: 'me',
        status: 'failed',
        stage: 12,
        clearedStage: 11,
        timingVersion: 1,
        elapsedMs: 65000,
        payout: 0,
        finishedAt: now,
      },
    ],
  };
  for (const [game, resultId] of [
    ['rps', rps],
    ['dice', dice],
    ['sliding-puzzle', puzzle],
    ['stratagem', hero],
  ]) {
    const request = { game, resultId, payout: 999999, outcome: 'win', nickname: '위조' };
    const first = create(db, actor, request).share;
    assert.deepEqual(
      create(db, actor, request).share,
      first,
      'Retries reuse the same immutable result',
    );
    const code = first.path.split('/').pop();
    assert.match(code, /^[A-Za-z0-9_-]{24}$/);
    assert.deepEqual(find(db, code), first);
    assert.equal(first.result.nickname, actor.nickname);
    assert.ok(
      !/위조|999999|123456789|비공개 상대|userId|ownerId|requestId/.test(
        JSON.stringify(find(db, code)),
      ),
    );
    const message = gameResultMessage(
      first.result,
      'https://example.com' + first.path,
      'https://example.com/image',
    );
    assert.equal(message.objectType, 'feed');
    assert.equal(message.content.link.webUrl, 'https://example.com' + first.path);
    assert.equal(
      gameResultMessage(first.result, 'https://example.com' + first.path, null).objectType,
      'text',
    );
    if (game !== 'dice') assert.throws(() => create(db, other, request), { status: 404 });
  }
  assert.equal(db.gameShares.length, 4);
  assert.equal(db.pointLedger.length, 0, 'Sharing never settles or charges a game');
  assert.equal(
    create(db, actor, { game: 'stratagem', resultId: hero }).share.result.headline,
    '11단계 클리어',
  );
  db.diceGames[0].status = 'playing';
  assert.throws(() => create(db, other, { game: 'dice', resultId: dice }), { status: 404 });
  db.stratagemRuns.push({ id: randomUUID(), userId: 'me', status: 'checkpoint', stage: 10 });
  assert.throws(
    () => create(db, actor, { game: 'stratagem', resultId: db.stratagemRuns.at(-1).id }),
    { status: 404 },
  );
  assert.throws(
    () => create(db, { ...actor, actualRole: 'operator' }, { game: 'rps', resultId: rps }),
    { status: 403 },
  );
  assert.throws(() => create(db, actor, { game: 'bad', resultId: rps }), { status: 400 });
  assert.equal(find(db, 'invalid'), null);
  assert.equal(find(db, 'A'.repeat(24)), null);
  const saved = create(db, actor, { game: 'rps', resultId: rps }).share;
  db.rpsRounds = [];
  assert.deepEqual(
    create(db, actor, { game: 'rps', resultId: rps }).share,
    saved,
    'Shared snapshots survive game history cleanup',
  );
  actor.status = 'withdrawn';
  assert.equal(find(db, saved.path.split('/').pop()), null);
  console.log(
    'PASS: four verified game snapshots, ownership, completed-only sharing, idempotency, privacy, persistence and Kakao fallback',
  );
} finally {
  await fs.rm(directory, { recursive: true, force: true });
}
