export const roleLabels = { operator: '운영자', deputy: '부운영자', member: '일반회원', apprentice: '견습회원' };
export const roleRanks = { operator: 4, deputy: 3, member: 2, apprentice: 1 };
export const isStaff = role => ['operator', 'deputy'].includes(role);
export const outranks = (actor, target) => (roleRanks[actor] || 0) > (roleRanks[target] || 0);
