import assert from 'node:assert/strict';
import { awardDailyPoints, syncPointActivity, pointDay } from '../src/lib/server/points.mjs';
assert.equal(pointDay(Date.parse('2026-11-04T14:59:59Z')), '2026-11-04');
assert.equal(pointDay(Date.parse('2026-11-04T15:00:00Z')), '2026-11-05');
for (const board of [
  'talk',
  'guide',
  'loadout',
  'tierlist',
  'notice',
  'qna',
  'report',
  'helstagram',
]) {
  const db = {
    users: [
      { id: 'a', status: 'active' },
      { id: 'b', status: 'active' },
    ],
    posts: [{ id: 'p', board, authorId: 'a', status: 'published' }],
    comments: [{ id: 'c', postId: 'p', authorId: 'b' }],
  };
  const multiplier = ['guide', 'loadout', 'tierlist'].includes(board) ? 2 : 1;
  syncPointActivity(db, 'a', 'post.create', 'p');
  syncPointActivity(db, 'a', 'post.create', 'p');
  syncPointActivity(db, 'b', 'comment.create', 'c');
  syncPointActivity(db, 'b', 'post.vote.like', 'p');
  assert.equal(db.users[0].points.total, 22 * multiplier);
  assert.equal(db.users[1].points.total, 7 * multiplier);
  db.users[0].points.current -= 10; // A future purchase must not alter cumulative earnings.
  db.pointSettings = { post: 77, like: 99, bonusMultiplier: 3 };
  syncPointActivity(db, 'b', 'post.vote.like_cancel', 'p');
  assert.deepEqual(db.users[0].points, { total: 20 * multiplier, current: 20 * multiplier - 10 });
  syncPointActivity(db, 'a', 'post.delete', 'p');
  assert.deepEqual(db.users[0].points, { total: 0, current: -10 });
  assert.deepEqual(db.users[1].points, { total: 0, current: 0 });
}
const draftDb = {
  users: [{ id: 'a', status: 'active' }],
  posts: [{ id: 'p', board: 'tierlist', authorId: 'a', status: 'draft' }],
  comments: [],
};
syncPointActivity(draftDb, 'a', 'post.create', 'p');
assert.equal(draftDb.users[0].points, undefined);
draftDb.posts[0].status = 'published';
syncPointActivity(draftDb, 'a', 'post.create', 'p');
assert.equal(draftDb.users[0].points.total, 40);
const actor = draftDb.users[0];
awardDailyPoints(draftDb, { ...actor, actualRole: 'operator' });
assert.equal(actor.points.total, 40);
awardDailyPoints(draftDb, actor);
awardDailyPoints(draftDb, actor);
assert.equal(actor.points.total, 90);
console.log(
  'PASS: point rules across eight boards, draft publication, KST daily boundaries, replay-safe grants, exact refunds and separate spendable/cumulative balances',
);
