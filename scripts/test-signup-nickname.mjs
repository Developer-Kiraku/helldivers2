import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const root = process.cwd();
const dom = new JSDOM('<!doctype html><div id="root"></div>', { url: 'http://localhost/signup' });
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'CompositionEvent']) Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const React = require('react');
const { act } = React;
const { createRoot } = require('react-dom/client');
await fs.mkdir(path.join(root, 'work'), { recursive: true });
const directory = await fs.mkdtemp(path.join(root, 'work', 'signup-ui-'));
let rootView;
const originalFetch = globalThis.fetch;
try {
  const output = path.join(directory, 'signup.cjs');
  await build({ entryPoints: ['src/components/SignupPage.jsx'], outfile: output, bundle: true, platform: 'node', format: 'cjs', packages: 'external', jsx: 'automatic', alias: { '@/lib/nicknames': path.join(root, 'src/lib/nicknames.js') }, plugins: [{ name: 'isolated-ui', setup(builder) {
    builder.onResolve({ filter: /^(next\/link|next\/navigation|\.\/ui|\.\/AuthLayout|\.\/PolicyDialog|\.\/PageSkeleton|\.\/CommunityProvider)$/ }, args => ({ path: args.path, namespace: 'test-ui' }));
    builder.onLoad({ filter: /.*/, namespace: 'test-ui' }, args => ({ resolveDir: root, loader: 'jsx', contents: args.path === './ui' ? `import React from 'react';export const Input=props=><input {...props}/>;export const Button=({type='submit',...props})=><button type={type} {...props}/>;export const Label=props=><label {...props}/>;` : args.path === './CommunityProvider' ? `export const useCommunity=()=>({api:async()=>{throw Error('Unexpected registration')},refresh:async()=>{},notify:()=>{}});` : args.path === 'next/navigation' ? `export const useRouter=()=>({replace:()=>{},refresh:()=>{}});` : args.path === 'next/link' ? `export default function Link({children,...props}){return <a {...props}>{children}</a>}` : args.path === './AuthLayout' ? `export default function AuthLayout({children}){return <main>{children}</main>}export const KakaoButton=()=>null;` : `export default function Placeholder(){return null}` }));
  } }] });
  const calls = [];
  let finishSlow;
  let failNetwork = false;
  globalThis.fetch = async (url, options) => {
    if (url === '/api/auth/signup-info') return { json: async () => ({ verified: true }) };
    assert.equal(url, '/api/auth/nickname-check');
    const { nickname } = JSON.parse(options.body); calls.push(nickname);
    if (failNetwork) throw Error('연결 실패');
    if (nickname === '느린대원') return new Promise(resolve => { finishSlow = () => resolve({ ok: true, json: async () => ({ nickname, available: false, message: '이미 사용 중인 닉네임입니다.' }) }); });
    const available = nickname !== '중복대원';
    return { ok: true, json: async () => ({ nickname, available, message: available ? '사용 가능한 닉네임입니다.' : '이미 사용 중인 닉네임입니다.' }) };
  };
  const SignupPage = require(output).default;
  rootView = createRoot(document.getElementById('root'));
  await act(async () => { rootView.render(React.createElement(SignupPage)); });
  const input = document.getElementById('signup-name');
  const status = () => document.getElementById('nickname-status').textContent;
  const join = () => [...document.querySelectorAll('button')].find(button => button.textContent.includes('가입 완료'));
  const wait = () => act(async () => { await new Promise(resolve => setTimeout(resolve, 390)); });
  async function type(value) { await act(async () => { Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(input, value); input.dispatchEvent(new Event('input', { bubbles: true })); }); }

  await type('한'); await wait(); assert.equal(calls.length, 0); assert.ok(join().disabled);
  await type('첫대원'); await type('새대원'); assert.ok(join().disabled); await wait();
  assert.deepEqual(calls, ['새대원']); assert.match(status(), /사용 가능한/);
  await act(async () => { document.querySelector('input[type="checkbox"]').click(); }); assert.equal(join().disabled, false);
  await type('새대원 '); assert.equal(join().disabled, false); await wait(); assert.equal(calls.length, 1);
  await type('중복대원'); assert.ok(join().disabled); await wait(); assert.match(status(), /이미 사용 중/); assert.ok(join().disabled);
  await type('느린대원'); await wait(); await type('빠른대원'); await wait(); assert.equal(join().disabled, false);
  await act(async () => { finishSlow(); }); assert.match(status(), /사용 가능한/); assert.equal(join().disabled, false);
  const beforeComposition = calls.length;
  await act(async () => { input.dispatchEvent(new CompositionEvent('compositionstart', { bubbles: true })); });
  await type('한글대원'); await wait(); assert.equal(calls.length, beforeComposition); assert.ok(join().disabled);
  await act(async () => { input.dispatchEvent(new CompositionEvent('compositionend', { bubbles: true })); }); await wait(); assert.equal(join().disabled, false);
  failNetwork = true; await type('재시도대원'); await wait(); assert.match(status(), /연결 실패/); assert.ok(join().disabled);
  failNetwork = false;
  await act(async () => { [...document.querySelectorAll('button')].find(button => button.textContent === '중복 확인 다시 시도').click(); }); await wait(); assert.equal(join().disabled, false);
  console.log('PASS: nickname debounce, invalid/duplicate blocking, agreement gate, whitespace normalization, stale responses, Korean composition and network retry');
} finally {
  if (rootView) await act(async () => { rootView.unmount(); });
  globalThis.fetch = originalFetch; dom.window.close();
  await fs.rm(directory, { recursive: true, force: true });
}
