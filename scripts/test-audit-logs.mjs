import assert from 'node:assert/strict';
import { auditLogDetails, auditLogEntry, auditLogList } from '../src/lib/server/audit-logs.mjs';

const createdAt = '2026-10-29T01:00:00.000Z';
const db = {
  users: [{ id: 'author', nickname: '작성 당시 닉네임', status: 'active' }],
  posts: [{ id: 'post', title: '작성 당시 제목', board: 'tierlist', createdAt }],
  comments: [
    {
      id: 'comment',
      postId: 'post',
      body: '저장하지 않을 댓글 원문',
      createdAt: '2026-10-30T01:00:00.000Z',
    },
  ],
  audit: [],
};
for (const action of [
  'post.create',
  'comment.create',
  'comment.update',
  'comment.delete',
  'poll.close',
]) {
  const targetId = action.startsWith('comment.') ? 'comment' : 'post';
  db.audit.push({
    id: action,
    action,
    actorId: 'author',
    targetId,
    createdAt,
    details: auditLogDetails(db, 'author', action, targetId),
  });
}
db.users[0].nickname = '나중에 변경한 닉네임';
db.posts[0].title = '나중에 변경한 제목';
db.posts[0].board = 'talk';
db.comments[0].deletedAt = createdAt;
const logs = auditLogList(db, new URLSearchParams('board=tierlist')).logs;
assert.equal(logs.length, 5);
assert.ok(logs.every((entry) => entry.postHref === '/boards/talk/post'));
assert.ok(
  logs.every(
    (entry) => entry.targetName === '작성 당시 제목' && entry.actorNickname === '작성 당시 닉네임',
  ),
);
assert.equal(logs.find((entry) => entry.type === 'post_create').targetCreatedAt, createdAt);
assert.equal(
  logs.find((entry) => entry.type === 'comment_delete').targetCreatedAt,
  db.comments[0].createdAt,
);
assert.equal(auditLogList(db, new URLSearchParams('board=talk')).total, 0);
assert.ok(!JSON.stringify(db.audit).includes('저장하지 않을 댓글 원문'));

// Historical creation events become visible without generating duplicate records.
db.audit.push({
  id: 'legacy',
  action: 'post.create',
  actorId: 'author',
  targetId: 'post',
  createdAt,
  details: {},
});
assert.equal(auditLogList(db, new URLSearchParams('board=talk&type=post_create')).total, 1);
assert.equal(db.audit.length, 6);
db.audit.push({
  id: 'move',
  action: 'post.move',
  actorId: 'author',
  targetId: 'post',
  createdAt,
  details: { sourceBoard: 'tierlist', targetBoard: 'talk', board: 'talk' },
});
for (const board of ['tierlist', 'talk'])
  assert.equal(auditLogList(db, new URLSearchParams({ type: 'post_move', board })).total, 1);
const commentLog = db.audit.find((entry) => entry.action === 'comment.update');
db.comments[0].deletedAt = null;
assert.equal(auditLogEntry(db, commentLog).postHref, '/boards/talk/post#comment-comment');
assert.equal(
  auditLogEntry(db, { ...commentLog, action: 'comment.vote.like' }).postHref,
  '/boards/talk/post#comment-comment',
);
db.comments[0].deletedAt = createdAt;
assert.equal(auditLogEntry(db, commentLog).postHref, '/boards/talk/post');
db.comments = [];
assert.equal(auditLogEntry(db, commentLog).postHref, '/boards/talk/post');

db.posts[0].deletedAt = createdAt;
assert.equal(auditLogEntry(db, commentLog).postHref, null);
assert.equal(auditLogEntry(db, commentLog).postDeleted, true);
delete db.posts[0].deletedAt;
assert.equal(auditLogEntry({ ...db, posts: [] }, commentLog).postHref, null);
for (const action of ['user.register', 'points.grant'])
  assert.equal(Object.hasOwn(auditLogEntry(db, { ...commentLog, action }), 'postHref'), false);

db.posts[0].status = 'draft';
assert.equal(auditLogEntry(db, commentLog).postHref, null);
assert.equal(auditLogList(db, new URLSearchParams()).total, 0);
console.log(
  'PASS: audit snapshots, current-board post links, comment anchors, deleted/missing targets, board filters and draft privacy',
);
