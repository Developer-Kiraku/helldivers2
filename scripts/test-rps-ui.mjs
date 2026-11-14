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
window.matchMedia = () => ({ matches: true });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/rps-ui-'));
let root = createRoot(document.getElementById('root'));
try {
  const outfile = path.join(directory, 'rps.cjs');
  await build({
    entryPoints: ['src/components/RockPaperScissors.jsx'],
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
          builder.onResolve({ filter: /^\.\/GameResultShare$/ }, (args) => ({
            path: args.path,
            namespace: 'shared-game-ui',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'shared-game-ui' }, () => ({
            contents: 'export default ()=>null;',
          }));
          builder.onResolve(
            { filter: /^(next\/link|\.\/CommunityProvider|\.\/ui|\.\/Modal)$/ },
            (args) => ({ path: args.path, namespace: 'stub' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === './CommunityProvider'
                ? 'export const useCommunity=()=>window.rpsContext;'
                : args.path === './Modal'
                  ? 'import React from "react";export default ({title,children,footer,onClose,className})=>React.createElement("div",{role:"dialog",className},React.createElement("h1",{},title),React.createElement("button",{onClick:onClose},"닫기"),children,footer);'
                  : args.path === 'next/link'
                    ? 'import React from "react";export default props=>React.createElement("a",props);'
                    : 'import React from "react";export const Button=props=>React.createElement("button",props);',
          }));
        },
      },
    ],
  });
  const Game = require(outfile).default;
  const initial = () => ({
    points: { current: 1000, total: 2000 },
    attempts: { daily: 5, bonus: 0, total: 5, resetsAt: Date.now() + 86400000 },
    serverTime: Date.now(),
    nextPlayableAt: 0,
    round: null,
    history: [],
    hand: { level: 0, version: 0 },
  });
  let state = initial(),
    failNext = false;
  let enhancementReceipt = null,
    loseEnhancementReply = false;
  const enhancementPosts = [];
  const posts = [],
    reads = [],
    synced = [];
  window.rpsContext = {
    user: { id: 'me', points: state.points },
    role: 'member',
    actualRole: 'member',
    syncPoints: (...args) => synced.push(args),
    api: async (url, options) => {
      if (url.startsWith('games/rps/enhance')) {
        if (options?.method === 'POST') {
          enhancementPosts.push(options.body);
          if (enhancementReceipt?.requestId !== options.body.requestId) {
            enhancementReceipt = {
              requestId: options.body.requestId,
              from: 0,
              to: 1,
              success: true,
              cost: 50,
            };
            state = {
              ...state,
              hand: { level: 1, version: 1 },
              points: { ...state.points, current: state.points.current - 50 },
            };
          }
          if (loseEnhancementReply) {
            loseEnhancementReply = false;
            throw new TypeError('연결이 끊겼습니다.');
          }
        }
        return {
          hand: state.hand,
          points: state.points,
          result: options?.method === 'POST' || url.includes('?') ? enhancementReceipt : null,
        };
      }
      if (options?.method === 'POST') {
        posts.push(options.body);
        if (failNext) {
          failNext = false;
          throw new TypeError('연결이 끊겼습니다.');
        }
        const round = {
          ...options.body,
          opponent: 'scissors',
          outcome: 'win',
          multiplier: 10,
          payout: options.body.stake * 10,
          profit: options.body.stake * 9,
          createdAt: Date.now(),
        };
        state = {
          ...state,
          points: { ...state.points, current: state.points.current + round.profit },
          attempts: {
            ...state.attempts,
            daily: state.attempts.daily - 1,
            total: state.attempts.total - 1,
          },
          round,
          history: [round],
        };
      } else reads.push(url);
      return { ...state, serverTime: Date.now() };
    },
  };
  const click = (text) =>
    React.act(async () => {
      const button = [...document.querySelectorAll('button')].find(
        (item) => item.textContent === text,
      );
      assert.ok(button, 'Button exists: ' + text);
      assert.ok(!button.disabled, 'Button is enabled: ' + text);
      button.click();
    });
  const render = () => React.act(async () => root.render(React.createElement(Game)));
  await render();
  assert.equal(document.querySelector('.rps-stakes [aria-pressed=true]').textContent, '100 P');
  assert.equal(document.querySelectorAll('.rps-stakes button').length, 4);
  assert.match(
    document.querySelector('[aria-label="승패 확률"]').textContent,
    /승리 약 33\.33% · 무승부 약 33\.33% · 패배 약 33\.33%/,
  );
  assert.ok(!document.body.textContent.includes('상대의 가위·바위·보는 각각 같은 확률'));
  const opponentHand = () => document.querySelector('.is-opponent .rps-hand').innerHTML;
  const waitingHand = opponentHand();
  await React.act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
  assert.notEqual(opponentHand(), waitingHand, 'The opponent cycles through hands while waiting');
  failNext = true;
  await click('100 P로 도전');
  const packet = posts[0];
  assert.match(document.querySelector('[role=alert]').textContent, /연결/);
  assert.equal(JSON.parse(sessionStorage.getItem('hd-rps-pending:me')).requestId, packet.requestId);
  assert.equal(document.querySelector('.rps-choice-field').disabled, true);
  await click('이전 요청 다시 확인');
  assert.deepEqual(posts[1], packet, 'Network retry keeps the same choice, amount and request ID');
  assert.equal(sessionStorage.getItem('hd-rps-pending:me'), null);
  assert.match(document.querySelector('[role=dialog]').textContent, /10배 당첨|민주주의의 대승리/);
  assert.match(document.querySelector('.rps-reward-copy').textContent, /1,000 P 지급/);
  assert.equal(synced.at(-1)[1].current, 1900);
  assert.equal(document.querySelector('.is-opponent strong').textContent, '가위');
  const revealedHand = opponentHand();
  await React.act(async () => new Promise((resolve) => setTimeout(resolve, 650)));
  assert.equal(
    opponentHand(),
    revealedHand,
    'The revealed server hand stays still after the round',
  );
  await click('확인');
  assert.equal(document.querySelector('[role=dialog]'), null);
  await click('보상 보기');
  assert.equal(posts.length, 2, 'Viewing the reward again does not play another game');
  await click('확인');
  await React.act(async () => root.unmount());
  sessionStorage.setItem('hd-rps-pending:me', JSON.stringify(packet));
  root = createRoot(document.getElementById('root'));
  await render();
  assert.ok(reads.some((url) => url.includes('?requestId=' + packet.requestId)));
  assert.equal(posts.length, 2, 'Reload recovers a settled round using only a read request');
  assert.ok(document.querySelector('[role=dialog]'));
  assert.equal(sessionStorage.getItem('hd-rps-pending:me'), null);
  state = { ...initial(), attempts: { ...initial().attempts, daily: 0, total: 0 } };
  window.rpsContext.user = { id: 'another', points: state.points };
  await render();
  assert.equal(document.querySelector('.rps-play-button').disabled, true);
  state = initial();
  window.rpsContext.user = { id: 'enhancement-test', points: state.points };
  await render();
  await click('손 강화');
  assert.match(document.querySelector('[role=dialog]').textContent, /여행자의 손/);
  assert.match(document.querySelector('.hand-forge-success').textContent, /강화 성공 확률 100%/);
  loseEnhancementReply = true;
  await click('+1 강화 · 50P');
  const enhancementRequest = enhancementPosts[0];
  assert.equal(
    JSON.parse(sessionStorage.getItem('hd-rps-enhance:enhancement-test')).requestId,
    enhancementRequest.requestId,
  );
  await click('강화 결과 다시 확인');
  assert.equal(document.querySelector('.hand-forge-button').disabled, true);
  await React.act(async () => new Promise((resolve) => setTimeout(resolve, 1400)));
  assert.deepEqual(enhancementPosts[1], enhancementRequest);
  assert.equal(state.points.current, 950, 'Retry must preserve the single charge');
  assert.equal(sessionStorage.getItem('hd-rps-enhance:enhancement-test'), null);
  assert.match(document.querySelector('.hand-forge-visual').textContent, /불씨의 손/);
  assert.match(document.querySelector('.hand-forge-result').textContent, /강화 성공!.*\+0 → \+1/);
  assert.ok(document.querySelector('.hand-success-burst'));
  loseEnhancementReply = true;
  await click('+2 강화 · 75P');
  assert.equal(
    document.querySelector('.hand-success-burst'),
    null,
    'A lost reply must not replay the previous success effect',
  );
  assert.ok(!document.querySelector('.hand-forge-result').textContent.includes('강화 성공!'));
  await click('닫기');
  assert.equal(document.querySelector('[role=dialog]'), null);
  assert.match(
    document.querySelector('[aria-label="승패 확률"]').textContent,
    /승리 약 33\.83%.*패배 약 32\.83%/,
  );
  state = { ...initial(), hand: { level: 10, version: 10 } };
  window.rpsContext.user = { id: 'hand-boundary', points: state.points };
  await render();
  assert.match(
    document.querySelector('[aria-label="승패 확률"]').textContent,
    /승리 약 40\.83%.*무승부 약 33\.33%.*패배 약 25\.83%/,
  );
  await click('손 강화');
  assert.match(document.querySelector('.hand-forge-success').textContent, /강화 성공 확률 60%/);
  assert.match(document.querySelector('.hand-forge-next').textContent, /\+10 → \+11/);
  assert.ok(!document.querySelector('.hand-forge-visual').textContent.includes('패배 확률'));
  await click('닫기');
  state = { ...initial(), hand: { level: 20, version: 20 } };
  window.rpsContext.user = { id: 'max-hand', points: state.points };
  await render();
  assert.match(
    document.querySelector('[aria-label="승패 확률"]').textContent,
    /승리 약 55\.83%.*무승부 약 33\.33%.*패배 약 10\.83%/,
  );
  await click('손 강화');
  assert.ok(document.querySelector('.hand-forge-max'));
  assert.equal(document.querySelector('.hand-forge-button'), null);
  await click('닫기');
  assert.equal(
    document.querySelector('[role=dialog]'),
    null,
    'An account change clears old rewards',
  );
  state = { ...initial(), points: { current: 49, total: 2000 } };
  window.rpsContext.user = { id: 'poor', points: state.points };
  await render();
  assert.ok(
    [...document.querySelectorAll('.rps-stakes button')].every((button) => button.disabled),
  );
  assert.equal(document.querySelector('.rps-play-button').disabled, true);
  console.log(
    'PASS: RPS default stakes, network retry, saved request recovery, reward replay, reduced motion, account reset, empty attempts and balance controls',
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
