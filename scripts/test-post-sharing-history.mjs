import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { postSummary } from '../src/lib/post-summary.mjs';
import {
  shareMessage,
  isMobileShareDevice,
  supportsKakaoWebShare,
} from '../src/lib/kakao-share.js';
import { sharePreview } from '../src/lib/server/share-preview.mjs';
import { auditLogList } from '../src/lib/server/audit-logs.mjs';
import { withdrawMember, settleProbation, startProbation } from '../src/lib/server/probation.mjs';
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
const joinedAt = '2026-10-01T01:00:00Z';
const member = {
  id: 'member1',
  nickname: '가입닉네임',
  status: 'active',
  role: 'member',
  createdAt: joinedAt,
};
const membership = { users: [member], posts: [], sessions: [], audit: [] };
const departure = withdrawMember(membership, member, 'self');
membership.audit.push({
  id: 'leave',
  action: 'user.withdraw',
  actorId: member.id,
  targetId: member.id,
  createdAt: '2026-10-22T01:00:00Z',
  details: departure,
});
membership.audit.push({
  id: 'join',
  action: 'user.register',
  actorId: member.id,
  targetId: member.id,
  createdAt: joinedAt,
  details: { actorNickname: '가입닉네임', targetNickname: '가입닉네임', targetCreatedAt: joinedAt },
});
const leaves = auditLogList(membership, new URLSearchParams('type=member_leave')).logs;
assert.equal(leaves.length, 1);
assert.equal(leaves[0].targetName, '가입닉네임');
assert.equal(leaves[0].actorNickname, '가입닉네임');
assert.equal(leaves[0].targetCreatedAt, joinedAt);
assert.equal(
  auditLogList(membership, new URLSearchParams('type=member_join')).logs[0].targetName,
  '가입닉네임',
);
assert.deepEqual(
  Object.keys(leaves[0]).sort(),
  [
    'actorNickname',
    'automatic',
    'executedAt',
    'id',
    'targetCreatedAt',
    'targetName',
    'reason',
    'type',
  ].sort(),
);
assert.ok(!JSON.stringify(leaves).includes('passwordHash'));
const probation = {
  id: 'expired1',
  nickname: '만료대원',
  status: 'active',
  role: 'apprentice',
  createdAt: '2026-01-01T00:00:00Z',
};
startProbation(probation);
membership.users.push(probation);
settleProbation(membership, '2026-10-22T00:00:00Z');
const automatic = auditLogList(membership, new URLSearchParams('q=만료대원')).logs[0];
assert.equal(automatic.actorNickname, '시스템');
assert.equal(automatic.targetName, '만료대원');
assert.equal(automatic.automatic, true);
assert.equal(automatic.targetCreatedAt, probation.createdAt);
db.audit = Array.from({ length: 25 }, (_, index) => ({ ...log, id: String(index) }));
assert.equal(auditLogList(db, new URLSearchParams('page=2')).logs.length, 10);
assert.equal(auditLogList(db, new URLSearchParams('page=3')).logs.length, 5);
assert.equal(auditLogList(db, new URLSearchParams('type=member_join')).total, 0);
assert.equal(auditLogList(db, new URLSearchParams('q=새 제목')).total, 25);
assert.equal(auditLogList(db, new URLSearchParams('page=Infinity')).page, 1);
console.log(
  'PASS: compact classified logs, original nicknames after withdrawal, join dates, automatic withdrawal attribution, restricted fields and ten-row pagination',
);
membership.users.push({ id: 'operator', nickname: '운영자', role: 'operator', status: 'active' });
membership.requests = [{ id: 'expel-request', reason: '운영 규칙 위반' }];
membership.audit.push({
  id: 'expel1',
  action: 'user.expel.approved',
  actorId: 'operator',
  targetId: member.id,
  createdAt: joinedAt,
  details: { requestId: 'expel-request', targetNickname: '강퇴대원', targetCreatedAt: joinedAt },
});
membership.audit.push({
  id: 'expel2',
  action: 'user.expel',
  actorId: 'operator',
  targetId: member.id,
  createdAt: joinedAt,
  details: { reason: '직접 강퇴 사유' },
});
membership.audit.push({
  id: 'legacy-forced',
  action: 'user.withdraw',
  actorId: 'operator',
  targetId: member.id,
  createdAt: joinedAt,
  details: {},
});
const expulsions = auditLogList(membership, new URLSearchParams('type=member_expel'));
assert.equal(expulsions.total, 3);
assert.equal(expulsions.logs.find((entry) => entry.id === 'expel1').reason, '운영 규칙 위반');
assert.equal(expulsions.logs.find((entry) => entry.id === 'expel2').reason, '직접 강퇴 사유');
assert.equal(expulsions.logs.find((entry) => entry.id === 'legacy-forced').type, 'member_expel');
assert.equal(
  isMobileShareDevice({ userAgent: 'Mozilla Windows NT Chrome', platform: 'Win32' }),
  false,
);
assert.equal(isMobileShareDevice({ userAgent: 'Mozilla Android Mobile' }), true);
assert.equal(isMobileShareDevice({ userAgent: 'Mozilla iPhone' }), true);
assert.equal(
  isMobileShareDevice({ userAgent: 'Mozilla Mac', platform: 'MacIntel', maxTouchPoints: 5 }),
  true,
);
assert.equal(supportsKakaoWebShare({ Share: { sendDefault() {} } }, { open() {} }), true);
assert.equal(supportsKakaoWebShare({ Share: {} }, { open() {} }), false);
assert.equal(supportsKakaoWebShare({ Share: { sendDefault() {} } }, {}), false);
console.log(
  'PASS: direct/approved expulsion labels, legacy requests and reasons, mobile device detection and desktop SDK capability checks',
);

