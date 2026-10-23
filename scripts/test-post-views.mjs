import assert from 'node:assert/strict';
import { recordPostView, viewWindowMs } from '../src/lib/server/post-views.mjs';

const post = { views: 0 };
assert.equal(recordPostView(post, 'member', 1000), 1);
assert.equal(recordPostView(post, 'member', 1001), 1);
assert.equal(recordPostView(post, 'other-member', 1002), 2);
assert.equal(recordPostView(post, 'member', 1000 + viewWindowMs), 3);
assert.equal(post.viewReceipts.length, 2);
assert.equal(recordPostView({}, 'member', 1000), 1);
console.log(
  'PASS: view counting, repeat-view window, separate members and expired receipt cleanup',
);
