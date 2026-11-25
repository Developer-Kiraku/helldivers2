import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { createTrainingRun } from '../src/lib/extermination.mjs';

const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost' });
const saved = new Map();
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'Event',
  'sessionStorage',
]) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
for (const [key, value] of Object.entries({
  requestAnimationFrame: () => 1,
  cancelAnimationFrame: () => {},
})) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, value });
}
HTMLElement.prototype.scrollIntoView = () => {};
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/training-ui-'));
let root;
try {
  const outfile = path.join(directory, 'ui.cjs');
  await build({
    entryPoints: ['src/components/ExterminationTraining.jsx'],
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
          builder.onResolve(
            {
              filter:
                /^(next\/link|\.\/CommunityProvider|\.\/ui|\.\/GameResultShare|@\/hooks\/useRefreshOnReturn)$/,
            },
            (args) => ({ path: args.path, namespace: 'stub' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === './CommunityProvider'
                ? 'export const useCommunity=()=>window.trainingContext;'
                : args.path === '@/hooks/useRefreshOnReturn'
                  ? 'export default ()=>{};'
                  : args.path === './GameResultShare'
                    ? 'import React from "react"; export default ({resultId,label})=>React.createElement("button",{"data-result-id":resultId,onClick:()=>window.sharedResult=resultId},label);'
                    : args.path === 'next/link'
                      ? 'import React from "react"; export default props=>React.createElement("a",props);'
                      : 'import React from "react"; export const Button=props=>React.createElement("button",props);',
          }));
        },
      },
    ],
  });
  const Game = require(outfile).default;
  const click = async (label) => {
    const button = [...document.querySelectorAll('button')].find(
      (row) => row.textContent.trim() === label,
    );
    assert.ok(button, label);
    await React.act(async () => button.click());
  };
  for (const [rank, excluded] of [
    [1, false],
    [10, false],
    [11, false],
    [null, true],
  ]) {
    let run,
      starts = 0,
      release;
    const record = {
      id: 'verified-result',
      points: 1234,
      stage: 10,
      kills: 90,
      accuracy: 80,
      elapsedMs: 100000,
      counts: [],
      income: [],
    };
    window.trainingContext = {
      user: { id: `member-${rank}` },
      actualRole: 'member',
      role: 'member',
      syncPoints: () => {},
      api: async (url, options) => {
        if (!options) return { month: '2026-11', total: 0, rankings: [], handLevel: 0 };
        if (url.endsWith('/start')) {
          starts++;
          run = createTrainingRun({ id: `run-${starts}`, userId: 'member', seed: 1 });
          run.enemies = [
            { id: 1, kind: 1, hp: 1, born: 0, expires: 3000, x: 500, y: 300, phase: 0, hitAt: 0 },
          ];
          return { run: structuredClone(run), points: {} };
        }
        return await new Promise((resolve) => {
          release = () =>
            resolve({
              run: {
                ...run,
                status: 'finished',
                reason: 'hp',
                enemies: [],
                sequence: 1,
                result: { record, rank, excluded },
              },
              points: {},
            });
        });
      },
    };
    root = createRoot(document.getElementById('root'));
    await React.act(async () => root.render(React.createElement(Game)));
    await click('훈련 시작');
    assert.ok(document.querySelector('.training-enemy.is-hit'), 'A hit enables the outline effect');
    await click('종료·정산');
    assert.equal(
      document.querySelector('.training-overlay [data-result-id]'),
      null,
      'Sharing waits for confirmed settlement',
    );
    assert.ok(!document.querySelector('.training-overlay').textContent.includes('재시작'));
    await React.act(async () => release());
    const overlay = document.querySelector('.training-overlay');
    assert.match(overlay.textContent, /게임 오버.*1,234 P 획득/);
    assert.equal(Boolean(overlay.querySelector('.training-top-rank')), !excluded && rank <= 10);
    if (rank <= 10 && !excluded)
      assert.match(
        overlay.querySelector('.training-top-rank').textContent,
        new RegExp(`${rank}위`),
      );
    const share = overlay.querySelector('[data-result-id]');
    await React.act(async () => share.click());
    assert.equal(window.sharedResult, record.id);
    await click('재시작');
    assert.equal(starts, 2);
    assert.equal(document.querySelector('.training-overlay'), null);
    assert.equal(document.querySelector('.training-result'), null);
    await React.act(async () => root.unmount());
    root = null;
    sessionStorage.clear();
  }
  console.log(
    'PASS training hit feedback, verified gameover actions, top-10 rank boundaries, sharing and fresh restart',
  );
} finally {
  if (root) await React.act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of saved) {
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  }
  await fs.rm(directory, { recursive: true, force: true });
}
