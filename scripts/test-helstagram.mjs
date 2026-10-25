import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<!doctype html><div id="helsta-test"></div>', {
  url: 'http://localhost/boards/helstagram',
});
for (const key of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'Event',
  'MouseEvent',
  'MutationObserver',
])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
await fs.mkdir(path.resolve('work'), { recursive: true });
const directory = await fs.mkdtemp(path.resolve('work/helsta-ui-'));
let view;
try {
  const output = path.join(directory, 'post.cjs');
  await build({
    entryPoints: ['src/components/HelstagramPost.jsx'],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    alias: { '@': path.resolve('src') },
    jsx: 'automatic',
    loader: { '.scss': 'empty' },
    plugins: [
      {
        name: 'isolated-components',
        setup(builder) {
          builder.onResolve(
            {
              filter:
                /^(next\/link|\.\/ui|(?:\.\/|\.\.\/components\/)CommunityProvider|\.\/PhotoCarousel|\.\/PostShare|\.\/ModerationActions|\.\/PostPoll)$/,
            },
            (args) => ({ path: args.path, namespace: 'test' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({
            loader: 'jsx',
            resolveDir: process.cwd(),
            contents: args.path.endsWith('/CommunityProvider')
              ? `export const useCommunity=()=>globalThis.__helstaTest;`
              : args.path === './ui'
                ? `import React from 'react';export const Button=({type='submit',...props})=><button type={type} {...props}/>;export const Input=React.forwardRef((props,ref)=><input ref={ref} {...props}/>);export const TextArea=React.forwardRef((props,ref)=><textarea ref={ref} {...props}/>);`
                : args.path === 'next/link'
                  ? `export default function Link(props){return <a {...props}/>}`
                  : args.path === './PhotoCarousel'
                    ? `export default function Photo({onPhotoDoubleClick}){return <img src="/photo.png" alt="test photo" onDoubleClick={onPhotoDoubleClick}/>} `
                    : `export default function Placeholder(){return null}`,
          }));
        },
      },
    ],
  });
  let vote = 0,
    fail = false;
  const calls = [],
    notices = [];
  globalThis.__helstaTest = {
    profile: { nickname: '테스트', photo: '' },
    refresh: async () => {},
    notify: (message) => notices.push(message),
    api: async (route, options) => {
      if (!options) return { comments: [] };
      calls.push(options.body.value);
      if (fail) throw Error('네트워크 오류');
      vote = options.body.value;
      return { post: { myVote: vote, likes: vote === 1 ? 1 : 0 } };
    },
  };
  const Post = require(output).default;
  view = createRoot(document.getElementById('helsta-test'));
  await React.act(async () =>
    view.render(
      React.createElement(Post, {
        post: {
          id: 'test',
          author: '테스트',
          authorRole: 'member',
          authorId: 'test',
          title: '사진',
          category: '분대사진',
          createdAt: '2026-10-19T00:00:00Z',
          date: '2026.10.19',
          images: ['/photo.png'],
          content: '본문',
          myVote: 0,
          likes: 0,
          views: 12,
          comments: 0,
        },
      }),
    ),
  );
  const heart = () => document.querySelector('.helsta-like');
  assert.ok(document.querySelector('.helsta-like-count').textContent.includes('조회 12'));
  await React.act(async () => {
    heart().click();
    heart().click();
  });
  assert.deepEqual(calls, [1]);
  assert.equal(heart().getAttribute('aria-pressed'), 'true');
  assert.match(document.querySelector('.helsta-like-count').textContent, /1/);
  await React.act(async () => heart().click());
  assert.deepEqual(calls, [1, 0]);
  assert.equal(heart().getAttribute('aria-pressed'), 'false');
  const doubleTap = () =>
    document
      .querySelector('.helsta-media img')
      .dispatchEvent(new dom.window.MouseEvent('dblclick', { bubbles: true }));
  await React.act(async () => {
    doubleTap();
    doubleTap();
  });
  assert.deepEqual(calls, [1, 0, 1]);
  assert.equal(heart().getAttribute('aria-pressed'), 'true');
  await React.act(async () => doubleTap());
  assert.deepEqual(calls, [1, 0, 1]);
  fail = true;
  await React.act(async () => heart().click());
  assert.equal(heart().getAttribute('aria-pressed'), 'true');
  assert.match(document.querySelector('.helsta-like-count').textContent, /1/);
  assert.deepEqual(notices, ['네트워크 오류']);
  assert.ok(!/비추천|추천/.test(document.body.textContent));
  console.log(
    'PASS: heart like/unlike, double-tap idempotence, duplicate request guard and optimistic rollback on errors',
  );
} finally {
  if (view) await React.act(async () => view.unmount());
  delete globalThis.__helstaTest;
  dom.window.close();
  await fs.rm(directory, { recursive: true, force: true });
}
