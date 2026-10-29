import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="root"></div>');
for (const key of ['window', 'document', 'navigator', 'HTMLElement'])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
await fs.mkdir('work', { recursive: true });
const directory = await fs.mkdtemp(path.resolve('work/comments-test-'));
const root = createRoot(document.getElementById('root'));
try {
  const outfile = path.join(directory, 'hook.cjs');
  await build({
    entryPoints: ['src/hooks/usePostComments.js'],
    outfile,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
  });
  const usePostComments = require(outfile).default;
  const requests = [];
  const api = (url) => new Promise((resolve, reject) => requests.push({ url, resolve, reject }));
  let state;
  function Probe(props) {
    state = usePostComments({ api, ...props });
    return null;
  }
  const render = (props) =>
    React.act(async () => {
      root.render(React.createElement(Probe, props));
    });
  await render({ postId: 'a', enabled: false, initialCount: 8 });
  assert.equal(requests.length, 0);
  assert.equal(state.count, 8);
  await render({ postId: 'a', enabled: true, initialCount: 8 });
  assert.equal(state.loading, true);
  await render({ postId: 'b', enabled: true, initialCount: 3 });
  await React.act(async () => requests[0].resolve({ comments: [{ id: 'stale' }] }));
  assert.deepEqual(state.comments, []);
  assert.equal(state.loading, true);
  await React.act(async () => requests[1].resolve({ comments: [{ id: 'b1' }] }));
  assert.equal(state.count, 1);
  assert.equal(state.loading, false);
  assert.equal(state.comments[0].id, 'b1');
  await React.act(async () => state.reload());
  await React.act(async () => requests[2].reject(new Error('network')));
  assert.equal(state.error, 'network');
  await React.act(async () => state.reload());
  assert.equal(state.error, '');
  await render({ postId: 'b', enabled: false });
  await React.act(async () => requests[3].resolve({ comments: [] }));
  assert.equal(state.comments[0].id, 'b1');
  await render({ enabled: true });
  assert.equal(state.loading, false);
  assert.equal(requests.length, 4);
  await render({ postId: 'c', enabled: true });
  await React.act(async () => root.unmount());
  await React.act(async () => requests[4].reject(new Error('after unmount')));
  console.log('PASS: lazy comments, stale-response isolation, counts, retry, close and unmount');
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  await fs.rm(directory, { recursive: true, force: true });
}
