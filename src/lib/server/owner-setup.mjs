import { randomUUID } from 'node:crypto';

const demoIds = new Set(['u-admin', 'u-subadmin', 'u-user1', 'u-user2']);
export function ownerPlan(db, kakaoId, nickname) {
  if (!/^\d{1,30}$/.test(kakaoId || ''))
    throw Error('An explicit verified Kakao member ID is required');
  if (!/^[가-힣a-zA-Z0-9_]{2,16}$/.test(nickname || '')) throw Error('Invalid owner nickname');
  const owner = db.users.find((user) => user.kakao?.id === kakaoId);
  if (!owner && !(db.pendingRegistrations || []).some((item) => item.kakaoId === kakaoId))
    throw Error('This Kakao account has no verified authentication record');
  if (owner && owner.status !== 'active') throw Error('Cannot provision an inactive account');
  const removed = db.users.filter((user) => user.id !== owner?.id);
  if (removed.some((user) => !demoIds.has(user.id) || user.kakao))
    throw Error('Unexpected real account found; inspect again before making changes');
  return { owner, removed, nickname, kakaoId, postCount: db.posts.length };
}

export function applyOwnerSetup(db, kakaoId, nickname, at = new Date().toISOString()) {
  if (db.ownerSetup?.kakaoId === kakaoId)
    throw Error('Owner setup has already run; refusing to reset accounts again');
  const plan = ownerPlan(db, kakaoId, nickname);
  const owner = plan.owner || {
    id: randomUUID(),
    photo: '',
    kakao: { id: kakaoId, connectedAt: at },
    createdAt: at,
    lastLoginAt: null,
  };
  Object.assign(owner, {
    nickname,
    role: 'operator',
    status: 'active',
    loginId: null,
    passwordHash: null,
    updatedAt: at,
    probationStartedAt: null,
    probationExpiresAt: null,
    approvedAt: at,
    approvedBy: owner.id,
  });
  const removedIds = new Set(plan.removed.map((user) => user.id));
  db.users = [owner];
  db.sessions = [];
  db.pendingRegistrations = [];
  db.votes = db.votes.filter((vote) => !removedIds.has(vote.userId));
  db.requests = [];
  db.ownerSetup = { kakaoId, ownerId: owner.id, completedAt: at };
  db.audit.push({
    id: randomUUID(),
    actorId: owner.id,
    action: 'owner.setup',
    targetId: owner.id,
    details: { removedDemoAccounts: plan.removed.length, preservedPosts: plan.postCount },
    createdAt: at,
  });
  return {
    nickname,
    role: owner.role,
    removedAccounts: plan.removed.length,
    preservedPosts: plan.postCount,
    totalAccounts: db.users.length,
  };
}
