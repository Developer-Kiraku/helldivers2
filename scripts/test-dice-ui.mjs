import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { dicePollDelay } from '../src/lib/dice-rules.mjs';
assert.equal(dicePollDelay({ onGame: false, visible: true, activeGame: false }), 5000);
assert.equal(dicePollDelay({ onGame: false, visible: true, activeGame: true }), 1000);
assert.equal(dicePollDelay({ onGame: true, visible: true, activeGame: false }), 1000);
assert.equal(dicePollDelay({ onGame: true, visible: false, activeGame: true }), 15000);
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/games/dice' });
const saved = new Map();
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'Event',
  'requestAnimationFrame',
  'cancelAnimationFrame',
  'setTimeout',
  'clearTimeout',
  'setInterval',
  'clearInterval',
])
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event'])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const timers = new Map();
let timerId = 0;
globalThis.setTimeout = globalThis.setInterval = (fn, ms) => {
  const id = ++timerId;
  timers.set(id, { fn, ms });
  return id;
};
globalThis.clearTimeout = globalThis.clearInterval = (id) => timers.delete(id);
globalThis.requestAnimationFrame = (fn) => {
  fn();
  return 1;
};
globalThis.cancelAnimationFrame = () => {};
window.matchMedia = () => ({ matches: false });
const scrolls = [];
HTMLElement.prototype.scrollIntoView = function (options) {
  scrolls.push({ node: this, options });
};
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/dice-ui-'));
const root = createRoot(document.getElementById('root'));
try {
  const outfile = path.join(directory, 'dice.cjs');
  await build({
    stdin: {
      contents:
        'export {default as Provider,useDiceGame} from "./src/components/DiceGameProvider.jsx"; export {default as Game} from "./src/components/DiceGame.jsx";',
      resolveDir: process.cwd(),
    },
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    alias: { '@': path.resolve('src') },
    plugins: [
      {
        name: 'boundaries',
        setup(builder) {
          builder.onResolve(
            { filter: /^(next\/navigation|\.\/CommunityProvider|\.\/ui|\.\/Modal|\.\/Avatar)$/ },
            (args) => ({ path: args.path, namespace: 'stub' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === 'next/navigation'
                ? 'export const usePathname=()=>window.dicePath||"/games/dice";export const useRouter=()=>window.diceRouter;'
                : args.path === './CommunityProvider'
                  ? 'export const useCommunity=()=>window.diceCommunity;'
                  : args.path === './ui'
                    ? 'import React from "react";export const Button=props=>React.createElement("button",props);'
                    : args.path === './Avatar'
                      ? 'export default ()=>null;'
                      : 'import React from "react";export default ({children,footer})=>React.createElement("div",{role:"dialog"},children,footer);',
          }));
        },
      },
    ],
  });
  const { Provider, useDiceGame, Game } = require(outfile);
  const calls = [];
  const api = (name, options) => new Promise((resolve) => calls.push({ name, options, resolve }));
  window.diceRouter = { push() {} };
  window.diceCommunity = {
    user: { id: 'me', points: { current: 10000 } },
    role: 'member',
    actualRole: 'member',
    api,
    syncPoints() {},
  };
  let probe;
  function App() {
    probe = useDiceGame();
    return React.createElement(Game);
  }
  const render = () => root.render(React.createElement(Provider, null, React.createElement(App)));
  const game = (id, peer, nickname, status = 'invited', revision = 1) => ({
    id,
    hostId: 'me',
    status,
    revision,
    stake: 100,
    round: status === 'finished' ? 4 : status === 'playing' ? 1 : 0,
    roundCount: 4,
    firstDiePublic: false,
    publicDieIndex: 1,
    players: [
      { id: 'me', nickname: '나', dice: [1], sum: 1, bet: 0 },
      { id: peer, nickname, dice: [null], sum: null, bet: 0 },
    ],
    expiresAt: Date.now() + 60000,
    receivedAt: Date.now(),
    readyAt: Date.now() + 1800,
    deadlineAt: Date.now() + 31800,
    rematch: [],
    autoContinue: status === 'playing',
    pot: 0,
  });
  const snapshot = (game, serverTime, viewerId = 'me') => ({
    viewerId,
    game,
    serverTime,
    points: { current: 10000, total: 10000 },
    inviteAvailableAt: 0,
    online: [
      { id: 'new', nickname: '새대원', busy: false },
      { id: 'old', nickname: '이전대원', busy: false },
    ],
  });
  const reply = (call, data) => React.act(async () => call.resolve(data));
  const focus = () => React.act(async () => window.dispatchEvent(new Event('focus')));
  await React.act(async () => render());
  await reply(calls[0], snapshot(game('old-game', 'old', '이전대원', 'finished'), 1000));
  await React.act(async () => {
    const invite = document.querySelector('[aria-label="새대원님 초대"]');
    invite.click();
    invite.click();
  });
  assert.equal(
    calls.filter((call) => call.name.endsWith('/invite')).length,
    1,
    'Same-frame repeated clicks send one invite',
  );
  assert.match(
    document.querySelector('.dice-empty-table').textContent,
    /새대원님에게 초대를 보내고 있습니다/,
  );
  assert.doesNotMatch(document.querySelector('.dice-empty-table').textContent, /이전대원/);
  assert.equal(calls.at(-1).options.body.targetId, 'new');
  const count = calls.length;
  await focus();
  assert.equal(calls.length, count, 'Polling cannot start while an invite mutation is pending');
  await reply(calls.at(-1), snapshot(game('new-game', 'new', '새대원'), 2000));
  assert.match(
    document.querySelector('.dice-empty-table').textContent,
    /새대원님에게 초대를 보냈습니다/,
  );
  await focus();
  await reply(calls.at(-1), snapshot(game('new-game', 'new', '새대원', 'playing', 2), 3000));
  assert.match(
    document.querySelector('.dice-match-status').textContent,
    /승부가 시작되었습니다.*새대원/,
  );
  assert.equal(scrolls.length, 1, 'Desktop players scroll to the arena at game start');
  assert.equal(document.activeElement, document.querySelector('.dice-arena'));
  assert.equal(document.querySelectorAll('.dice-turns > span').length, 4);
  assert.equal(document.querySelectorAll('.dice-history > span').length, 8);
  assert.equal(
    document.querySelectorAll('.dice-face b').length,
    6,
    'The opponent first die is hidden',
  );
  await focus();
  await reply(calls.at(-1), snapshot(game('new-game', 'new', '새대원', 'invited', 1), 4000));
  assert.equal(
    probe.data.game.status,
    'playing',
    'A lower revision cannot overwrite an accepted game',
  );
  assert.equal(scrolls.length, 1, 'Ordinary polling does not repeatedly scroll');
  assert.match(document.querySelector('.dice-continuation').textContent, /이번 판까지만/);
  await React.act(async () => {
    document.querySelector('.dice-continuation button').click();
  });
  assert.equal(calls.at(-1).name, 'games/dice/stop');
  assert.equal(calls.at(-1).options.body.gameId, 'new-game');
  await reply(
    calls.at(-1),
    snapshot(
      {
        ...game('new-game', 'new', '새대원', 'playing', 3),
        autoContinue: false,
        stopBy: 'me',
        stopReason: 'requested',
      },
      4500,
    ),
  );
  assert.match(document.querySelector('.dice-continuation').textContent, /나님이 이번 판까지만/);
  window.matchMedia = () => ({ matches: true });
  await focus();
  await reply(
    calls.at(-1),
    snapshot({ ...game('rematch', 'new', '새대원', 'playing', 1), matchNumber: 2 }, 5000),
  );
  assert.match(document.querySelector('.dice-game-start').textContent, /다음 게임 시작2번째 게임/);
  assert.equal(scrolls.length, 2, 'A new match scrolls on mobile as well');
  assert.equal(
    scrolls.at(-1).options.behavior,
    'instant',
    'Reduced-motion preference is respected',
  );
  for (const [round, max] of [
    [2, 5],
    [3, 10],
  ]) {
    await focus();
    await reply(
      calls.at(-1),
      snapshot(
        {
          ...game('rematch', 'new', '새대원', 'playing', round),
          round,
          readyAt: 0,
          players: [
            {
              id: 'me',
              nickname: '나',
              dice: [1, 3, 5].slice(0, round),
              sum: round === 2 ? 4 : 9,
              bet: 0,
            },
            {
              id: 'new',
              nickname: '새대원',
              dice: [null, 4, null].slice(0, round),
              sum: null,
              bet: 0,
            },
          ],
        },
        5000 + round * 100,
      ),
    );
    assert.deepEqual(
      [...document.querySelectorAll('.dice-multipliers button')].map(
        (button) => button.textContent,
      ),
      Array.from({ length: max }, (_, index) => `${((index + 1) * 100).toLocaleString('ko-KR')} P`),
    );
    const peerHistory = document.querySelectorAll(
      '.dice-player:not(.is-mine) .dice-history > span',
    );
    assert.ok(peerHistory[0].querySelector('svg'), 'First die remains hidden');
    assert.equal(peerHistory[1].textContent, '4', 'Second die remains public after later rolls');
    assert.equal(document.querySelectorAll('.dice-face b').length, round === 2 ? 0 : 6);
    assert.ok(
      document
        .querySelector('.dice-continuation')
        .compareDocumentPosition(document.querySelector('.dice-duel')) &
        Node.DOCUMENT_POSITION_FOLLOWING,
      'Stop control precedes the dice on PC and mobile',
    );
  }
  // A pending poll from before the next invite must not replace its response.
  await focus();
  await reply(calls.at(-1), snapshot(game('rematch', 'new', '새대원', 'finished', 4), 6000));
  await focus();
  const stale = calls.at(-1);
  await React.act(async () => document.querySelector('[aria-label="이전대원님 초대"]').click());
  await reply(calls.at(-1), snapshot(game('third', 'old', '이전대원'), 8000));
  await reply(stale, snapshot(game('rematch', 'new', '새대원', 'finished', 4), 7000));
  assert.equal(probe.data.game.id, 'third');
  assert.match(
    document.querySelector('.dice-empty-table').textContent,
    /이전대원님에게 초대를 보냈습니다/,
  );
  await focus();
  const beforeCancel = calls.at(-1);
  const cancelButton = document.querySelector('.dice-empty-table button');
  assert.equal(cancelButton.textContent.trim(), '초대 취소');
  await React.act(async () => {
    cancelButton.click();
    cancelButton.click();
  });
  assert.equal(calls.filter((call) => call.name.endsWith('/cancel')).length, 1);
  assert.equal(calls.at(-1).options.body.gameId, 'third');
  assert.equal(cancelButton.disabled, true);
  await reply(calls.at(-1), snapshot(game('third', 'old', '이전대원', 'cancelled', 2), 8500));
  await reply(beforeCancel, snapshot(game('third', 'old', '이전대원'), 8200));
  assert.match(document.querySelector('.dice-empty-table').textContent, /초대를 취소했습니다/);
  assert.equal(document.querySelector('.dice-empty-table button'), null);
  assert.equal(document.querySelector('[aria-label="새대원님 초대"]').disabled, false);
  await focus();
  const incoming = { ...game('incoming', 'new', '새대원'), hostId: 'new' };
  await reply(calls.at(-1), snapshot(incoming, 8600));
  assert.ok(document.querySelector('[role="dialog"]'), 'Recipients see the invitation');
  assert.equal(
    document.querySelector('.dice-empty-table button'),
    null,
    'Only the sender can cancel',
  );
  await focus();
  await reply(calls.at(-1), snapshot({ ...incoming, status: 'cancelled', revision: 2 }, 8700));
  assert.equal(
    document.querySelector('[role="dialog"]'),
    null,
    'Cancellation closes the recipient dialog',
  );
  assert.match(
    document.querySelector('.dice-empty-table').textContent,
    /상대가 초대를 취소했습니다/,
  );
  await focus();
  const oldIdentity = calls.at(-1);
  window.diceCommunity = {
    ...window.diceCommunity,
    user: { id: 'another', points: { current: 10 } },
  };
  await React.act(async () => render());
  assert.equal(probe.data, null, 'Identity changes immediately hide the previous player state');
  await reply(oldIdentity, snapshot(game('third', 'old', '이전대원'), 9000));
  await reply(calls.at(-1), snapshot(null, 10000, 'me'));
  assert.equal(probe.data, null, 'A response for another member is never displayed');
  await React.act(async () => window.dispatchEvent(new Event('pagehide')));
  assert.equal(calls.at(-1).options.keepalive, true);
  assert.equal(
    calls.at(-1).options.body.page,
    'away',
    'Reload releases page presence without stopping the series',
  );
  await React.act(async () => {
    window.dicePath = '/';
    render();
  });
  assert.equal(calls.at(-1).options.body.page, 'site', 'SPA departure announces the page change');
  console.log(
    'PASS: invite target identity, cancellation and recipient dialog dismissal, rapid-click lock, mutation/poll ordering, stale revisions, account isolation, start banner and desktop/mobile scroll once per match',
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
