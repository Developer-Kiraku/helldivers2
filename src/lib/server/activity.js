import { randomUUID } from 'node:crypto';
import { parseDocument } from 'htmlparser2';
import { innerText } from 'domutils';
import { canReadPost } from '../post-access.mjs';
import { fail } from './auth';

// Key each activity by its source and recipient. Repeating a vote or saving
// unchanged mentions keeps its original read state; cancellations remove it.
function syncActivity(db, actor, post, commentId, family, recipients, editing = false) {
  db.notifications ||= [];
  const existing = new Set();
  const createdAt = new Date().toISOString();
  db.notifications = db.notifications.filter((item) => {
    if (
      item.actorId !== actor.id ||
      item.postId !== post.id ||
      item.commentId !== commentId ||
      item.family !== family
    )
      return true;
    const kind = recipients.get(item.recipientId);
    if (!kind) return false;
    existing.add(item.recipientId);
    if (item.kind !== kind) {
      item.kind = kind;
      if (!editing || kind === 'mention') Object.assign(item, { createdAt, readAt: null });
    }
    return true;
  });
  for (const [recipientId, kind] of recipients) {
    if (existing.has(recipientId) || recipientId === actor.id || (editing && kind !== 'mention'))
      continue;
    const recipient = db.users.find((user) => user.id === recipientId && user.status === 'active');
    if (recipient && canReadPost(post, recipient))
      db.notifications.push({
        id: randomUUID(),
        actorId: actor.id,
        recipientId,
        kind,
        family,
        postId: post.id,
        commentId,
        createdAt,
        readAt: null,
      });
  }
}

export function syncTextActivity(db, actor, post, comment = null, editing = false) {
  if (post.status === 'draft') return;
  const source = comment || post;
  const body = comment
    ? comment.body
    : post.bodyHtml && post.board !== 'helstagram'
      ? innerText(
          parseDocument(
            post.bodyHtml.replace(/<\/(?:p|div|li|h[1-6]|td|th|tr)>|<br\s*\/?>/gi, '$&\n'),
          ).children,
        )
      : post.content;
  const text = comment ? body : [post.title, body].join('\n');
  const names = [...text.matchAll(/(?<![\p{L}\p{N}_@])@([\p{L}\p{N}_]{1,16})(?![\p{L}\p{N}_])/gu)];
  const previous = new Map(
    (source.mentions || []).map((entry) => [entry.name.toLowerCase(), entry.id]),
  );
  const members = new Map(
    db.users
      .filter((user) => user.status === 'active')
      .map((user) => [user.nickname.toLowerCase(), user]),
  );
  const recipients = new Map();
  if (comment) {
    recipients.set(post.authorId, 'comment');
    const parent = comment.parentId && db.comments.find((item) => item.id === comment.parentId);
    if (parent && !parent.deletedAt) recipients.set(parent.authorId, 'reply');
  }
  const mentions = new Map();
  for (const [, name] of names) {
    const key = name.toLowerCase();
    const id = previous.get(key) || members.get(key)?.id;
    if (id) {
      mentions.set(key, { name, id });
      recipients.set(id, 'mention');
    }
  }
  source.mentions = [...mentions.values()];
  syncActivity(db, actor, post, comment?.id || null, 'text', recipients, editing);
}

export function syncVoteActivity(db, actor, post, comment, value) {
  const recipients = new Map();
  if (value) recipients.set((comment || post).authorId, value === 1 ? 'like' : 'dislike');
  syncActivity(db, actor, post, comment?.id || null, 'vote', recipients);
}

function visibleActivity(db, viewer) {
  const own = (db.notifications || []).filter((item) => item.recipientId === viewer.id);
  if (!own.length) return [];
  const posts = new Map(db.posts.map((item) => [item.id, item]));
  const comments = new Map(db.comments.map((item) => [item.id, item]));
  return own.filter((item) => {
    const post = posts.get(item.postId);
    const comment = item.commentId && comments.get(item.commentId);
    return (
      post &&
      !post.deletedAt &&
      post.status !== 'draft' &&
      canReadPost(post, viewer) &&
      (!item.commentId || (comment && !comment.deletedAt && comment.postId === post.id))
    );
  });
}

export const unreadActivityCount = (db, viewer) =>
  visibleActivity(db, viewer).filter((item) => !item.readAt).length;

export function handleNotifications(db, viewer, segments, method, query) {
  const visible = visibleActivity(db, viewer);
  if (segments.length === 1 && method === 'GET') {
    visible.sort((a, b) => b.createdAt.localeCompare(a.createdAt) || b.id.localeCompare(a.id));
    const pageCount = Math.max(1, Math.ceil(visible.length / 20));
    const page = Math.max(1, Math.min(pageCount, parseInt(query.get('page'), 10) || 1));
    return {
      page,
      pageCount,
      unreadCount: visible.filter((item) => !item.readAt).length,
      notifications: visible.slice((page - 1) * 20, page * 20).map((item) => {
        const post = db.posts.find((post) => post.id === item.postId);
        const actor = db.users.find((user) => user.id === item.actorId);
        return {
          id: item.id,
          kind: item.kind,
          actor:
            item.family === 'vote'
              ? null
              : actor?.status === 'active'
                ? actor.nickname
                : '탈퇴한 회원',
          title: post.title,
          commentId: item.commentId,
          createdAt: item.createdAt,
          readAt: item.readAt,
          href: `/boards/${post.board}/${encodeURIComponent(post.id)}${item.commentId ? '#comment-' + encodeURIComponent(item.commentId) : ''}`,
        };
      }),
    };
  }
  if (method === 'POST' && segments.at(-1) === 'read' && [2, 3].includes(segments.length)) {
    const items =
      segments.length === 2 ? visible : visible.filter((item) => item.id === segments[1]);
    if (segments.length === 3 && !items.length) fail(404, '알림을 찾을 수 없습니다.');
    const now = new Date().toISOString();
    for (const item of items) item.readAt ||= now;
    return { unreadCount: visible.filter((item) => !item.readAt).length };
  }
  fail(404, '알림 요청을 찾을 수 없습니다.');
}
