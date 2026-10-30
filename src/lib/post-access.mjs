import { isStaff } from './roles.js';

// Apply before serializing any post data, including titles and attachments.
export function canReadPost(post, viewer) {
  if (post.status === 'draft') return Boolean(viewer && viewer.id === post.authorId);
  return (
    post.board !== 'report' ||
    Boolean(viewer && (viewer.id === post.authorId || isStaff(viewer.role)))
  );
}
