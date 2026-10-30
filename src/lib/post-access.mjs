import { isStaff, outranks } from './roles.js';

export function canManagePosts(user) {
  return Boolean(user?.role === 'operator' && (user.actualRole || user.role) === 'operator');
}

export function canDeletePost(actor, author) {
  return Boolean(
    actor &&
    (actor.id === author?.id ||
      actor.role === 'operator' ||
      (actor.role === 'deputy' && outranks(actor.role, author?.role))),
  );
}

// Apply before serializing any post data, including titles and attachments.
export function canReadPost(post, viewer) {
  if (post.status === 'draft') return Boolean(viewer && viewer.id === post.authorId);
  return (
    post.board !== 'report' ||
    Boolean(viewer && (viewer.id === post.authorId || isStaff(viewer.role)))
  );
}
