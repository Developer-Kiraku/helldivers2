import { validSharePath } from './share-links.mjs';
import { presentationUser, viewRoleCookie } from '../view-role.mjs';
import 'server-only';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { config } from './config';
import { createToken, tokenHash } from './passwords';
import { readStore } from './store';
import { isMuted } from '../member-mute.mjs';

export class AppError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export const fail = (status, message) => {
  throw new AppError(status, message);
};
export const cookieOptions = {
  httpOnly: true,
  sameSite: 'lax',
  secure: config.secureCookies,
  path: '/',
};

export function userForToken(db, token) {
  if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return null;
  const session = db.sessions.find(
    (item) => item.tokenHash === tokenHash(token) && Date.parse(item.expiresAt) > Date.now(),
  );
  if (!session) return null;
  return db.users.find((user) => user.id === session.userId && user.status === 'active') || null;
}
export function requireUser(db, token) {
  const user = userForToken(db, token);
  if (!user) fail(401, '로그인이 필요합니다.');
  return user;
}
export function publicUser(user) {
  if (!user) return null;
  return {
    id: user.id,
    loginId: user.loginId || null,
    role: user.role,
    actualRole: user.actualRole || user.role,
    nickname: user.nickname,
    photo: user.photo,
    kakao: user.kakao ? { id: user.kakao.id, connectedAt: user.kakao.connectedAt } : null,
    provider: user.kakao ? 'kakao' : 'temporary',
    status: user.status,
    mutedUntil: isMuted(user) ? user.mutedUntil : null,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    probationStartedAt: user.probationStartedAt || null,
    probationExpiresAt: user.probationExpiresAt || null,
    approvedAt: user.approvedAt || null,
    approvedBy: user.approvedBy || null,
  };
}
export function memberListUser(user, actor) {
  const result = publicUser(user);
  // Provider identifiers are only needed on the account owner's own profile.
  delete result.kakao;
  delete result.approvedBy;
  if (actor.id !== user.id) delete result.loginId;
  return result;
}
export function createSession(db, user) {
  const token = createToken();
  const now = new Date().toISOString();
  db.sessions = db.sessions.filter((item) => Date.parse(item.expiresAt) > Date.now());
  const existing = db.sessions
    .filter((item) => item.userId === user.id)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const revoke = new Set(existing.slice(4).map((item) => item.tokenHash));
  db.sessions = db.sessions.filter((item) => !revoke.has(item.tokenHash));
  db.sessions.push({
    tokenHash: tokenHash(token),
    userId: user.id,
    createdAt: now,
    expiresAt: new Date(Date.now() + config.sessionHours * 3600000).toISOString(),
  });
  user.lastLoginAt = now;
  return token;
}
export const setSessionCookie = (response, token) => {
  response.cookies.set(config.cookie, token, {
    ...cookieOptions,
    maxAge: config.sessionHours * 3600,
  });
  response.cookies.set(viewRoleCookie, '', { ...cookieOptions, maxAge: 0 });
};
export const clearSessionCookie = (response) => {
  response.cookies.set(config.cookie, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set(viewRoleCookie, '', { ...cookieOptions, maxAge: 0 });
};
export async function getCurrentUser() {
  const cookieStore = await cookies();
  const token = cookieStore.get(config.cookie)?.value;
  if (!token) return null;
  return readStore((db) =>
    publicUser(presentationUser(userForToken(db, token), cookieStore.get(viewRoleCookie)?.value)),
  );
}
export async function requirePageUser(roles) {
  const user = await getCurrentUser();
  if (!user) redirect('/login');
  const shared = (await cookies()).get('hd_shared_post')?.value;
  if (validSharePath(shared)) redirect(shared);
  if (roles && !roles.includes(user.role)) redirect('/');
  return user;
}
export function verifyOrigin(request) {
  const origin = request.headers.get('origin');
  const expected = config.origin || new URL(request.url).origin;
  if (!origin || origin !== expected) fail(403, '요청 출처를 확인할 수 없습니다.');
}
