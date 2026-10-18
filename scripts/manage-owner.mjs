import { createPool, postgresTransaction } from '../src/lib/server/postgres.mjs';
import { ownerPlan, applyOwnerSetup } from '../src/lib/server/owner-setup.mjs';

const pool = createPool();
try {
  const [command, kakaoId, nickname] = process.argv.slice(2);
  if (!['inspect', 'plan', 'apply'].includes(command)) throw Error('Usage: node scripts/manage-owner.mjs inspect|plan|apply [Kakao member ID] [nickname]');
  const result = await postgresTransaction(pool, db => command === 'apply' ? applyOwnerSetup(db, kakaoId, nickname) : command === 'plan' ? (() => {
    const plan = ownerPlan(db, kakaoId, nickname);
    return { ownerNickname: nickname, ownerRole: 'operator', removedAccounts: plan.removed.map(user => ({ loginId: user.loginId, nickname: user.nickname })), preservedPosts: plan.postCount, totalAccountsAfter: 1 };
  })() : ({
    users: db.users.map(({ id, nickname, role, status, kakao }) => ({ id, nickname, role, status, kakaoId: kakao?.id || null })),
    pending: (db.pendingRegistrations || []).map(({ kakaoId, expiresAt }) => ({ kakaoId, expiresAt })),
    postCount: db.posts.length,
  }), { write: command === 'apply' });
  console.log(JSON.stringify(result, null, 2));
} finally { await pool.end(); }
