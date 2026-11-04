import assert from 'node:assert/strict';
import { randomBytes } from 'node:crypto';
import {
  createPool,
  migrate,
  importJson,
  postgresTransaction,
} from '../src/lib/server/postgres.mjs';
import { reserveLoginAttempt } from '../src/lib/server/login-throttle.mjs';
import { registerOAuthState, consumeOAuthState } from '../src/lib/server/oauth-state.mjs';
import { settlePuzzleRewards, puzzleRewardDueAt } from '../src/lib/server/puzzle-rewards.mjs';

// Creates only disposable test data in a new isolated schema; never clears application tables.
const url = new URL(process.env.DATABASE_URL);
const schema = `hd_test_${randomBytes(6).toString('hex')}`;
const admin = createPool(url.href);
await admin.query(`CREATE SCHEMA ${schema}`);
url.searchParams.set('options', `-c search_path=${schema}`);
let pool = createPool(url.href),
  other = createPool(url.href);
try {
  const seed = {
    schemaVersion: 1,
    users: [{ id: 'test-user', nickname: '테스트', status: 'active', loginId: 'test' }],
    posts: [
      {
        id: 'test-post',
        board: 'talk',
        authorId: 'test-user',
        title: '테스트',
        views: 0,
        poll: { options: [{ id: 'yes', text: '찬성' }], ballots: [] },
      },
    ],
    comments: [],
    votes: [],
    requests: [],
    sessions: [{ tokenHash: 'not-transferred', userId: 'test-user' }],
    audit: [],
  };
  await importJson(pool, seed);
  await assert.rejects(importJson(pool, seed), /empty destination/);
  await migrate(pool);
  const read = () => postgresTransaction(pool, (db) => structuredClone(db), { write: false });
  assert.equal((await read()).sessions.length, 0);
  assert.equal((await read()).posts[0].poll.options[0].text, '찬성');
  const scopedOptions = { collections: ['users', 'sessions', 'audit'] };
  await postgresTransaction(
    pool,
    (db) => {
      assert.equal(db.posts, undefined, 'Operational scopes never load post bodies');
      db.users[0].nickname = '경량 조회 테스트';
      db.performanceCheck = { saved: true };
    },
    scopedOptions,
  );
  assert.equal((await read()).users[0].nickname, '경량 조회 테스트');
  assert.equal((await read()).posts.length, 1, 'Unloaded collections are preserved');
  assert.equal((await read()).performanceCheck.saved, true);
  await assert.rejects(
    postgresTransaction(
      pool,
      (db) => {
        db.users[0].nickname = '취소되어야 함';
        db.posts = [];
      },
      scopedOptions,
    ),
    /outside transaction scope/,
  );
  assert.equal((await read()).users[0].nickname, '경량 조회 테스트');
  assert.equal((await read()).posts.length, 1);
  await postgresTransaction(
    pool,
    (db) => {
      db.users[0].nickname = '테스트';
    },
    scopedOptions,
  );
  await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      postgresTransaction(index % 2 ? pool : other, async (db) => {
        const value = db.posts[0].views;
        await new Promise((resolve) => setTimeout(resolve, 5));
        db.posts[0].views = value + 1;
      }),
    ),
  );
  assert.equal((await read()).posts[0].views, 12);
  const attempts = await Promise.all(
    Array.from({ length: 12 }, (_, index) =>
      postgresTransaction(index % 2 ? pool : other, (db) =>
        reserveLoginAttempt(db, 'concurrent-account'),
      ),
    ),
  );
  assert.equal(attempts.filter(Boolean).length, 8);
  assert.equal(
    await postgresTransaction(other, (db) => reserveLoginAttempt(db, 'concurrent-account')),
    false,
  );
  await postgresTransaction(pool, (db) => registerOAuthState(db, 'concurrent-state'));
  const consumed = await Promise.all(
    [pool, other].map((connection) =>
      postgresTransaction(connection, (db) => consumeOAuthState(db, 'concurrent-state')),
    ),
  );
  assert.equal(consumed.filter(Boolean).length, 1);
  await assert.rejects(
    postgresTransaction(pool, (db) => {
      db.posts[0].views = 999;
      throw Error('reject operation');
    }),
    /reject operation/,
  );
  assert.equal((await read()).posts[0].views, 12);
  await assert.rejects(
    postgresTransaction(
      pool,
      (db) => {
        db.posts[0].title = 'rejected';
        throw Error('reject operation');
      },
      {
        settle: (db) => {
          db.users[0].status = 'withdrawn';
          return true;
        },
      },
    ),
    /reject operation/,
  );
  assert.equal((await read()).users[0].status, 'withdrawn');
  assert.equal((await read()).posts[0].title, '테스트');
  await postgresTransaction(pool, (db) => {
    db.votes.push({ postId: 'test-post', userId: 'test-user', value: 1 });
    db.sessions.push({ tokenHash: 'session-test', userId: 'test-user' });
  });
  assert.equal((await read()).votes.length, 1);
  await postgresTransaction(pool, (db) => {
    db.votes = [];
    db.sessions = [];
  });
  assert.equal((await read()).votes.length, 0);
  assert.equal((await read()).sessions.length, 0);
  await assert.rejects(
    postgresTransaction(pool, (db) => db.users.push({ ...db.users[0] })),
    /duplicate/,
  );
  assert.equal((await read()).users.length, 1);
  await pool.end();
  pool = createPool(url.href);
  assert.equal((await read()).posts[0].views, 12);
  await postgresTransaction(pool, (db) => {
    db.messages.push({
      id: 'private-message',
      senderId: 'test-user',
      recipientId: 'other-user',
      body: 'private',
      readAt: null,
    });
  });
  assert.equal(
    (await postgresTransaction(other, (db) => db.messages, { write: false }))[0].body,
    'private',
  );
  await postgresTransaction(other, (db) => {
    db.messages[0].readAt = '2026-11-01T00:00:00.000Z';
  });
  assert.equal((await read()).messages[0].readAt, '2026-11-01T00:00:00.000Z');
  await postgresTransaction(pool, (db) => {
    db.messages = [];
  });
  assert.equal((await read()).messages.length, 0);
  await postgresTransaction(pool, (db) => {
    db.users[0].status = 'active';
    db.users[0].points = { current: 20, total: 40 };
    db.puzzleRecords = [
      {
        id: 'reward-record',
        userId: 'test-user',
        month: '2026-11',
        elapsedMs: 1000,
        moves: 20,
        finishedAt: '2026-11-20T00:00:00Z',
      },
    ];
  });
  const rewardsOptions = {
    write: false,
    settle: (db) => settlePuzzleRewards(db, puzzleRewardDueAt('2026-11')),
  };
  await Promise.all(
    [pool, other].map((connection) => postgresTransaction(connection, () => null, rewardsOptions)),
  );
  assert.equal((await read()).users[0].points.current, 10020);
  assert.equal((await read()).users[0].points.total, 10040);
  assert.equal((await read()).puzzleRewards.length, 1);
  assert.equal((await read()).notifications.length, 1);
  await pool.end();
  pool = createPool(url.href);
  await postgresTransaction(pool, () => null, rewardsOptions);
  assert.equal(
    (await read()).pointLedger.length,
    1,
    'Monthly rewards pay once across processes and restarts',
  );
  console.log(
    'PASS: PostgreSQL import, migration, nested polls, two-pool concurrency, rollback, expiry on rejected requests, record removal and reconnect persistence',
  );
} finally {
  await pool.end();
  await other.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
