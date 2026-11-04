import { randomUUID } from 'node:crypto';

export const defaultPointSettings = {
  post: 20,
  comment: 5,
  like: 2,
  daily: 50,
  signup: 10000,
  bonusMultiplier: 2,
};
export const doublePointBoards = ['guide', 'loadout', 'tierlist'];
export const pointSettings = (db) => ({ ...defaultPointSettings, ...db.pointSettings });
export const pointDay = (time = Date.now()) =>
  new Date(time + 9 * 3600000).toISOString().slice(0, 10);
function adjust(user, amount) {
  const balance = user.points || { total: 0, current: 0 };
  user.points = { total: balance.total + amount, current: balance.current + amount };
}
export function transferGamePoints(db, userId, sourceKey, amount, gameId) {
  const user = db.users.find((item) => item.id === userId);
  if (!user) throw Error('Game wallet owner missing');
  db.pointLedger ||= [];
  if (db.pointLedger.some((row) => row.userId === userId && row.sourceKey === sourceKey)) return;
  const points = user.points || { total: 0, current: 0 };
  if (points.current + amount < 0 && amount < 0) throw Error('Insufficient game balance');
  user.points = { ...points, current: points.current + amount };
  db.pointLedger.push({
    id: randomUUID(),
    userId,
    sourceKey,
    amount,
    gameId,
    balance: 'current',
    createdAt: new Date().toISOString(),
    reversedAt: null,
  });
}
function grant(db, userId, sourceKey, amount, references = {}) {
  const user = db.users.find((u) => u.id === userId && u.status === 'active');
  if (!user) return;
  db.pointLedger ||= [];
  if (
    db.pointLedger.some(
      (row) => row.sourceKey === sourceKey && row.userId === userId && !row.reversedAt,
    )
  )
    return;
  db.pointLedger.push({
    id: randomUUID(),
    userId,
    sourceKey,
    amount,
    ...references,
    createdAt: new Date().toISOString(),
    reversedAt: null,
  });
  adjust(user, amount);
}
function reverse(db, matches) {
  for (const row of db.pointLedger || []) {
    if (row.reversedAt || !matches(row)) continue;
    row.reversedAt = new Date().toISOString();
    const user = db.users.find((u) => u.id === row.userId);
    if (user) adjust(user, -row.amount);
  }
}
export function awardSignupPoints(db, user) {
  grant(db, user.id, 'signup:' + user.id, pointSettings(db).signup);
}
// A persistent campaign marker freezes the recipients at deployment, including dormant members.
export function awardExistingMemberPoints(db) {
  if (db.initialMemberPointGrant) return false;
  const users = db.users.filter((user) => user.status === 'active');
  for (const user of users) grant(db, user.id, 'welcome:2026-11', 10000);
  db.initialMemberPointGrant = {
    amount: 10000,
    count: users.length,
    completedAt: new Date().toISOString(),
  };
  return true;
}
export function awardDailyPoints(db, actor) {
  if (actor.actualRole) return;
  const day = pointDay();
  if (
    (db.pointLedger || []).some(
      (row) => row.userId === actor.id && row.sourceKey === 'daily:' + day,
    )
  )
    return;
  grant(db, actor.id, 'daily:' + day, pointSettings(db).daily);
}
export function syncPointActivity(db, actorId, action, targetId) {
  if (
    ![
      'post.create',
      'comment.create',
      'post.delete',
      'post.delete.approved',
      'comment.delete',
    ].includes(action) &&
    !action.startsWith('post.vote.') &&
    !action.startsWith('comment.vote.')
  )
    return;
  const isComment = action.startsWith('comment.');
  const comment = isComment && db.comments.find((c) => c.id === targetId);
  const post = db.posts.find((p) => p.id === (isComment ? comment?.postId : targetId));
  if (!post) return;
  if (action === 'post.delete' || action === 'post.delete.approved') {
    reverse(db, (row) => row.postId === post.id);
    return;
  }
  if (action === 'comment.delete') {
    reverse(db, (row) => row.commentId === comment.id);
    return;
  }
  if (post.deletedAt || post.status === 'draft' || comment?.deletedAt) return;
  const settings = pointSettings(db);
  const multiplier = doublePointBoards.includes(post.board) ? settings.bonusMultiplier : 1;
  const references = { postId: post.id, ...(comment ? { commentId: comment.id } : {}) };
  if (action === 'post.create' || action === 'comment.create') {
    grant(
      db,
      (comment || post).authorId,
      action + ':' + targetId,
      settings[comment ? 'comment' : 'post'] * multiplier,
      references,
    );
    return;
  }
  const sourceKey = (comment ? 'comment' : 'post') + '.like:' + targetId + ':' + actorId;
  if (action !== (comment ? 'comment' : 'post') + '.vote.like') {
    reverse(db, (row) => row.sourceKey === sourceKey);
    return;
  }
  const authorId = (comment || post).authorId;
  if (authorId === actorId) return;
  for (const userId of [actorId, authorId])
    grant(db, userId, sourceKey, settings.like * multiplier, references);
}
