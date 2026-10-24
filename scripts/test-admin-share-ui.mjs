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
        "export {default as PostShare} from './src/components/PostShare'; export {default as AuditLogPage} from './src/components/AuditLogPage'; export {default as MapAttachmentsEditor} from './src/components/MapAttachmentsEditor'; export {default as usePostView} from './src/hooks/usePostView';",
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
  const { PostShare, AuditLogPage, MapAttachmentsEditor, usePostView } = require(
    path.join(dir, 'ui.cjs'),
  );
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
    api: async (path) =>
      path === 'integrations/kakao'
        ? { javaScriptKey: 'a'.repeat(32) }
        : {
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
          },
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
  assert.ok(button('카카오톡 공유'));
  await click(button('카카오톡 공유'));
  assert.equal(sent.length, 1);
  assert.equal(sent[0].content.description, '공유 요약');
  await click(button('닫기'));
  delete sdk.Share.sendDefault;
  await click(button('공유'));
  assert.ok(!button('카카오톡 공유'));
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
  let attachedMaps = [];
  window.__community.api = async (path) =>
    path === 'integrations/maps'
      ? { kakaoConfigured: true, googleConfigured: false }
      : {
          results: [
            {
              provider: 'kakao',
              name: '서울시청',
              address: '서울특별시 중구 세종대로 110',
              lat: 37.5665,
              lng: 126.978,
            },
          ],
        };
  function MapsHarness() {
    const [maps, setMaps] = React.useState([]);
    attachedMaps = maps;
    return React.createElement(MapAttachmentsEditor, { value: maps, onChange: setMaps });
  }
  const changeInput = async (element, value) => {
    await React.act(async () => {
      Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(
        element,
        value,
      );
      element.dispatchEvent(new window.Event('input', { bubbles: true }));
    });
    await flush();
  };
  await React.act(async () => root.render(React.createElement(MapsHarness)));
  await click(button('지도 첨부'));
  await changeInput(document.getElementById('map-address'), '서울시청');
  await click(button('주소 검색'));
  assert.equal(button('선택한 지도 첨부').disabled, false);
  assert.ok(document.querySelector('iframe'));
  await click(document.querySelector('.map-search-results button'));
  assert.ok(
    document.querySelector('iframe').getAttribute('src').includes('/maps/embed?provider=kakao'),
  );
  await click(button('선택한 지도 첨부'));
  assert.equal(attachedMaps.length, 1);
  assert.equal(attachedMaps[0].provider, 'kakao');
  assert.equal(attachedMaps[0].lat, 37.5665);
  assert.equal(attachedMaps[0].lng, 126.978);
  assert.ok(!('url' in attachedMaps[0]));
  await click(document.querySelector('.attached-map button'));
  assert.equal(attachedMaps.length, 0);
  await click(button('지도 첨부'));
  await changeInput(document.getElementById('map-address'), 'https://place.map.kakao.com/18577297');
  await click(button('주소 검색'));
  assert.equal(document.querySelector('iframe'), null);
  assert.ok(document.querySelector('[role="alert"]').textContent.includes('도로명·지번 주소'));
  assert.equal(button('선택한 지도 첨부').disabled, true);
  await changeInput(document.getElementById('map-address'), '서울시청');
  await React.act(async () => {
    const select = document.getElementById('map-provider');
    select.value = 'google';
    select.dispatchEvent(new window.Event('change', { bubbles: true }));
  });
  await click(button('지도 미리보기'));
  assert.ok(document.querySelector('[role="alert"]').textContent.includes('키가 아직 없습니다'));
  await changeInput(
    document.querySelector('input[aria-label="Google 지도 퍼가기 HTML 또는 주소"]'),
    '<iframe src="https://www.google.com/maps/embed?pb=!1m2!2m1"></iframe>',
  );
  await click(button('지도 미리보기'));
  await click(button('선택한 지도 첨부'));
  assert.equal(attachedMaps[0].provider, 'google');
  assert.ok(attachedMaps[0].embedUrl.startsWith('https://www.google.com/maps/embed?pb='));
  console.log(
    'PASS: map picker address selection, preview, attachment/removal and key-free Google embed fallback',
  );
  const viewCalls = [],
    viewUpdates = [];
  window.__community = {
    ready: false,
    signedIn: true,
    user: { id: 'member', role: 'member', actualRole: 'member' },
    api: async (route, options) => {
      viewCalls.push({ route, method: options.method });
      return { views: 7 };
    },
    updatePostViews: (id, views) => viewUpdates.push({ id, views }),
    notify: (message) => {
      throw Error(message);
    },
  };
  function ViewHarness({ id }) {
    usePostView(id);
    return null;
  }
  await React.act(async () => root.render(React.createElement(ViewHarness, { id: 'post-1' })));
  assert.equal(viewCalls.length, 0);
  window.__community.ready = true;
  await React.act(async () => root.render(React.createElement(ViewHarness, { id: 'post-1' })));
  await flush();
  assert.deepEqual(viewCalls, [{ route: 'posts/post-1/view', method: 'POST' }]);
  assert.deepEqual(viewUpdates, [{ id: 'post-1', views: 7 }]);
  await React.act(async () => root.render(React.createElement(ViewHarness, { id: 'post-1' })));
  assert.equal(viewCalls.length, 1);
  window.__community.user.actualRole = 'operator';
  await React.act(async () => root.render(React.createElement(ViewHarness, { id: 'post-2' })));
  assert.equal(viewCalls.length, 1);
  window.__community.user.actualRole = 'member';
  await React.act(async () => root.render(React.createElement(ViewHarness, { id: 'post-2' })));
  await flush();
  assert.equal(viewCalls.length, 2);
  assert.deepEqual(viewUpdates[1], { id: 'post-2', views: 7 });
  for (const role of ['operator', 'deputy', 'apprentice']) {
    window.__community.user = { id: role, role, actualRole: role };
    const previous = viewCalls.length;
    await React.act(async () =>
      root.render(React.createElement(ViewHarness, { id: `${role}-post` })),
    );
    await flush();
    assert.equal(viewCalls.length, previous + 1);
    assert.deepEqual(viewUpdates.at(-1), { id: `${role}-post`, views: 7 });
  }
  console.log(
    'PASS: serialized actualRole records views for all four real member roles, skips role previews, waits for authentication and avoids render loops',
  );
  console.log(
    'PASS: reason toggle accessibility and escaping, desktop sharing readiness and synchronous SDK call, unsupported desktop hiding, always-visible mobile button',
  );
} finally {
  if (root) await React.act(async () => root.unmount());
  await fs.rm(dir, { recursive: true, force: true });
  dom.window.close();
}
