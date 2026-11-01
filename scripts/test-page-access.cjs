const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const { randomBytes, createHash } = require('node:crypto');

module.exports = async function testPageAccess({ guest, client, file }) {
  const { boards } = await import('../src/lib/data.js');
  const { warbonds } = await import('../src/lib/warbonds.mjs');
  // Discover pages automatically so new routes are covered by the same policy.
  const files = await fs.readdir('src/app', { recursive: true });
  const routes = new Set(['/unknown-page', '/boards/unknown', '/warbonds/unknown']);
  for (const file of files.filter((name) => /(^|[\\/])page\.(?:[jt]sx?|mjs)$/.test(name))) {
    const segments = file
      .split(/[\\/]/)
      .slice(0, -1)
      .filter((part) => !part.startsWith('('));
    if (['login', 'signup'].includes(segments[0])) continue;
    for (const board of segments.includes('[board]') ? Object.keys(boards) : ['']) {
      routes.add(
        '/' +
          segments
            .map((part) =>
              part === '[board]'
                ? board
                : part === '[slug]'
                  ? warbonds[0].slug
                  : part === '[id]'
                    ? 'missing-post'
                    : part,
            )
            .join('/'),
      );
    }
  }
  const forged = client('hd_session=' + 'a'.repeat(64));
  async function rscRequest(route, prefetch) {
    const headers = { RSC: '1', ...(prefetch ? { 'Next-Router-Prefetch': '1' } : {}) };
    let result = await guest.call(route, 'GET', undefined, [200, 307, 404], headers);
    const location = result.response.headers.get('location');
    // Next normalizes RSC cache keys with a same-page redirect before rendering.
    if (location && location !== '/login') {
      const normalized = new URL(location, 'http://localhost');
      assert.equal(normalized.pathname, route);
      assert.ok(normalized.searchParams.has('_rsc'));
      result = await guest.call(
        normalized.pathname + normalized.search,
        'GET',
        undefined,
        [200, 307, 404],
        headers,
      );
    }
    assert.doesNotMatch(result.data, /warbond-reward-copy|warbond-page-content|WARBOND ARCHIVE/);
    if (result.response.status === 307) {
      assert.equal(result.response.headers.get('location'), '/login');
    } else if (prefetch) {
      // A route-tree-only prefetch has no rendered component payload or page data.
      assert.doesNotMatch(result.data, /:I\[|\["\$"/);
      assert.match(result.data, /"r":\[null,null\]/);
    } else {
      assert.match(result.data, /NEXT_REDIRECT;replace;\/login;307;/);
    }
  }
  for (const route of routes) {
    for (const actor of [guest, forged]) {
      const { data, response } = await actor.call(route, 'GET', undefined, 307);
      assert.equal(
        new URL(response.headers.get('location'), 'http://localhost').pathname,
        '/login',
        route,
      );
      assert.doesNotMatch(data, /warbond-reward-copy|warbond-page-content/);
    }
    // Client navigation/prefetch must not bypass the page's session check.
    await rscRequest(route, false);
    await rscRequest(route, true);
  }
  for (const route of ['/warbonds', '/messages', '/boards/guide']) {
    await guest.call(route, 'HEAD', undefined, 307);
  }
  for (const route of [
    '/api/bootstrap',
    '/api/posts/missing-post',
    '/api/messages',
    '/api/admin/logs',
  ]) {
    await guest.call(route, 'GET', undefined, 401);
    await forged.call(route, 'GET', undefined, 401);
  }
  await guest.call('/maps/embed?provider=google&address=test', 'GET', undefined, 401);
  const db = JSON.parse(await fs.readFile(file, 'utf8'));
  const token = randomBytes(32).toString('hex');
  db.sessions.push({
    tokenHash: createHash('sha256').update(token).digest('hex'),
    userId: 'u-user1',
    createdAt: '2020-01-01T00:00:00.000Z',
    expiresAt: '2020-01-02T00:00:00.000Z',
  });
  await fs.writeFile(file, JSON.stringify(db));
  const expired = client('hd_session=' + token);
  for (const route of ['/warbonds', '/messages', `/warbonds/${warbonds[0].slug}`])
    await expired.call(route, 'GET', undefined, 307);
  await expired.call('/api/bootstrap', 'GET', undefined, 401);
  console.log(
    `Page access: ${routes.size} routes reject guests/forged sessions and RSC prefetch; HEAD, expired sessions and protected APIs passed.`,
  );
};
