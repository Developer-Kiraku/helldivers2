export const auditLogTypes = {
  post_update: '게시글 수정',
  post_delete: '게시글 삭제',
  member_join: '회원 가입',
  member_leave: '회원 탈퇴',
  member_expel: '강퇴',
};
export const auditActionTypes = {
  'post.update': 'post_update',
  'post.delete': 'post_delete',
  'post.delete.approved': 'post_delete',
  'user.register': 'member_join',
  'user.withdraw': 'member_leave',
  'user.withdraw.probation_expired': 'member_leave',
  'user.expel': 'member_expel',
  'user.expel.approved': 'member_expel',
};
