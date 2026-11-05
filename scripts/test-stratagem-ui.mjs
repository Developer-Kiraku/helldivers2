import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { challengeStages } from '../src/lib/stratagem-challenge.mjs';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/games/stratagem' });
const saved = new Map();
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'Event',
  'sessionStorage',
  'requestAnimationFrame',
  'cancelAnimationFrame',
]) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, {
    configurable: true,
    value:
      key === 'requestAnimationFrame'
        ? (fn) => {
            fn();
            return 1;
          }
        : key === 'cancelAnimationFrame'
          ? () => {}
          : dom.window[key],
  });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
window.matchMedia = () => ({ matches: true });
Object.defineProperty(document, 'visibilityState', { configurable: true, value: 'visible' });
HTMLElement.prototype.scrollIntoView = () => {};
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const root = createRoot(document.getElementById('root'));
const directory = await fs.mkdtemp(path.resolve('work/stratagem-ui-'));
try {
  const outfile = path.join(directory, 'ui.cjs');
  await build({
    entryPoints: ['src/components/StratagemChallenge.jsx'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    alias: { '@': path.resolve('src') },
    plugins: [
      {
        name: 'stubs',
        setup(builder) {
          builder.onResolve({ filter: /^(\.\/CommunityProvider|\.\/ui)$/ }, (args) => ({
            path: args.path,
            namespace: 'stub',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === './CommunityProvider'
                ? 'export const useCommunity=()=>window.context;'
                : 'import React from "react";export const Button=({primary,...props})=>React.createElement("button",props);',
          }));
        },
      },
    ],
  });
  const Game = require(outfile).default,
    calls = [];
  window.context = {
    user: { id: 'me', points: { current: 1000 } },
    role: 'member',
    actualRole: 'member',
    syncPoints() {},
    api: (name, options) =>
      new Promise((resolve, reject) => calls.push({ name, options, resolve, reject })),
  };
  const reply = (data, index = calls.length - 1) =>
    React.act(async () => calls[index].resolve(data));
  const state = (run) => ({ serverTime: 10000, points: { current: 900, total: 1000 }, run });
  const button = (text) =>
    [...document.querySelectorAll('button')].find((el) => el.textContent.includes(text));
  await React.act(async () => root.render(React.createElement(Game)));
  await reply({ ...state(null), points: { current: 1000, total: 1000 } });
  assert.match(document.body.textContent, /10단계의 신호/);
  const rewards = [...document.querySelectorAll('.stratagem-rewards li')];
  assert.equal(rewards.length, 10);
  assert.match(rewards[6].textContent, /목표/);
  assert.match(rewards[9].textContent, /2,000.*명령 13개.*23초.*최종/);
  await React.act(async () => {
    button('100P로 도전 시작').click();
    button('100P로 도전 시작').click();
  });
  assert.equal(calls.filter((c) => c.name.endsWith('/start')).length, 1);
  const started = calls.at(-1).options.body.requestId;
  const run = {
    id: 'run',
    requestId: started,
    status: 'playing',
    stage: 1,
    stages: challengeStages,
    completed: 0,
    readyAt: 10000,
    deadlineAt: 10000 + challengeStages[0].seconds * 1000,
    command: {
      token: 'token',
      code: 'RRU',
      src: '/equipment/stratagem-orbital-precision-strike.webp',
      label: '궤도 정밀 타격',
    },
  };
  await reply(state(run));
  assert.ok(
    [...document.querySelectorAll('.stratagem-dpad button')].every((el) => !el.disabled),
    'The first input is enabled as soon as the command appears',
  );
  assert.equal(document.activeElement, document.querySelector('.stratagem-console'));
  const press = (key) =>
    React.act(async () =>
      document
        .querySelector('.stratagem-console')
        .dispatchEvent(
          new window.KeyboardEvent('keydown', { key, bubbles: true, cancelable: true }),
        ),
    );
  await press('ArrowRight');
  assert.equal(document.querySelectorAll('.stratagem-code .is-done').length, 1);
  await press('ArrowLeft');
  assert.equal(document.querySelectorAll('.stratagem-code .is-done').length, 0);
  assert.match(document.querySelector('.stratagem-feedback').textContent, /처음부터/);
  const field = document.createElement('input');
  document.body.appendChild(field);
  field.focus();
  await React.act(async () =>
    field.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'd', code: 'KeyD', bubbles: true }),
    ),
  );
  assert.equal(
    document.querySelectorAll('.stratagem-code .is-done').length,
    0,
    'Typing in an input must not control the game',
  );
  field.remove();
  await React.act(async () =>
    window.dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'd',
        code: 'KeyD',
        ctrlKey: true,
        cancelable: true,
      }),
    ),
  );
  assert.equal(document.querySelectorAll('.stratagem-code .is-done').length, 0);
  await React.act(async () => document.querySelector('[aria-label="오른쪽"]').click());
  await React.act(async () =>
    document.body.dispatchEvent(
      new window.KeyboardEvent('keydown', {
        key: 'Process',
        code: 'KeyD',
        isComposing: true,
        bubbles: true,
        cancelable: true,
      }),
    ),
  );
  assert.equal(
    document.querySelectorAll('.stratagem-code .is-done').length,
    2,
    'Korean IME and focus outside the game still use the physical WASD key',
  );
  await React.act(async () =>
    window.dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowRight', repeat: true, cancelable: true }),
    ),
  );
  assert.equal(document.querySelectorAll('.stratagem-code .is-done').length, 2);
  await press('ArrowUp');
  assert.equal(calls.at(-1).options.body.answer, 'RRU');
  assert.ok([...document.querySelectorAll('.stratagem-dpad button')].every((el) => el.disabled));
  for (let completed = 1; completed < 5; completed++) {
    await reply(
      state({ ...run, completed, command: { ...run.command, token: 'token-' + completed } }),
    );
    assert.match(
      document.querySelector('.stratagem-progress').textContent,
      new RegExp(`명령 ${completed + 1}.*5`),
    );
    assert.equal(button('100P 받고 종료'), undefined);
    await press('ArrowRight');
    await press('ArrowRight');
    await press('ArrowUp');
  }
  await reply(state({ ...run, status: 'checkpoint', command: null, completed: 5 }));
  assert.ok(button('100P 받고 종료'));
  await React.act(async () => button('100P 받고 종료').click());
  const payoutPacket = calls.at(-1).options.body;
  await React.act(async () => calls.at(-1).reject(new Error('연결이 끊겼습니다')));
  assert.match(document.querySelector('[role="alert"]').textContent, /연결/);
  await React.act(async () => button('다시 확인').click());
  assert.deepEqual(calls.at(-1).options.body, payoutPacket, 'Network retry uses the same run');
  await reply({
    ...state({ ...run, status: 'cashed', payout: 100, command: null }),
    points: { current: 1000, total: 1000 },
  });
  assert.match(document.querySelector('.stratagem-message').textContent, /100 P 지급/);
  assert.equal(sessionStorage.length, 0);
  for (const status of ['playing', 'checkpoint', 'cashed', 'completed', 'failed']) {
    await React.act(async () => root.render(null));
    sessionStorage.setItem(
      'hd-stratagem-pending:me',
      JSON.stringify({
        action: 'start',
        body: { requestId: 'old-request' },
      }),
    );
    const before = calls.length;
    await React.act(async () =>
      root.render(React.createElement(React.StrictMode, null, React.createElement(Game))),
    );
    assert.equal(calls.at(-1).name, 'games/stratagem', 'Entry never replays saved mutations');
    await reply(state({ ...run, status }));
    if (['playing', 'checkpoint'].includes(status)) {
      assert.equal(calls.at(-1).name, 'games/stratagem/reset');
      assert.equal(calls.at(-1).options.body.runId, run.id);
      assert.equal(
        button('100P로 도전 시작'),
        undefined,
        'Wait for old-game settlement before starting',
      );
      if (status === 'checkpoint') {
        await React.act(async () => calls.at(-1).reject(new Error('reset connection lost')));
        await React.act(async () => button('다시 확인').click());
        await reply(state({ ...run, status: 'cashed' }));
      } else await reply(state(null));
    }
    assert.equal(calls.slice(before).filter((c) => c.name.endsWith('/start')).length, 0);
    assert.match(
      document.querySelector('.stratagem-message').textContent,
      /손끝으로 완성하는 민주주의/,
    );
    assert.ok(!button('100P로 도전 시작').disabled);
    assert.equal(sessionStorage.length, 0);
  }
  await React.act(async () => button('100P로 도전 시작').click());
  assert.equal(calls.at(-1).options.body.replacePrevious, true);
  await reply(state(run));
  const resets = calls.filter((c) => c.name.endsWith('/reset')).length;
  const beforeFocus = calls.length;
  await React.act(async () => {
    window.dispatchEvent(new window.Event('focus'));
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.equal(calls.length, beforeFocus + 1);
  assert.equal(calls.at(-1).name, 'games/stratagem');
  await reply(state(run));
  assert.equal(calls.filter((c) => c.name.endsWith('/reset')).length, resets);
  assert.ok(document.querySelector('.stratagem-code'), 'Returning focus keeps this visit’s game');
  console.log(
    'PASS: stratagem keyboard/touch, fresh entry/reload, stale-request removal, reset recovery, same-visit focus, payout recovery and current-game result',
  );
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of saved)
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  await fs.rm(directory, { recursive: true, force: true });
}
