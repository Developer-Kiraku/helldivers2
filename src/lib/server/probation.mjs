import { randomUUID } from 'node:crypto';

// One calendar month in Korea, clamped to the final day of shorter months.
export function probationDeadline(startedAt) {
  const date = new Date(Date.parse(startedAt) + 9 * 3600000);
  if (!Number.isFinite(date.getTime())) throw new Error('Invalid probation start date');
  const year = date.getUTCFullYear(),
    month = date.getUTCMonth() + 1;
  const day = Math.min(date.getUTCDate(), new Date(Date.UTC(year, month + 1, 0)).getUTCDate());
  return new Date(
    Date.UTC(
      year,
      month,
      day,
      date.getUTCHours(),
      date.getUTCMinutes(),
      date.getUTCSeconds(),
      date.getUTCMilliseconds(),
    ) -
      9 * 3600000,
  ).toISOString();
}

export function startProbation(user, startedAt = user.createdAt) {
  user.probationStartedAt = startedAt;
  user.probationExpiresAt = probationDeadline(startedAt);
  user.approvedAt = null;
  user.approvedBy = null;
}

export function approveApprentice(user, actorId, at = new Date().toISOString()) {
  user.role = 'member';
  user.approvedAt = at;
  user.approvedBy = actorId;
  user.updatedAt = at;
}

export function withdrawMember(db, user, reason, at = new Date().toISOString()) {
  user.status = 'withdrawn';
  user.nickname = `탈퇴회원_${user.id.slice(-8)}`;
  user.photo = '';
  user.passwordHash = null;
  user.loginId = null;
  user.kakao = null;
  user.withdrawnAt = at;
  user.withdrawalReason = reason;
  user.updatedAt = at;
  db.sessions = db.sessions.filter((session) => session.userId !== user.id);
}

// Runs before every transaction and on the server's minute timer.
// Its writes must survive even when the following API request is rejected.
export function settleProbation(db, at = new Date().toISOString()) {
  let changed = false;
  for (const user of db.users) {
    if (user.status !== 'active' || user.role !== 'apprentice') continue;
    if (!user.probationExpiresAt) {
      startProbation(user);
      changed = true;
    }
    if (Date.parse(user.probationExpiresAt) > Date.parse(at)) continue;
    withdrawMember(db, user, 'probation_expired', at);
    db.audit.push({
      id: randomUUID(),
      actorId: null,
      action: 'user.withdraw.probation_expired',
      targetId: user.id,
      details: { deadline: user.probationExpiresAt },
      createdAt: at,
    });
    changed = true;
  }
  return changed;
}
