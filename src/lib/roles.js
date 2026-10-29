export const roleLabels = {
  operator: '총운영자',
  deputy: '부운영자',
  member: '일반회원',
  apprentice: '견습회원',
};
export const roleRanks = { operator: 4, deputy: 3, member: 2, apprentice: 1 };
export const isStaff = (role) => ['operator', 'deputy'].includes(role);
export const outranks = (actor, target) => (roleRanks[actor] || 0) > (roleRanks[target] || 0);
export function memberCapabilities(actor, target) {
  const active = target.status === 'active',
    operator = actor?.role === 'operator',
    deputy = actor?.role === 'deputy';
  return {
    canMute:
      active && isStaff(actor?.role) && actor.id !== target.id && outranks(actor.role, target.role),
    canApprove: active && isStaff(actor?.role) && target.role === 'apprentice',
    canExpel: active && operator && outranks(actor.role, target.role),
    canRequestExpel: active && deputy && ['member', 'apprentice'].includes(target.role),
    canChangeRole:
      active && operator && actor.id !== target.id && outranks(actor.role, target.role),
  };
}
