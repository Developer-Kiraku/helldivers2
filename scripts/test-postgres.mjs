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
  console.log(
    'PASS: PostgreSQL import, migration, nested polls, two-pool concurrency, rollback, expiry on rejected requests, record removal and reconnect persistence',
  );
} finally {
  await pool.end();
  await other.end();
  await admin.query(`DROP SCHEMA ${schema} CASCADE`);
  await admin.end();
}
