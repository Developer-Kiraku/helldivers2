import { auditActionTypes } from '../audit-log-types.mjs';

// Store names and dates at the time of the action, before later edits or withdrawals.
export function auditLogDetails(db, actorId, action, targetId, details = {}) {
  const comment = action.startsWith('comment.')
    ? db.comments.find((item) => item.id === targetId)
    : null;
  const post = /^(post|comment|poll)\./.test(action)
    ? db.posts.find((item) => item.id === (comment?.postId || targetId))
    : null;
  return {
    actorNickname: db.users.find((user) => user.id === actorId)?.nickname,
    ...(post
      ? {
          board: post.board,
          targetTitle: post.title,
          targetCreatedAt: comment?.createdAt || post.createdAt,
          ...(comment ? { postId: post.id } : {}),
        }
      : {}),
    ...details,
  };
}

export function auditLogEntry(db, entry) {
  const type =
    entry.action === 'user.withdraw' && entry.actorId && entry.actorId !== entry.targetId
      ? 'member_expel'
      : auditActionTypes[entry.action];
  const details = entry.details || {};
  const actor = db.users.find((user) => user.id === entry.actorId);
  const member = type.startsWith('member_');
  const comment = type.startsWith('comment_')
    ? db.comments?.find((item) => item.id === entry.targetId)
    : null;
  const target = member
    ? db.users.find((user) => user.id === entry.targetId)
    : type === 'point_grant'
      ? null
      : db.posts.find((post) => post.id === (details.postId || comment?.postId || entry.targetId));
  const snapshot = details.after || details.before;
  const request = details.requestId
    ? (db.requests || []).find((item) => item.id === details.requestId)
    : null;
  const reason = typeof details.reason === 'string' ? details.reason.trim() : '';
  const nickname = (user) => (user?.status === 'withdrawn' ? '탈퇴한 회원' : user?.nickname);
  const relatedToPost = /^(post|comment|poll)_/.test(type);
  const postHref =
    relatedToPost && target && !target.deletedAt && target.status !== 'draft'
      ? `/boards/${encodeURIComponent(target.board)}/${encodeURIComponent(target.id)}${
          comment && !comment.deletedAt ? '#comment-' + encodeURIComponent(comment.id) : ''
        }`
      : null;
  return {
    id: entry.id,
    type,
    ...(type === 'point_grant' ? { amount: details.amount } : {}),
    automatic: entry.action === 'user.withdraw.probation_expired',
    executedAt: entry.createdAt,
    actorNickname:
      details.actorNickname || (entry.actorId ? nickname(actor) || '정보 없음' : '시스템'),
    targetName: member
      ? details.targetNickname || nickname(target) || '정보 없음'
      : details.targetTitle || snapshot?.title || target?.title || '정보 없음',
    targetCreatedAt:
      details.targetCreatedAt ||
      comment?.createdAt ||
      snapshot?.createdAt ||
      target?.createdAt ||
      null,
    ...(!member ? { board: details.board || snapshot?.board || target?.board || '' } : {}),
    ...(relatedToPost ? { postHref, postDeleted: Boolean(target?.deletedAt) } : {}),
    ...(type === 'post_move'
      ? { sourceBoard: details.sourceBoard, targetBoard: details.targetBoard }
      : {}),
    ...(type === 'member_mute'
      ? { mutedUntil: details.mutedUntil || null, muteDuration: details.duration || null }
      : {}),
    ...(['member_mute', 'member_unmute'].includes(type) && details.selfTest
      ? { selfTest: true }
      : {}),
    reason:
      reason ||
      request?.reason ||
      (entry.action === 'user.withdraw.probation_expired' ? '견습 승인 기한 만료' : ''),
  };
}
export function auditLogList(db, parameters) {
  const type = parameters.get('type') || '';
  const board = parameters.get('board') || '';
  const query = (parameters.get('q') || '').slice(0, 100).toLocaleLowerCase();
  const draftIds = new Set(
    db.posts.filter((post) => post.status === 'draft').map((post) => post.id),
  );
  const logs = db.audit
    .filter(
      (entry) =>
        Object.hasOwn(auditActionTypes, entry.action) &&
        !draftIds.has(entry.details?.postId || entry.targetId),
    )
    .map((entry) => auditLogEntry(db, entry))
    .filter(
      (entry) =>
        (!type || type === entry.type) &&
        (!board ||
          board === entry.board ||
          board === entry.sourceBoard ||
          board === entry.targetBoard) &&
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
