import { createHash } from 'node:crypto';
import { postText } from '../post-summary.mjs';

const digest = (value) =>
  createHash('sha256')
    .update(String(value || ''))
    .digest('hex');
export const postHistoryActions = ['post.update', 'post.delete', 'post.delete.approved'];
export function postSnapshot(post) {
  return {
    board: post.board,
    authorId: post.authorId,
    createdAt: post.createdAt || null,
    title: post.title,
    category: post.category,
    content: postText(post),
    bodyHash: digest(post.bodyHtml),
    images: (post.images || []).map(digest),
    youtubeUrl: post.youtubeUrl || '',
    maps: post.maps || [],
    ...(post.loadout ? { loadout: post.loadout } : {}),
    pinned: Boolean(post.pinned),
  };
}
export function postHistoryDetails(actor, before, after = null, extra = {}) {
  return {
    actorNickname: actor.nickname,
    actorRole: actor.role,
    targetCreatedAt: before.createdAt,
    before,
    after,
    changedFields: after
      ? Object.keys(before).filter(
          (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
        )
      : [],
    ...extra,
  };
}
export function historyEntry(db, entry, detail = false) {
  const post = db.posts.find((post) => post.id === entry.targetId);
  const actor = db.users.find((user) => user.id === entry.actorId);
  const details = entry.details || {};
  const snapshot = details.after || details.before;
  return {
    id: entry.id,
    postId: entry.targetId,
    action: entry.action,
    createdAt: entry.createdAt,
    actorNickname: details.actorNickname || actor?.nickname || '탈퇴한 회원',
    actorRole: details.actorRole || actor?.role || null,
    title: snapshot?.title || post?.title || '게시글 정보 없음',
    board: snapshot?.board || post?.board || '',
    deleted: !post || Boolean(post.deletedAt),
    reason: details.reason || '',
    requesterNickname: details.requesterNickname || '',
    changedFields: details.changedFields || [],
    hasSnapshot: Boolean(details.before),
    ...(detail ? { before: details.before || null, after: details.after || null } : {}),
  };
}
export function postHistoryList(db, parameters) {
  const action = parameters.get('action') || '';
  const board = parameters.get('board') || '';
  const query = (parameters.get('q') || '').slice(0, 100).toLocaleLowerCase();
  const rows = db.audit
    .filter((entry) => postHistoryActions.includes(entry.action))
    .map((entry) => historyEntry(db, entry))
    .filter(
      (entry) =>
        (!action || entry.action === action) &&
        (!board || entry.board === board) &&
        (!query || `${entry.title} ${entry.actorNickname}`.toLocaleLowerCase().includes(query)),
    )
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
  const pageCount = Math.max(1, Math.ceil(rows.length / 20));
  const requested = Number(parameters.get('page'));
  const page =
    Number.isSafeInteger(requested) && requested > 0 ? Math.min(requested, pageCount) : 1;
  return { logs: rows.slice((page - 1) * 20, page * 20), total: rows.length, page, pageCount };
}
