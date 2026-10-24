import { postSharePath } from './share-links.mjs';
import { canReadPost } from '../post-access.mjs';
import { serializePoll } from './polls';
import 'server-only';
import { outranks } from '../roles';
import { fail } from './auth';
import { nicknamePattern, nicknameFormatMessage, nicknameTakenMessage } from '../nicknames';

export const now = () => new Date().toISOString();
export function validateNickname(value, db, excludeId) {
  const nickname = typeof value === 'string' ? value.trim() : '';
  if (!nicknamePattern.test(nickname)) fail(400, nicknameFormatMessage);
  if (
    db.users.some(
      (user) =>
        user.id !== excludeId &&
        user.status === 'active' &&
        user.nickname.toLowerCase() === nickname.toLowerCase(),
    )
  )
    fail(409, nicknameTakenMessage);
  return nickname;
}
export { validImage, cleanPost } from './post-validation';

export function postForId(db, id) {
  const post = db.posts.find((item) => item.id === id && !item.deletedAt);
  if (!post) fail(404, '게시글을 찾을 수 없습니다.');
  return post;
}
export function memberForId(db, id) {
  const user = db.users.find((item) => item.id === id && item.status === 'active');
  if (!user) fail(404, '활성 회원을 찾을 수 없습니다.');
  return user;
}
export function canDeletePost(actor, author) {
  return (
    actor.id === author?.id || (actor.role === 'operator' && outranks(actor.role, author?.role))
  );
}
export function canRequest(actor, target) {
  return actor.role === 'deputy' && target && outranks(actor.role, target.role);
}
export function serializePost(db, post, viewer) {
  if (!canReadPost(post, viewer)) fail(404, '게시글을 찾을 수 없습니다.');
  const author = db.users.find((user) => user.id === post.authorId);
  const votes = db.votes.filter((vote) => vote.postId === post.id);
  const { viewReceipts, ...publicPost } = post;
  return {
    ...publicPost,
    sharePath: postSharePath(post),
    poll: serializePoll(db, post.poll, viewer),
    author: author?.status === 'withdrawn' ? '탈퇴한 회원' : author?.nickname || '탈퇴한 회원',
    authorRole: author?.status === 'active' ? author.role : null,
    authorPhoto: author?.status === 'active' ? author.photo : '',
    own: viewer.id === post.authorId,
    date: post.createdAt.slice(0, 10).replaceAll('-', '.'),
    likes: votes.filter((vote) => vote.value === 1).length,
    dislikes: post.board === 'helstagram' ? 0 : votes.filter((vote) => vote.value === -1).length,
    myVote:
      post.board === 'helstagram'
        ? votes.some((vote) => vote.userId === viewer.id && vote.value === 1)
          ? 1
          : 0
        : votes.find((vote) => vote.userId === viewer.id)?.value || 0,
    comments: db.comments.filter((comment) => comment.postId === post.id && !comment.deletedAt)
      .length,
    canDelete: canDeletePost(viewer, author),
    canEdit: viewer.id === post.authorId,
    canRequestDelete: canRequest(viewer, author) && viewer.id !== post.authorId,
  };
}
export function serializeComment(db, comment, viewer) {
  const author = db.users.find((user) => user.id === comment.authorId);
  return {
    ...comment,
    authorRole: author?.status === 'active' ? author.role : null,
    author: author?.status === 'withdrawn' ? '탈퇴한 회원' : author?.nickname || '알 수 없는 회원',
    authorPhoto: author?.status === 'active' ? author.photo : '',
    own: author?.id === viewer.id,
    date: comment.createdAt,
  };
}
