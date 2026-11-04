import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="test"></div>', { url: 'https://community.example/warbonds' });
const saved = new Map();
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event']) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
const oldFetch = globalThis.fetch;
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/session-ui-'));
let root;
try {
  await build({
    entryPoints: ['src/components/CommunityProvider.jsx'],
    outfile: path.join(directory, 'provider.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    alias: { '@': path.resolve('src') },
    plugins: [
      {
        name: 'navigation-stub',
        setup(builder) {
          builder.onResolve({ filter: /^next\/navigation$/ }, () => ({
            path: 'navigation',
            namespace: 'stub',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, () => ({
            contents:
              'export const usePathname=()=>window.testPath; export const useRouter=()=>window.testRouter;',
          }));
        },
      },
    ],
  });
  const { CommunityProvider, useCommunity } = require(path.join(directory, 'provider.cjs'));
  const redirects = [];
  window.testRouter = { replace: (url) => redirects.push(url), refresh() {} };
  window.testPath = '/warbonds';
  const member = { id: 'member', role: 'member', nickname: '대원' };
  const response = (status, data = {}) => ({ status, ok: status < 400, json: async () => data });
  const bootstrap = () =>
    response(200, {
      user: member,
      posts: { talk: [{ title: '비공개 글' }] },
      stats: { totalMembers: 1 },
      unreadMessages: 3,
    });
  let context;
  function Content() {
    context = useCommunity();
    return React.createElement('p', null, '페이지 내용');
  }
  async function mount(initialUser) {
    root = createRoot(document.getElementById('test'));
    await React.act(async () =>
      root.render(
        React.createElement(CommunityProvider, { initialUser }, React.createElement(Content)),
      ),
    );
  }
  async function unmount() {
    await React.act(async () => root.unmount());
    root = undefined;
  }

  globalThis.fetch = async () => bootstrap();
  await mount(member);
  assert.match(document.body.textContent, /페이지 내용/);
  globalThis.fetch = async () =>
    response(200, { user: member, stats: { totalMembers: 1 }, unreadMessages: 3 });
  await React.act(async () => context.refresh());
  assert.equal(
    context.posts.talk[0].title,
    '비공개 글',
    'A lightweight bootstrap preserves the existing post cache',
  );
  const returnedRequests = [];
  globalThis.fetch = async (url) => {
    returnedRequests.push(url);
    return bootstrap();
  };
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'hidden' });
  await React.act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.equal(returnedRequests.length, 0, 'Hidden screens do not revalidate');
  Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
  await React.act(async () => {
    document.dispatchEvent(new Event('visibilitychange'));
    window.dispatchEvent(new Event('focus'));
    window.dispatchEvent(new Event('online'));
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.deepEqual(
    returnedRequests,
    ['/api/bootstrap?posts=none'],
    'Non-board screens omit post bodies while resume events share one data refresh',
  );
  assert.equal(context.unreadMessages, 3);
  await React.act(async () => {
    window.dispatchEvent(new Event('focus'));
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.equal(returnedRequests.length, 1, 'Rapid refocus is throttled');
  let release;
  globalThis.fetch = (url) =>
    url === '/api/bootstrap?posts=none'
      ? new Promise((resolve) => {
          release = resolve;
        })
      : Promise.resolve(response(200));
  const pending = context.refresh();
  await React.act(async () => context.logout());
  assert.doesNotMatch(document.body.textContent, /페이지 내용/);
  await React.act(async () => {
    release(bootstrap());
    await pending;
  });
  assert.doesNotMatch(
    document.body.textContent,
    /페이지 내용/,
    'A stale response cannot restore a logged-out session',
  );
  assert.ok(redirects.includes('/login'));
  await unmount();

  globalThis.fetch = async () => response(401);
  await mount(member);
  assert.doesNotMatch(
    document.body.textContent,
    /페이지 내용/,
    'Expired sessions hide server-rendered content too',
  );
  await unmount();

  window.testPath = '/login';
  await mount(null);
  assert.match(
    document.body.textContent,
    /페이지 내용/,
    'Login remains accessible without a session',
  );
  await unmount();
  window.testPath = '/signup';
  await mount(null);
  assert.match(
    document.body.textContent,
    /페이지 내용/,
    'Signup remains accessible without a session',
  );
  console.log(
    'PASS: session expiry hides protected content, logout invalidates in-flight responses, public login/signup remain accessible',
  );
} finally {
  if (root) await React.act(async () => root.unmount());
  globalThis.fetch = oldFetch;
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  dom.window.close();
  await fs.rm(directory, { recursive: true, force: true });
}
