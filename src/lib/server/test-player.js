import { randomUUID } from 'node:crypto';
import { fail, requireUser, publicUser } from './auth';
import { tokenHash } from './passwords';
import { awardSignupPoints } from './points.mjs';

export function testPlayerOwner(db, token) {
  const owner = requireUser(db, token);
  if (owner.role !== 'operator') fail(403, '총관리자만 테스트 유저를 사용할 수 있습니다.');
  return owner;
}
function binding(db, owner, token) {
  return db.sessions.find(
    (session) =>
      session.testOwnerId === owner.id &&
      session.ownerSessionHash === tokenHash(token) &&
      Date.parse(session.expiresAt) > Date.now(),
  );
}
export function testPlayerStatus(db, owner, token) {
  return { active: Boolean(binding(db, owner, token)) };
}
export function startTestPlayer(db, owner, token) {
  let player = db.users.find((user) => user.testOwnerId === owner.id && user.isTestPlayer);
  if (player && (player.status !== 'active' || player.role !== 'member'))
    fail(409, '사용할 수 없는 테스트 계정입니다.');
  if (!player) {
    let nickname = '테스트대원',
      suffix = 1;
    while (db.users.some((user) => user.nickname === nickname)) nickname = '테스트대원' + suffix++;
    const now = new Date().toISOString();
    player = {
      id: randomUUID(),
      loginId: null,
      passwordHash: null,
      kakao: null,
      role: 'member',
      status: 'active',
      nickname,
      photo: '',
      createdAt: now,
      updatedAt: now,
      lastLoginAt: now,
      isTestPlayer: true,
      testOwnerId: owner.id,
    };
    db.users.push(player);
    awardSignupPoints(db, player);
  }
  if (!binding(db, owner, token)) {
    const ownerSession = db.sessions.find(
      (session) => session.tokenHash === tokenHash(token) && !session.testOwnerId,
    );
    db.sessions.push({
      tokenHash: tokenHash(randomUUID()),
      userId: player.id,
      testOwnerId: owner.id,
      ownerSessionHash: tokenHash(token),
      createdAt: new Date().toISOString(),
      expiresAt: ownerSession.expiresAt,
    });
  }
  return { user: publicUser(player), active: true };
}
export function requireTestPlayer(db, owner, token) {
  const session = binding(db, owner, token);
  if (!session) fail(401, '테스트 유저 모드가 종료됐습니다.');
  const player = db.users.find(
    (user) =>
      user.id === session.userId &&
      user.testOwnerId === owner.id &&
      user.isTestPlayer &&
      user.role === 'member' &&
      user.status === 'active',
  );
  if (!player) fail(403, '테스트 유저를 사용할 수 없습니다.');
  return player;
}
export function stopTestPlayer(db, owner, token) {
  db.sessions = db.sessions.filter(
    (session) =>
      !(session.testOwnerId === owner.id && session.ownerSessionHash === tokenHash(token)),
  );
  return { active: false };
}
export function settleTestPlayerSessions(db) {
  const before = db.sessions.length;
  db.sessions = db.sessions.filter(
    (session) =>
      !session.testOwnerId ||
      db.sessions.some(
        (parent) =>
          !parent.testOwnerId &&
          parent.tokenHash === session.ownerSessionHash &&
          parent.userId === session.testOwnerId &&
          Date.parse(parent.expiresAt) > Date.now() &&
          db.users.some(
            (user) =>
              user.id === parent.userId && user.role === 'operator' && user.status === 'active',
          ),
      ),
  );
  return before !== db.sessions.length;
}
