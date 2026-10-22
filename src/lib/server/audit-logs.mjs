import { auditActionTypes } from '../audit-log-types.mjs';

export function auditLogEntry(db, entry) {
  const type =
    entry.action === 'user.withdraw' && entry.actorId && entry.actorId !== entry.targetId
      ? 'member_expel'
      : auditActionTypes[entry.action];
  const details = entry.details || {};
  const actor = db.users.find((user) => user.id === entry.actorId);
  const member = type.startsWith('member_');
  const target = member
    ? db.users.find((user) => user.id === entry.targetId)
    : db.posts.find((post) => post.id === entry.targetId);
  const snapshot = details.after || details.before;
  const request = details.requestId
    ? (db.requests || []).find((item) => item.id === details.requestId)
    : null;
  const reason = typeof details.reason === 'string' ? details.reason.trim() : '';
  const nickname = (user) => (user?.status === 'withdrawn' ? '탈퇴한 회원' : user?.nickname);
  return {
    id: entry.id,
    type,
    automatic: entry.action === 'user.withdraw.probation_expired',
    executedAt: entry.createdAt,
    actorNickname:
      details.actorNickname || (entry.actorId ? nickname(actor) || '정보 없음' : '시스템'),
    targetName: member
      ? details.targetNickname || nickname(target) || '정보 없음'
      : snapshot?.title || target?.title || '정보 없음',
    targetCreatedAt: details.targetCreatedAt || snapshot?.createdAt || target?.createdAt || null,
    reason:
      reason ||
      request?.reason ||
      (entry.action === 'user.withdraw.probation_expired' ? '견습 승인 기한 만료' : ''),
  };
}
export function auditLogList(db, parameters) {
  const type = parameters.get('type') || '';
  const query = (parameters.get('q') || '').slice(0, 100).toLocaleLowerCase();
  const logs = db.audit
    .filter((entry) => Object.hasOwn(auditActionTypes, entry.action))
    .map((entry) => auditLogEntry(db, entry))
    .filter(
      (entry) =>
        (!type || type === entry.type) &&
        (!query ||
          `${entry.actorNickname} ${entry.targetName}`.toLocaleLowerCase().includes(query)),
    )
    .sort((a, b) => b.executedAt.localeCompare(a.executedAt) || b.id.localeCompare(a.id));
  const pageCount = Math.max(1, Math.ceil(logs.length / 10));
  const requested = Number(parameters.get('page'));
  const page =
    Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pageCount) : 1;
  return { logs: logs.slice((page - 1) * 10, page * 10), total: logs.length, page, pageCount };
}
