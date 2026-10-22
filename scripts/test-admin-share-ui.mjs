import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
const dom = new JSDOM('<div id="test"></div>', {
  url: 'https://community.example',
  pretendToBeVisual: true,
});
for (const key of ['window', 'document', 'navigator', 'HTMLElement', 'Node', 'Event', 'MouseEvent'])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
globalThis.location = dom.window.location;
const require = createRequire(import.meta.url),
  React = require('react'),
  { createRoot } = require('react-dom/client');
const dir = await fs.mkdtemp(path.resolve('work/share-log-ui-'));
let root;
try {
  await build({
    stdin: {
      contents:
        "export {default as PostShare} from './src/components/PostShare'; export {default as AuditLogPage} from './src/components/AuditLogPage';",
      resolveDir: process.cwd(),
      loader: 'js',
    },
    outfile: path.join(dir, 'ui.cjs'),
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    alias: { '@': path.resolve('src') },
    plugins: [
      {
        name: 'ui-test',
        setup(builder) {
          builder.onResolve(
            { filter: /(CommunityProvider|\/ui|\/Modal|\/Icon|\/KakaoSymbol)$/ },
            (args) => ({ path: args.path, namespace: 'stub' }),
          );
          builder.onLoad({ filter: /.*/, namespace: 'stub' }, (args) => ({
            loader: 'jsx',
            resolveDir: process.cwd(),
            contents: args.path.endsWith('CommunityProvider')
              ? 'export const useCommunity=()=>window.__community;'
              : args.path.endsWith('/ui')
                ? `import React from 'react';export const Button=p=><button {...p}/>;export const Input=React.forwardRef((p,r)=><input ref={r} {...p}/>);export const Label=p=><label {...p}/>;export const Select=p=><select {...p}/>;`
                : args.path.endsWith('/Modal')
                  ? `export default function Modal({title,children,onClose}){return <section role="dialog" aria-label={title}><button onClick={onClose}>닫기</button>{children}</section>}`
                  : 'export default function Icon(){return null;}',
          }));
        },
      },
    ],
  });
  const { PostShare, AuditLogPage } = require(path.join(dir, 'ui.cjs'));
  const flush = () =>
    React.act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 0));
    });
  const click = async (button) => {
    assert.ok(button);
    await React.act(async () => button.click());
    await flush();
  };
  const buttons = () => Array.from(document.querySelectorAll('button'));
  const button = (label) => buttons().find((el) => el.textContent === label);
  window.__community = {
    role: 'operator',
    notify() {},
    api: async () => ({
      logs: [
        {
          id: 'reason-log',
          type: 'member_expel',
          actorNickname: '운영자',
          targetName: '강퇴대원',
          executedAt: '2026-10-22T10:00:00Z',
          targetCreatedAt: '2026-10-01T00:00:00Z',
          reason: '<script>unsafe</script> 사유',
        },
      ],
      total: 1,
      page: 1,
      pageCount: 1,
    }),
  };
  root = createRoot(document.getElementById('test'));
  await React.act(async () => root.render(React.createElement(AuditLogPage)));
  await flush();
  assert.ok(document.querySelector('table').textContent.includes('강퇴'));
  assert.equal(document.querySelectorAll('.audit-log-reason-row').length, 0);
  await click(button('사유 ▾'));
  assert.equal(
    document.querySelector('.audit-log-reason-row p').textContent,
    '<script>unsafe</script> 사유',
  );
  assert.equal(document.querySelectorAll('script').length, 0);
  assert.equal(button('사유 ▴').getAttribute('aria-expanded'), 'true');
  await click(button('사유 ▴'));
  assert.equal(document.querySelectorAll('.audit-log-reason-row').length, 0);
  await React.act(async () => root.unmount());
  root = createRoot(document.getElementById('test'));
  const sent = [];
  const sdk = {
    isInitialized: () => true,
    Share: { sendDefault: (payload) => sent.push(payload) },
  };
  window.Kakao = sdk;
  window.open = () => ({});
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla Windows NT Chrome',
  });
  const post = { id: 'post', board: 'guide', title: '공유 제목', content: '공유 요약' };
  await React.act(async () => root.render(React.createElement(PostShare, { post })));
  await click(button('공유'));
  assert.ok(button('카카오톡 공유 (PC)'));
  await click(button('카카오톡 공유 (PC)'));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].content.description, '공유 요약');
  await click(button('닫기'));
  delete sdk.Share.sendDefault;
  await click(button('공유'));
  assert.ok(!button('카카오톡 공유 (PC)'));
  assert.ok(button('URL 복사하기'));
  await click(button('닫기'));
  Object.defineProperty(navigator, 'userAgent', {
    configurable: true,
    value: 'Mozilla iPhone Mobile',
  });
  await click(button('공유'));
  assert.ok(button('카카오톡 공유'));
  assert.equal(button('카카오톡 공유').disabled, true);
  await click(button('닫기'));
  sdk.Share.sendDefault = (payload) => sent.push(payload);
  window.open = undefined;
  await click(button('공유'));
  assert.equal(button('카카오톡 공유').disabled, false);
  console.log(
    'PASS: reason toggle accessibility and escaping, desktop sharing readiness and synchronous SDK call, unsupported desktop hiding, always-visible mobile button',
  );
} finally {
  if (root) await React.act(async () => root.unmount());
  await fs.rm(dir, { recursive: true, force: true });
  dom.window.close();
}
