import assert from 'node:assert/strict';
import { reserveLoginAttempt } from '../src/lib/server/login-throttle.mjs';
import { registerOAuthState, consumeOAuthState } from '../src/lib/server/oauth-state.mjs';
import { canReadPost } from '../src/lib/post-access.mjs';
for (const board of ['guide', 'report', 'tierlist', 'loadout']) {
  for (const status of ['published', 'draft'])
    assert.equal(canReadPost({ board, status, authorId: 'author' }, null), false);
}
assert.equal(canReadPost({ board: 'guide' }, { id: 'member', role: 'member' }), true);
assert.equal(
  canReadPost({ board: 'report', authorId: 'author' }, { id: 'member', role: 'member' }),
  false,
);
assert.equal(
  canReadPost({ board: 'report', authorId: 'author' }, { id: 'author', role: 'apprentice' }),
  true,
);
assert.equal(
  canReadPost({ board: 'report', authorId: 'author' }, { id: 'staff', role: 'deputy' }),
  true,
);
const db = {};
for (let i = 0; i < 8; i++) assert.equal(reserveLoginAttempt(db, 'account', 1000 + i), true);
assert.equal(reserveLoginAttempt(db, 'account', 1010), false);
assert.equal(reserveLoginAttempt(JSON.parse(JSON.stringify(db)), 'account', 1010), false);
assert.ok(!JSON.stringify(db).includes('account'));
assert.equal(reserveLoginAttempt(db, 'account', 62000), true);
assert.equal(registerOAuthState(db, 'one', null, 0), true);
assert.equal(consumeOAuthState(db, 'wrong', 1), false);
assert.equal(consumeOAuthState(db, 'one', 1), true);
assert.equal(consumeOAuthState(db, 'one', 1), false);
registerOAuthState(db, 'old', null, 1000);
registerOAuthState(db, 'new', 'old', 1001);
assert.equal(consumeOAuthState(db, 'old', 1002), false);
assert.equal(consumeOAuthState(db, 'new', 602000), false);
console.log(
  'PASS: persistent account throttling, hashed identifiers, expiry, OAuth state single use and replacement',
);
