import assert from 'node:assert/strict';
import { isMuted, muteExpiry } from '../src/lib/member-mute.mjs';
import { mutedComment } from '../src/lib/server/muted-comment.mjs';

const now = Date.parse('2026-01-31T23:30:00+09:00');
const user = { mutedUntil: muteExpiry('day', now) };
assert.equal(Date.parse(user.mutedUntil) - now, 86400000);
assert.equal(Date.parse(muteExpiry('week', now)) - now, 7 * 86400000);
assert.equal(muteExpiry('month', now), '2026-02-28T14:30:00.000Z');
assert.equal(
  muteExpiry('month', Date.parse('2028-01-31T01:00:00+09:00')),
  '2028-02-28T16:00:00.000Z',
);
assert.equal(
  muteExpiry('month', Date.parse('2026-12-31T01:00:00+09:00')),
  '2027-01-30T16:00:00.000Z',
);
assert.throws(() => muteExpiry('forever', now));
assert.equal(isMuted(user, now), true);
assert.equal(isMuted(user, Date.parse(user.mutedUntil)), false);
assert.equal(isMuted({ mutedUntil: 'invalid' }, now), false);
const segmenter = new Intl.Segmenter('ko', { granularity: 'grapheme' });
for (const original of [
  '한글 댓글입니다!',
  '😀👨‍👩‍👧‍👦e\u0301 ㅋㅋ\n안녕',
  ':gear-primary-r-40-sightliner:',
  '<script>alert(1)</script>',
  '가'.repeat(1000),
]) {
  const changed = mutedComment(original, user, now);
  assert.notEqual(changed, original);
  assert.equal([...segmenter.segment(changed)].length, [...segmenter.segment(original)].length);
  assert.deepEqual(changed.match(/\s/g), original.match(/\s/g));
  assert.match(changed, /^[가-힣\s]+$/u);
  assert.equal(mutedComment(original, user, Date.parse(user.mutedUntil)), original);
  assert.equal(mutedComment(original, {}), original);
}
console.log(
  'PASS: mute expiry, Korean calendar months, emoji/grapheme length and safe random comments',
);
