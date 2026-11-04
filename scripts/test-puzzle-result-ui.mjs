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
  let autoResult = false,
    finishRequests = 0,
    stopRequests = 0,
    loseStateResponse = false,
    loseStopResponse = false;
  const moveRequests = [];
  const moveSignals = [];
  const month = puzzleMonth();
  window.puzzleRouter = { replace() {} };
  window.puzzleContext = {
    role: 'member',
    actualRole: 'member',
    refresh: async () => {},
    api: async (path, options) => {
      if (path.endsWith('/move')) {
        let targetRun = activeRun;
        moveRequests.push({ ...options.body });
        moveSignals.push(options.signal);
        if (holdMove) {
          const wait = holdMove;
          holdMove = null;
          await wait;
        }
        assert.equal(options.body.step, targetRun.step);
        begins++;
        const slide = slidePuzzle(targetRun.board, options.body.tile);
        targetRun = {
          ...targetRun,
          board: slide.board,
          moves: targetRun.moves + slide.moves.length,
          step: targetRun.step + 1,
          startedAt: new Date().toISOString(),
          elapsedMs: 0,
          completedAt: puzzleSolved(slide.board) ? new Date().toISOString() : null,
        };
        if (autoResult && targetRun.completedAt)
          targetRun.result = {
            record: { month, elapsedMs: 1200, moves: targetRun.moves },
            improved: true,
            rank: 1,
          };
        if (activeRun.id === targetRun.id) activeRun = targetRun;
        if (loseMoveResponse) {
          loseMoveResponse = false;
          throw new Error('응답 유실 테스트');
        }
        return { run: targetRun };
      }
      if (path.includes('/state?')) {
        if (loseStateResponse) throw new Error('상태 조회 실패');
        return { run: activeRun };
      }
      if (path.endsWith('/stop')) {
        stopRequests++;
        if (loseStopResponse) throw new Error('정지 응답 실패');
        activeRun = { ...activeRun, stopped: true };
        return { run: activeRun };
      }
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
        finishRequests++;
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
  await click(buttonByText('게임 정지'));
  await click(buttonByText('게임 시작'));
  autoResult = true;
  holdMove = new Promise((resolve) => (releaseMove = resolve));
  const stopsBefore = stopRequests;
  await click(document.querySelector('[aria-label="15번 타일"]'));
  assert.match(document.querySelector('.puzzle-save-status').textContent, /서버에서 확인/);
  assert.ok(
    [...document.querySelectorAll('.puzzle-tile')].every((tile) => tile.disabled),
    'Solving the visual board blocks further moves',
  );
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  await click(buttonByText('게임 정지'));
  assert.equal(stopRequests, stopsBefore + 1, 'Stop preempts a pending move immediately');
  assert.equal(moveSignals.at(-1).aborted, true, 'Stop cancels the outstanding move transport');
  assert.ok(buttonByText('게임 시작'));
  await click(buttonByText('게임 시작'));
  const nextId = activeRun.id;
  await React.act(async () => releaseMove());
  assert.equal(activeRun.id, nextId);
  assert.equal(
    document.querySelector('.puzzle-result'),
    null,
    'A late completion response cannot end the next game',
  );
  assert.equal(document.querySelectorAll('.puzzle-status strong')[1].textContent.trim(), '0 회');
  window.puzzleContext.refresh = () => new Promise(() => {});
  const finishesBefore = finishRequests;
  await click(document.querySelector('[aria-label="15번 타일"]'));
  assert.match(document.querySelector('.puzzle-result').textContent, /00:01\.200/);
  assert.equal(
    finishRequests,
    finishesBefore,
    'An atomic server result needs no second finish request',
  );
  await click(buttonByText('게임 시작'));
  assert.ok(buttonByText('게임 정지'), 'A stalled bootstrap refresh cannot lock the next game');
  loseMoveResponse = true;
  loseStateResponse = true;
  await click(document.querySelector('[aria-label="13번 타일"]'));
  assert.ok(buttonByText('게임 상태 다시 확인'));
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  loseStateResponse = false;
  await click(buttonByText('게임 상태 다시 확인'));
  assert.ok(document.documentElement.classList.contains('puzzle-scroll-locked'));
  loseStopResponse = true;
  await click(buttonByText('게임 정지'));
  assert.ok(buttonByText('게임 시작'), 'Failed stop transport still releases the local controls');
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  await React.act(async () => root.unmount());
  assert.equal(document.documentElement.classList.contains('puzzle-scroll-locked'), false);
  console.log(
    'PASS: puzzle completion, pending-move stop/cancellation, stale-response isolation, stalled-refresh restart, sync recovery, failed-stop unlock and touch/keyboard/mouse input',
  );
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  for (const [key, descriptor] of saved)
    if (descriptor) Object.defineProperty(globalThis, key, descriptor);
    else delete globalThis[key];
  await fs.rm(directory, { recursive: true, force: true });
}
