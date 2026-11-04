import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
});
const saved = new Map();
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event']) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/rankings-ui-'));
const root = createRoot(document.getElementById('root'));
try {
  const outfile = path.join(directory, 'rankings.cjs');
  await build({
    entryPoints: ['src/components/DashboardRankings.jsx'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    alias: { '@': path.resolve('src') },
    plugins: [
      {
        name: 'ui-boundaries',
        setup(builder) {
          builder.onResolve({ filter: /^(next\/link|\.\/CommunityProvider|\.\/ui)$/ }, (args) => ({
            path: args.path,
            namespace: 'stub',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === './CommunityProvider'
                ? 'export const useCommunity=()=>window.rankContext;'
                : args.path === 'next/link'
                  ? 'import React from "react";export default props=>React.createElement("a",props);'
                  : 'import React from "react";export const Button=props=>React.createElement("button",props);',
          }));
        },
      },
    ],
  });
  const Rankings = require(outfile).default;
  const calls = [];
  window.rankContext = {
    user: { id: 'me' },
    profile: { nickname: '나', photo: '' },
    role: 'member',
    api: (url) => new Promise((resolve, reject) => calls.push({ url, resolve, reject })),
  };
  const data = (count, month = null, total = 12) => ({
    month,
    total,
    hasMore: count < total,
    rankings: Array.from({ length: count }, (_, i) => ({
      id: 'r' + i,
      rank: i + 1,
      nickname: '대원' + i,
      photo: '',
      role: 'member',
      own: i === 0,
      points: 10000 - i,
      elapsedMs: 20000 + i * 1000,
      moves: 50 + i,
    })),
  });
  const panel = (name) => document.querySelector(`section[aria-label="${name} 랭킹"]`);
  const rows = (name) => panel(name).querySelectorAll('li').length;
  const clickMore = (name) => React.act(async () => panel(name).querySelector('button').click());
  const reply = (call, value) => React.act(async () => call.resolve(value));
  await React.act(async () => root.render(React.createElement(Rankings)));
  assert.deepEqual(
    calls.map((c) => c.url),
    ['rankings/points?page=1', 'rankings/puzzle?page=1'],
  );
  await reply(calls[0], data(5));
  await reply(calls[1], data(5, '2026-11'));
  assert.equal(rows('포인트'), 5);
  assert.equal(rows('퍼즐'), 5);
  assert.match(panel('포인트').textContent, /현재 보유 포인트 기준/);
  assert.match(panel('퍼즐').textContent, /2026년 11월/);
  await clickMore('포인트');
  assert.equal(calls.at(-1).url, 'rankings/points?page=2');
  assert.equal(panel('포인트').querySelector('button').disabled, true);
  await reply(calls.at(-1), data(10));
  assert.equal(rows('포인트'), 10);
  assert.equal(rows('퍼즐'), 5, 'Each ranking expands independently');
  await clickMore('포인트');
  await React.act(async () => calls.at(-1).reject(new Error('연결 오류')));
  assert.equal(rows('포인트'), 10, 'Failed requests retain already visible rows');
  assert.match(panel('포인트').querySelector('button').textContent, /다시 시도/);
  await clickMore('포인트');
  assert.equal(calls.at(-1).url, 'rankings/points?page=3', 'Retry does not skip five more ranks');
  await reply(calls.at(-1), data(12));
  assert.equal(rows('포인트'), 12);
  assert.equal(panel('포인트').querySelector('button'), null, 'More button disappears at the end');
  await clickMore('퍼즐');
  await reply(calls.at(-1), data(10, '2026-11'));
  const beforeRefresh = calls.length;
  await React.act(async () => {
    window.dispatchEvent(new Event('focus'));
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.equal(calls.length, beforeRefresh + 2, 'Returning to the page refreshes both rankings');
  const refreshedPoints = data(12);
  refreshedPoints.rankings[0].nickname = '새로운 선두';
  refreshedPoints.rankings[0].own = false;
  await reply(
    calls.findLast((c) => c.url === 'rankings/points?page=3'),
    refreshedPoints,
  );
  await reply(
    calls.findLast((c) => c.url === 'rankings/puzzle?page=2'),
    data(10, '2026-12'),
  );
  assert.equal(calls.at(-1).url, 'rankings/puzzle?page=1', 'A new month resets expansion');
  await reply(calls.at(-1), data(0, '2026-12', 0));
  assert.match(panel('포인트').textContent, /새로운 선두/);
  assert.match(panel('퍼즐').textContent, /2026년 12월.*이번 달 첫 기록/);
  assert.equal(panel('퍼즐').querySelector('button'), null);
  window.rankContext = { ...window.rankContext, user: { id: 'another' } };
  await React.act(async () => root.render(React.createElement(Rankings)));
  assert.equal(
    rows('포인트'),
    0,
    'An account change clears the prior member markers and expansion',
  );
  assert.equal(calls.at(-1).url, 'rankings/puzzle?page=1');
  console.log(
    'PASS: independent 5/10/all ranking expansion, pending/retry controls, focus refresh, month rollover, empty state and identity reset',
  );
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  await fs.rm(directory, { recursive: true, force: true });
}
