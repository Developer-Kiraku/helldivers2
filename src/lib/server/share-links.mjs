import { createHash } from 'node:crypto';

// Stable 96-bit identifiers keep existing links valid without a third-party shortener.
export function postSharePath(post) {
  const code = createHash('sha256')
    .update(`${post.board}:${post.id}`)
    .digest('base64url')
    .slice(0, 16);
  return `/s/${code}`;
}
export const validSharePath = (value) =>
  typeof value === 'string' && /^\/s\/[A-Za-z0-9_-]{16}$/.test(value);
