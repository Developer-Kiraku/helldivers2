import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<div id="root"></div>', { url: 'https://example.com/games/dice' });
const saved = new Map();
for (const key of [
  'window',
  'document',
  'navigator',
  'location',
  'HTMLElement',
  'Node',
  'Event',
  'fetch',
]) {
  saved.set(key, Object.getOwnPropertyDescriptor(globalThis, key));
  if (key !== 'fetch')
    Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
}
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url),
  React = require('react');
const { createRoot } = require('react-dom/client');
const root = createRoot(document.getElementById('root'));
const directory = await fs.mkdtemp(path.resolve('work/game-share-ui-'));
try {
  const outfile = path.join(directory, 'share.cjs');
  await build({
    entryPoints: ['src/components/GameResultShare.jsx'],
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
            { filter: /^(\.\/CommunityProvider|\.\/ui|\.\/Modal|@\/lib\/kakao-share)$/ },
            (args) => ({ path: args.path, namespace: 'stub' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            resolveDir: process.cwd(),
            contents:
              args.path === './CommunityProvider'
                ? 'export const useCommunity=()=>window.shareContext;'
                : args.path === './ui'
                  ? 'import React from "react"; export const Button=p=>React.createElement("button",p); export const Input=p=>React.createElement("input",p); export const Label=p=>React.createElement("label",p);'
                  : args.path === './Modal'
                    ? 'import React from "react";export default ({children,onClose})=>React.createElement("div",{role:"dialog"},children,React.createElement("button",{onClick:onClose},"닫기"));'
                    : 'export const loadKakaoShare=()=>window.loadShareSDK();export const sendKakaoShare=(sdk,payload)=>sdk.Share.sendDefault(payload);export const isMobileShareDevice=()=>false;export const supportsKakaoWebShare=()=>true;',
          }));
        },
      },
    ],
  });
  const Share = require(outfile).default;
  const requests = [],
    messages = [],
    native = [],
    copied = [];
  let imageFails = false,
    keyFails = false;
  window.Kakao = {
    Share: {
      sendDefault: (payload) => messages.push(payload),
      scrapImage: async () => {
        if (imageFails) throw Error('image');
        return { infos: { original: { url: 'https://kakao.invalid/result.png' } } };
      },
    },
  };
  window.loadShareSDK = async () => {
    if (keyFails) throw Error('키 없음');
    return window.Kakao;
  };
  window.shareContext = {
    api: async (name, options) => {
      if (name === 'integrations/kakao') return { javaScriptKey: 'key' };
      requests.push(options.body);
      return {
        share: {
          path: '/game-results/' + options.body.resultId,
          result: {
            nickname: '테스트',
            gameLabel: '민주주의 주사위',
            headline: options.body.resultId,
            summary: '결과',
          },
        },
      };
    },
  };
  Object.defineProperty(navigator, 'clipboard', {
    configurable: true,
    value: { writeText: async (value) => copied.push(value) },
  });
  navigator.canShare = () => true;
  navigator.share = async (data) => native.push(data);
  globalThis.fetch = async () => ({
    ok: true,
    blob: async () => new Blob(['png'], { type: 'image/png' }),
  });
  const click = async (text) =>
    React.act(async () =>
      [...document.querySelectorAll('button')]
        .find((button) => button.textContent === text)
        .click(),
    );
  const render = async (id) =>
    React.act(async () => root.render(React.createElement(Share, { game: 'dice', resultId: id })));
  await render('first');
  assert.equal(requests.length, 0, 'No public share is created before an explicit click');
  await click('결과 공유');
  assert.equal(requests[0].resultId, 'first');
  await render('second');
  assert.equal(requests.length, 1, 'An automatic next match cannot replace the open shared result');
  await click('카카오톡 공유');
  assert.equal(messages[0].content.imageUrl, 'https://kakao.invalid/result.png');
  assert.match(messages[0].content.link.webUrl, /first$/);
  await click('이미지 공유');
  assert.equal(native[0].files[0].type, 'image/png');
  await click('링크 복사');
  assert.match(copied[0], /first$/);
  await click('닫기');
  imageFails = true;
  await click('결과 공유');
  await click('카카오톡 공유');
  assert.equal(messages[1].objectType, 'text');
  assert.match(messages[1].link.webUrl, /second$/);
  await click('닫기');
  keyFails = true;
  await click('결과 공유');
  assert.match(document.body.textContent, /키 없음/);
  assert.ok(document.querySelector('a[download]'));
  await click('링크 복사');
  assert.match(copied.at(-1), /second$/);
  console.log(
    'PASS: opt-in creation, stable round identity, Kakao image/text fallback, native file, download and copy without SDK',
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
