import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { puzzleMonth, slidePuzzle, puzzleSolved } from '../src/lib/sliding-puzzle.mjs';
const dom = new JSDOM('<div id="root"></div>', { url: 'http://localhost/games/sliding-puzzle' });
const saved = new Map();
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event']) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const mediaListeners = new Set();
const mobile = {
  matches: true,
  addEventListener: (_, listener) => mediaListeners.add(listener),
  removeEventListener: (_, listener) => mediaListeners.delete(listener),
};
window.matchMedia = () => mobile;
HTMLElement.prototype.scrollIntoView = () => {};
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/puzzle-result-ui-'));
const root = createRoot(document.getElementById('root'));
try {
  const outfile = path.join(directory, 'puzzle.cjs');
  await build({
    entryPoints: ['src/components/SlidingPuzzle.jsx'],
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
            { filter: /^(next\/navigation|\.\/CommunityProvider|\.\/ui)$/ },
            (args) => ({ path: args.path, namespace: 'stub' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === 'next/navigation'
                ? 'export const useRouter=()=>window.puzzleRouter;export const useSearchParams=()=>new URLSearchParams();'
                : args.path === './CommunityProvider'
                  ? 'export const useCommunity=()=>window.puzzleContext;'
                  : 'import React from "react"; export const Button=props=>React.createElement("button",props);export const Select=props=>React.createElement("select",props);',
          }));
        },
      },
    ],
  });
  let games = 0;
  let begins = 0;
  let activeRun;
  let loseMoveResponse = false;
  let holdMove;
  const moveRequests = [];
  const month = puzzleMonth();
  window.puzzleRouter = { replace() {} };
  window.puzzleContext = {
    role: 'member',
    actualRole: 'member',
    refresh: async () => {},
    api: async (path, options) => {
      if (path.endsWith('/move')) {
        moveRequests.push({ ...options.body });
        if (holdMove) {
          const wait = holdMove;
          holdMove = null;
          await wait;
        }
        assert.equal(options.body.step, activeRun.step);
        begins++;
        const slide = slidePuzzle(activeRun.board, options.body.tile);
        activeRun = {
          ...activeRun,
          board: slide.board,
          moves: activeRun.moves + slide.moves.length,
          step: activeRun.step + 1,
          startedAt: new Date().toISOString(),
          elapsedMs: 0,
          completedAt: puzzleSolved(slide.board) ? new Date().toISOString() : null,
        };
        if (loseMoveResponse) {
          loseMoveResponse = false;
          throw new Error('응답 유실 테스트');
        }
        return { run: activeRun };
      }
      if (path.includes('/state?')) return { run: activeRun };
      if (path.endsWith('/stop')) return { run: { ...activeRun, stopped: true } };
      if (path.endsWith('/start')) {
        games++;
        activeRun = {
          id: 'game-' + games,
          step: 0,
          moves: 0,
          board: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15],
        };
        return { run: activeRun };
      }
      if (path.endsWith('/finish')) {
        assert.deepEqual(Object.keys(options.body), ['runId']);
        return {
          improved: games === 2,
          rank: 1,
          record: { month, elapsedMs: games === 1 ? 9100 : 7200, moves: 1 },
        };
      }
      return {
        month,
        months: [month],
        total: 1,
        rankings: [{ rank: 1, nickname: '내 이전 기록', elapsedMs: 1000, moves: 1, own: true }],
        mine: { rank: 1, elapsedMs: 1000, moves: 1 },
      };
    },
  };
  const Puzzle = require(outfile).default;
  await React.act(async () => root.render(React.createElement(Puzzle)));
  const click = async (button) => React.act(async () => button.click());
  const buttonByText = (text) =>
    Array.from(document.querySelectorAll('button')).find((button) => button.textContent === text);
  await click(buttonByText('게임 시작'));
  assert.ok(buttonByText('게임 정지'));
  assert.ok(document.documentElement.classList.contains('puzzle-scroll-locked'));
  await React.act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 150));
  });
  assert.match(document.querySelector('.puzzle-status').textContent, /00:00\.000/);
  await click(document.querySelector('[aria-label="1번 타일"]'));
  assert.equal(begins, 0, 'Illegal tiles do not start the timer');
  const board = document.querySelector('.puzzle-board');
  for (const type of ['dragstart', 'contextmenu']) {
    const event = new Event(type, { bubbles: true, cancelable: true });
    board.dispatchEvent(event);
    assert.equal(event.defaultPrevented, true);
  }
  const tile = document.querySelector('[aria-label="15번 타일"]');
  assert.equal(tile.draggable, false);
  await click(tile);
  assert.equal(begins, 1, 'The first legal move starts the server clock once');
  let result = document.querySelector('.puzzle-result').textContent;
  assert.match(result, /00:09\.100/);
  assert.match(result, /1회/);
  assert.doesNotMatch(
    result,
    /갱신|등록|월간/,
    'An existing first-place record must not label every attempt as a ranking entry',
  );
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  await click(buttonByText('게임 시작'));
  assert.equal(
    document.querySelector('.puzzle-result'),
    null,
    'A new game hides the previous result',
  );
  await click(document.querySelector('[aria-label="15번 타일"]'));
  result = document.querySelector('.puzzle-result').textContent;
  assert.match(result, /00:07\.200/);
  assert.match(result, /월간 최고 기록 갱신 · 1위/);
  await click(buttonByText('게임 시작'));
  loseMoveResponse = true;
  await click(document.querySelector('[aria-label="13번 타일"]'));
  assert.equal(activeRun.step, 1, 'A lost move response recovers the committed server state');
  const stoppedBoard = document.querySelector('.puzzle-board').innerHTML;
  await click(buttonByText('게임 정지'));
  assert.ok(buttonByText('게임 시작'));
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  assert.ok([...document.querySelectorAll('.puzzle-tile')].every((tile) => tile.disabled));
  assert.equal(
    document.querySelector('.puzzle-board').innerHTML.replaceAll(' disabled=""', ''),
    stoppedBoard.replaceAll(' disabled=""', '').replaceAll(' can-move', ''),
  );
  await click(buttonByText('게임 시작'));
  assert.equal(document.querySelectorAll('.puzzle-status strong')[1].textContent.trim(), '0 회');
  assert.match(document.querySelector('.puzzle-status').textContent, /00:00\.000/);
  mobile.matches = false;
  await React.act(async () => mediaListeners.forEach((listener) => listener()));
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  mobile.matches = true;
  await React.act(async () => mediaListeners.forEach((listener) => listener()));
  assert.ok(document.documentElement.classList.contains('puzzle-scroll-locked'));
  let releaseMove;
  holdMove = new Promise((resolve) => (releaseMove = resolve));
  const beforeTouches = moveRequests.length;
  const touch = async (number, primary = true) =>
    React.act(async () => {
      const event = new Event('pointerdown', { bubbles: true, cancelable: true });
      Object.assign(event, { pointerType: 'touch', isPrimary: primary });
      const tile = document.querySelector(`[aria-label="${number}번 타일"]`);
      tile.dispatchEvent(event);
      tile.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, detail: 1 }));
    });
  await touch(13);
  assert.equal(moveRequests.length, beforeTouches + 1);
  await touch(14);
  assert.equal(
    moveRequests.length,
    beforeTouches + 1,
    'Rapid touches wait for the prior server step',
  );
  assert.equal(
    document.querySelector('[aria-label="14번 타일"]').style.getPropertyValue('--tile-column'),
    '1',
    'The second touch animates immediately while the first response is pending',
  );
  await React.act(async () => releaseMove());
  assert.equal(moveRequests.length, beforeTouches + 2, 'Both rapid touches are sent exactly once');
  assert.deepEqual(
    moveRequests.slice(-2).map(({ tile, step }) => [tile, step]),
    [
      [13, 0],
      [14, 1],
    ],
  );
  assert.equal(activeRun.moves, 4);
  await touch(13, false);
  assert.equal(
    moveRequests.length,
    beforeTouches + 2,
    'Secondary fingers cannot create extra moves',
  );
  await click(document.querySelector('[aria-label="13번 타일"]'));
  assert.equal(
    moveRequests.length,
    beforeTouches + 3,
    'Keyboard activation still works after a touch',
  );
  await React.act(async () => {
    const tile = document.querySelector('[aria-label="14번 타일"]');
    const event = new Event('pointerdown', { bubbles: true });
    Object.assign(event, { pointerType: 'mouse', isPrimary: true });
    tile.dispatchEvent(event);
    tile.dispatchEvent(new dom.window.MouseEvent('click', { bubbles: true, detail: 1 }));
  });
  assert.equal(moveRequests.length, beforeTouches + 4, 'Mouse input still works after touch input');
  await React.act(async () => root.unmount());
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  console.log(
    'PASS: per-attempt results, scroll lock, immediate touch, queued rapid touches, no duplicate compatibility clicks, secondary-finger rejection, mouse/keyboard input and lost-response recovery',
  );
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of saved)
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  await fs.rm(directory, { recursive: true, force: true });
}
