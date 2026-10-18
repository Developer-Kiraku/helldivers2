import { postSharePath } from './share-links.mjs';
import { serializePoll } from './polls';
import 'server-only';
import sanitizeHtml from 'sanitize-html';
import { boards } from '../data';
import { outranks } from '../roles';
import { fail } from './auth';

export const now = () => new Date().toISOString();
export function validateNickname(value, db, excludeId) {
  const nickname = typeof value === 'string' ? value.trim() : '';
  if (!/^[가-힣a-zA-Z0-9_]{2,16}$/.test(nickname)) fail(400, '닉네임은 한글·영문·숫자·밑줄 2~16자로 입력해주세요.');
  if (db.users.some(user => user.id !== excludeId && user.status === 'active' && user.nickname.toLowerCase() === nickname.toLowerCase())) fail(409, '이미 사용 중인 닉네임입니다.');
  return nickname;
}
export function validImage(value, allowLocal = false, max = 900000) {
  if (typeof value !== 'string' || value.length > max) fail(400, '이미지 크기가 허용 범위를 초과했습니다.');
  if (!value) return '';
  if (allowLocal && /^\/images\/[a-zA-Z0-9_.-]+$/.test(value)) return value;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) fail(400, 'JPG·PNG·WebP 이미지 형식만 사용할 수 있습니다.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid = match[1] === 'jpeg' ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255 : match[1] === 'png' ? bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10])) : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) fail(400, '유효한 이미지 파일을 선택해주세요.');
  return value;
}
export function cleanPost(input, board) {
  if (!boards[board]) fail(400, '게시판을 확인해주세요.');
  if (input.pinned !== undefined && typeof input.pinned !== 'boolean') fail(400, '상단 고정 여부를 확인해주세요.');
  if (input.pinned === true && board !== 'notice') fail(400, '공지사항만 상단에 고정할 수 있습니다.');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 100) fail(400, '제목은 1~100자로 입력해주세요.');
  if (!boards[board].categories.includes(input.category)) fail(400, '게시글 분류를 확인해주세요.');
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (content.length > 50000) fail(400, '본문은 50,000자 이하로 작성해주세요.');
  if (Array.isArray(input.images) && input.images.length > 5) fail(400, '본문 이미지는 최대 5개까지 넣을 수 있습니다.');
  const images = Array.isArray(input.images) ? input.images.map(image => validImage(image, true, 7000000)) : [];
  const raw = typeof input.bodyHtml === 'string' ? input.bodyHtml : '';
  if (raw.length > 12000000) fail(400, '본문 크기가 너무 큽니다.');
  const bodyHtml = sanitizeHtml(raw, {
    allowedTags: ['p','br','b','strong','i','em','u','ul','ol','li','blockquote','h2','h3','a','img'],
    allowedAttributes: { a: ['href','target','rel'], img: ['src','alt'] },
    allowedSchemes: ['http','https'], allowedSchemesByTag: { img: ['data'] },
    allowProtocolRelative: false,
    transformTags: { a: (tag, attrs) => ({ tagName: 'a', attribs: { href: attrs.href || '', target: '_blank', rel: 'noopener noreferrer' } }) },
    exclusiveFilter: frame => frame.tag === 'img' && !images.includes(frame.attribs.src),
  });
  if (!content && !images.length) fail(400, '본문을 입력해주세요.');
  return { title, category: input.category, content, bodyHtml, images, ...(board === 'notice' && input.pinned !== undefined ? { pinned: input.pinned } : {}) };
}
export function postForId(db, id) { const post = db.posts.find(item => item.id === id && !item.deletedAt); if (!post) fail(404, '게시글을 찾을 수 없습니다.'); return post; }
export function memberForId(db, id) { const user = db.users.find(item => item.id === id && item.status === 'active'); if (!user) fail(404, '활성 회원을 찾을 수 없습니다.'); return user; }
export function canDeletePost(actor, author) { return actor.id === author?.id || actor.role === 'operator' && outranks(actor.role, author?.role); }
export function canRequest(actor, target) { return actor.role === 'deputy' && target && outranks(actor.role, target.role); }
export function serializePost(db, post, viewer) {
  const author = db.users.find(user => user.id === post.authorId);
  const votes = db.votes.filter(vote => vote.postId === post.id);
  return { ...post, sharePath: postSharePath(post), poll: serializePoll(db, post.poll, viewer), author: author?.status === 'withdrawn' ? '탈퇴한 회원' : author?.nickname || '알 수 없는 회원', authorRole: author?.role || 'apprentice', authorPhoto: author?.status === 'active' ? author.photo : '', own: viewer.id === post.authorId, date: post.createdAt.slice(0, 10).replaceAll('-', '.'), likes: votes.filter(vote => vote.value === 1).length, dislikes: votes.filter(vote => vote.value === -1).length, myVote: votes.find(vote => vote.userId === viewer.id)?.value || 0, comments: db.comments.filter(comment => comment.postId === post.id && !comment.deletedAt).length, canDelete: canDeletePost(viewer, author), canEdit: viewer.id === post.authorId, canRequestDelete: canRequest(viewer, author) && viewer.id !== post.authorId };
}
export function serializeComment(db, comment, viewer) {
  const author = db.users.find(user => user.id === comment.authorId);
  return { ...comment, author: author?.status === 'withdrawn' ? '탈퇴한 회원' : author?.nickname || '알 수 없는 회원', authorPhoto: author?.status === 'active' ? author.photo : '', own: author?.id === viewer.id, date: comment.createdAt };
}