const { sendKakaoShare, loadKakaoShare } = await import('../src/lib/kakao-share.js');
const popupBrowser = { open: () => null };
const savedOpen = popupBrowser.open;
assert.throws(
  () => sendKakaoShare({ Share: { sendDefault: () => popupBrowser.open() } }, {}, popupBrowser),
  /차단/,
);
assert.equal(popupBrowser.open, savedOpen);
assert.throws(
  () =>
    sendKakaoShare(
      {
        Share: {
          sendDefault: () => {
            throw Error('SDK error');
          },
        },
      },
      {},
      popupBrowser,
    ),
  /SDK error/,
);
assert.equal(popupBrowser.open, savedOpen);
await assert.rejects(loadKakaoShare(''), /키가 등록되지/);
console.log('PASS: blocked popup feedback, window.open restoration and missing-key rejection');

const voteHistory = {
  users: [{ id: 'voter', nickname: '탈퇴한 회원', status: 'withdrawn' }],
  posts: [],
  audit: ['like', 'dislike', 'like_cancel', 'dislike_cancel'].map((action, index) => ({
    id: `vote-${index}`,
    action: `post.vote.${action}`,
    actorId: 'voter',
    targetId: 'removed-post',
    createdAt: `2026-10-23T10:00:0${index}Z`,
    details: {
      actorNickname: '원래 대원',
      targetTitle: '원래 글 제목',
      targetCreatedAt: '2026-10-01T00:00:00Z',
    },
  })),
};
for (const type of ['post_like', 'post_dislike', 'post_like_cancel', 'post_dislike_cancel']) {
  const result = auditLogList(voteHistory, new URLSearchParams({ type, q: '원래 대원' }));
  assert.equal(result.total, 1);
  assert.equal(result.logs[0].targetName, '원래 글 제목');
  assert.equal(result.logs[0].targetCreatedAt, '2026-10-01T00:00:00Z');
  assert.equal(result.logs[0].actorNickname, '원래 대원');
}
console.log(
  'PASS: classified vote/cancellation history retains original nickname, title and post creation date',
);
