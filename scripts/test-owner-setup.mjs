import assert from 'node:assert/strict';
import { ownerPlan, applyOwnerSetup } from '../src/lib/server/owner-setup.mjs';
const seed = () => ({
  users: ['admin', 'subadmin', 'user1', 'user2'].map((name) => ({
    id: `u-${name}`,
    nickname: name,
    loginId: name,
    status: 'active',
    role: name === 'admin' ? 'operator' : 'member',
  })),
  posts: [{ id: 'p1', authorId: 'u-user1' }],
  comments: [{ id: 'c1' }],
  votes: [{ userId: 'u-user1' }],
  requests: [{ id: 'r1' }],
  sessions: [{ userId: 'u-admin' }],
  pendingRegistrations: [{ kakaoId: '12345' }],
  audit: [],
});
const db = seed();
assert.equal(ownerPlan(db, '12345', '라미아').removed.length, 4);
const content = JSON.stringify([db.posts, db.comments]);
const result = applyOwnerSetup(db, '12345', '라미아');
assert.equal(result.totalAccounts, 1);
assert.equal(result.removedAccounts, 4);
assert.equal(db.users[0].role, 'operator');
assert.equal(db.users[0].kakao.id, '12345');
assert.equal(db.users[0].passwordHash, null);
assert.equal(db.users[0].loginId, null);
assert.equal(db.users[0].probationExpiresAt, null);
assert.equal(JSON.stringify([db.posts, db.comments]), content);
assert.equal(db.sessions.length, 0);
assert.equal(db.pendingRegistrations.length, 0);
assert.equal(db.votes.length, 0);
assert.equal(db.requests.length, 0);
assert.throws(() => applyOwnerSetup(db, '12345', '라미아'), /already run/);
assert.throws(() => applyOwnerSetup(seed(), '99999', '라미아'), /no verified/);
const unexpected = seed();
unexpected.users.push({ id: 'real-user', kakao: { id: '67890' } });
assert.throws(() => applyOwnerSetup(unexpected, '12345', '라미아'), /Unexpected real account/);
const existing = seed();
existing.users.push({
  id: 'owner',
  nickname: '라미아',
  status: 'active',
  role: 'apprentice',
  kakao: { id: '12345' },
});
applyOwnerSetup(existing, '12345', '라미아');
assert.equal(existing.users[0].id, 'owner');
console.log(
  'PASS: exact verified owner, demo cleanup, preserved content, revoked sessions, no repeated reset or unexpected account deletion',
);
