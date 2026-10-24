import { isStaff } from './roles.js';

// Apply before serializing any post data, including titles and attachments.
export function canReadPost(post, viewer) {
  return (
    post.board !== 'report' ||
    Boolean(viewer && (viewer.id === post.authorId || isStaff(viewer.role)))
  );
}
