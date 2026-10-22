import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { postSummary } from '../src/lib/post-summary.mjs';
import { shareMessage } from '../src/lib/kakao-share.js';
import { sharePreview } from '../src/lib/server/share-preview.mjs';
import {
  postSnapshot,
  postHistoryDetails,
  historyEntry,
  postHistoryList,
} from '../src/lib/server/post-history.mjs';

const post = {
  id: 'p1',
  board: 'guide',
  authorId: 'u1',
  title: '"><script>alert(1)</script>',
  category: '운영',
  content: '분대 생존 팁\n\n' + '😀'.repeat(140),
  bodyHtml: '<p>분대 생존 팁</p>',
  images: ['data:image/png;base64,private-image'],
};
assert.equal(Array.from(postSummary(post)).length, 120);
assert.ok(postSummary(post).endsWith('…'));
assert.equal(
  postSummary({ content: '', bodyHtml: '<p>A &amp; B</p><script>secret</script><p>&#x1F600;</p>' }),
  'A & B 😀',
);
assert.equal(postSummary({ content: '', images: ['photo'] }), '사진이 첨부된 게시글입니다.');
const message = shareMessage(
  post,
  'https://example.com/s/abcdefghijklmnop',
  'https://example.com/image.png',
);
assert.equal(message.content.title, post.title);
assert.equal(message.content.description, postSummary(post));
const doc = new JSDOM(sharePreview(post, 'https://example.com/s/abcdefghijklmnop')).window.document;
assert.equal(doc.querySelector('meta[property="og:title"]').content, post.title);
assert.equal(doc.querySelector('meta[property="og:description"]').content, postSummary(post));
assert.equal(doc.querySelectorAll('script').length, 1);
assert.equal(doc.querySelector('script').textContent, "location.replace('/login');");
assert.ok(!doc.documentElement.outerHTML.includes('private-image'));
assert.equal(
  doc.querySelector('meta[property="og:image"]').content,
  'https://example.com/images/community-squad.png',
);

const actor = { id: 'u1', nickname: '원래작업자', role: 'member' };
const before = postSnapshot(post),
  after = postSnapshot({ ...post, title: '새 제목', content: '수정한 본문' });
assert.ok(!JSON.stringify(before).includes('private-image'));
const details = postHistoryDetails(actor, before, after);
assert.deepEqual(details.changedFields, ['title', 'content']);
const log = {
  id: 'log1',
  targetId: 'p1',
  actorId: actor.id,
  action: 'post.update',
  createdAt: '2026-10-22T13:00:00Z',
  details,
};
const legacy = { ...log, id: 'legacy', details: {} };
const db = {
  audit: [log, legacy],
  users: [{ ...actor, nickname: '변경된닉네임' }],
  posts: [{ ...post, deletedAt: '2026-10-23T00:00:00Z' }],
};
assert.equal(historyEntry(db, log).actorNickname, '원래작업자');
assert.equal(historyEntry(db, log).deleted, true);
assert.ok(!('before' in historyEntry(db, log)));
assert.deepEqual(historyEntry(db, log, true).before, before);
assert.equal(historyEntry(db, legacy, true).hasSnapshot, false);
assert.equal(postHistoryList(db, new URLSearchParams('q=새 제목')).total, 1);
assert.equal(postHistoryList(db, new URLSearchParams('action=post.delete')).total, 0);
assert.equal(postHistoryList(db, new URLSearchParams('board=talk')).total, 0);
assert.equal(postHistoryList(db, new URLSearchParams('page=Infinity')).page, 1);
db.audit = Array.from({ length: 25 }, (_, index) => ({ ...log, id: String(index) }));
assert.equal(postHistoryList(db, new URLSearchParams('page=2')).logs.length, 5);
console.log(
  'PASS: bounded share excerpts, HTML escaping, private attachment exclusion, revision snapshots, legacy logs, filters and pagination',
);
