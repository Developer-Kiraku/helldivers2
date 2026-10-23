export const viewRoleCookie = 'hd_view_role';
export const viewRoles = ['operator', 'deputy', 'member', 'apprentice'];
export function presentationUser(user, role) {
  if (!user || user.role !== 'operator' || !viewRoles.includes(role) || role === 'operator')
    return user;
  return { ...user, role, actualRole: 'operator' };
}
