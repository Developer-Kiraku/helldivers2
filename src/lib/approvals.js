import { isStaff } from './roles';

// Shared read model: the server provides persisted data; Pages supplies examples.
export function approvalList(db, actor) {
  if (!isStaff(actor?.role)) return [];
  const name = (id) => {
    const user = db.users.find((item) => item.id === id);
    return !user || user.status === 'withdrawn' ? '탈퇴한 회원' : user.nickname;
  };
  const grade = (id) => {
    const user = db.users.find((item) => item.id === id);
    return user?.status === 'active' ? user.role : null;
  };
  const membership = db.users
    .filter((user) => user.status === 'active' && user.role === 'apprentice')
    .map((user) => ({
      id: `member:${user.id}`,
      type: 'member_approval',
      targetId: user.id,
      targetSnapshot: user.nickname,
      requestedBy: user.id,
      requesterNickname: user.nickname,
      requesterRole: user.role,
      targetRole: user.role,
      reason: '견습회원 가입 승인 대기',
      status: 'pending',
      createdAt: user.probationStartedAt || user.createdAt,
      expiresAt: user.probationExpiresAt,
      reviewedAt: null,
      reviewerNickname: null,
      reviewNote: '',
      canApprove: true,
      canReject: false,
    }));
  const history = (db.audit || [])
    .filter((item) => item.action === 'user.approve')
    .map((item) => ({
      id: `member-approved:${item.id}`,
      type: 'member_approval',
      targetId: item.targetId,
      targetSnapshot: name(item.targetId),
      requestedBy: item.targetId,
      requesterNickname: name(item.targetId),
      requesterRole: grade(item.targetId),
      targetRole: grade(item.targetId),
      reason: '견습회원 가입 승인 완료',
      status: 'approved',
      createdAt: db.users.find((user) => user.id === item.targetId)?.createdAt || item.createdAt,
      reviewedAt: item.createdAt,
      reviewerNickname: name(item.actorId),
      reviewerRole: grade(item.actorId),
      reviewNote: '',
      canApprove: false,
      canReject: false,
    }));
  const moderation =
    actor.role === 'operator'
      ? db.requests.map((item) => ({
          ...item,
          requesterNickname: name(item.requestedBy),
          requesterRole: grade(item.requestedBy),
          targetRole: grade(item.targetUserId || item.targetId),
          reviewerRole: grade(item.reviewedBy),
          reviewerNickname: item.reviewedBy ? name(item.reviewedBy) : null,
          canApprove: item.status === 'pending',
          canReject: item.status === 'pending',
        }))
      : [];
  return [...membership, ...history, ...moderation].sort(
    (a, b) =>
      (b.reviewedAt || b.createdAt).localeCompare(a.reviewedAt || a.createdAt) ||
      a.id.localeCompare(b.id),
  );
}
