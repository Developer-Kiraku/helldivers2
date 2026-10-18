import assert from 'node:assert/strict';
import { applicationUrl } from '../src/lib/server/application-url.mjs';

for (const path of ['/signup', '/', '/login?error=kakao-auth-failed']) {
  const result = applicationUrl(path, 'https://0.0.0.0:10000/api/auth/kakao/callback', 'https://helldivers2.onrender.com');
  assert.equal(result.origin, 'https://helldivers2.onrender.com');
  assert.equal(result.pathname + result.search, path);
}
assert.equal(applicationUrl('/signup', 'http://localhost:3000/api/auth/kakao/callback', '').href, 'http://localhost:3000/signup');
for (const path of ['https://attacker.example', '//attacker.example', '/\\attacker.example']) assert.throws(() => applicationUrl(path, 'https://0.0.0.0:10000', 'https://helldivers2.onrender.com'));
console.log('PASS: public Render redirect origins, local fallback and external redirect rejection');
