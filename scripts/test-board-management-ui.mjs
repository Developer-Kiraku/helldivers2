import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { canManagePosts } from '../src/lib/post-access.mjs';

assert.equal(canManagePosts({ role: 'operator', actualRole: 'operator' }), true);
assert.equal(canManagePosts({ role: 'operator' }), true);
for (const role of ['deputy', 'member', 'apprentice']) {
  assert.equal(canManagePosts({ role }), false);
  assert.equal(canManagePosts({ role, actualRole: 'operator' }), false);
}
assert.equal(canManagePosts(null), false);

const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement'])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/bulk-ui-'));
const root = createRoot(document.getElementById('root'));
const calls = [];
globalThis.bulkTestCommunity = {
  managementMode: true,
  api: async (route, options) => {
    calls.push({ route, ...options });
    return { count: options.body.ids.length };
  },
  refresh: async () => {},
  notify: () => {},
};
try {
  const outfile = path.join(directory, 'component.cjs');
  await build({
    entryPoints: ['src/components/BoardManagement.jsx'],
    outfile,
    bundle: true,
    jsx: 'automatic',
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    loader: { '.scss': 'empty' },
    plugins: [
      {
        name: 'test-context',
        setup(builder) {
          builder.onResolve({ filter: /^\.\/(CommunityProvider|Modal|ui)$/ }, (args) => ({
            path: args.path,
            namespace: 'fixture',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'fixture' }, (args) => ({
            loader: 'jsx',
            resolveDir: process.cwd(),
            contents:
              args.path === './CommunityProvider'
                ? 'export const useCommunity=()=>globalThis.bulkTestCommunity;'
                : args.path === './Modal'
                  ? 'export default function Modal({title,children}){return <section role="dialog" aria-label={title}>{children}</section>}'
                  : `export const Button=p=><button {...p}/>; export const Label=p=><label {...p}/>;export const TextArea=p=><textarea {...p}/>;export const Input=({checked,...p})=><input {...p} checked={checked===true}/>;`,
          }));
        },
      },
    ],
  });
  const { default: Management, SelectablePost, useBoardSelection } = require(outfile);
  let board = 'guide';
  let posts = [
    { id: 'a', board: 'guide', title: 'A' },
    { id: 'b', board: 'guide', title: 'B' },
  ];
  function Harness() {
    const selection = useBoardSelection(board, posts);
    return React.createElement(
      React.Fragment,
      null,
      React.createElement(Management, { board, posts, selection }),
      posts.map((post) =>
        React.createElement(
          SelectablePost,
          { key: post.id, post, selection },
          React.createElement('a', { href: `#${post.id}` }, post.title),
        ),
      ),
    );
  }
  const render = () => React.act(async () => root.render(React.createElement(Harness)));
  const button = (text) =>
    [...document.querySelectorAll('button')].find((node) => node.textContent === text);
  const checkbox = (label) => document.querySelector(`input[aria-label="${label}"]`);
  const click = async (node) => {
    assert.ok(node);
    await React.act(async () => node.click());
  };
  await render();
  assert.equal(button('선택한 게시물 삭제'), undefined);
  await click(checkbox('A 선택'));
  assert.ok(button('선택한 게시물 삭제'));
  assert.equal(
    document.querySelector('.selectable-post a input'),
    null,
    'Checkbox must not be nested in the post link',
  );
  await click(button('선택한 게시물 이동'));
  assert.equal(button('이동 확인').disabled, true);
  assert.equal(document.querySelector('input[value="tierlist"]').disabled, true);
  await click(document.querySelector('input[value="talk"]'));
  assert.equal(button('이동 확인').disabled, false);
  await click(button('취소'));
  assert.equal(calls.length, 0);
  assert.equal(checkbox('A 선택').checked, true);
  await click(button('선택한 게시물 삭제'));
  await click(button('1개 삭제 확인'));
  assert.deepEqual(calls[0].body.ids, ['a']);
  assert.equal(calls[0].body.action, 'delete');
  assert.equal(button('선택한 게시물 삭제'), undefined);
  await click(checkbox('A 선택'));
  posts = [posts[1]];
  await render();
  assert.equal(button('선택한 게시물 삭제'), undefined, 'Filtered-out selections are cleared');
  await click(checkbox('B 선택'));
  globalThis.bulkTestCommunity.managementMode = false;
  await render();
  assert.equal(document.querySelector('input[type="checkbox"]'), null);
  globalThis.bulkTestCommunity.managementMode = true;
  await render();
  assert.equal(checkbox('B 선택').checked, false, 'Mode reset clears selection');
  board = 'report';
  posts = [{ id: 'report', board, title: '비공개 신고' }];
  await render();
  await click(checkbox('비공개 신고 선택'));
  await click(button('선택한 게시물 이동'));
  await click(document.querySelector('input[value="talk"]'));
  assert.equal(button('이동 확인').disabled, true);
  await click(document.querySelector('.bulk-visibility-warning input'));
  assert.equal(button('이동 확인').disabled, false);
  await click(button('이동 확인'));
  assert.equal(calls[1].body.confirmVisibility, true);
  assert.equal(calls[1].body.targetBoard, 'talk');
  console.log(
    'PASS: board selection, separate checkbox/link, batch payload, cancel, compatibility, report visibility confirmation, filter/mode reset',
  );
} finally {
  await React.act(async () => root.unmount());
  delete globalThis.bulkTestCommunity;
  dom.window.close();
  if (path.dirname(directory) === path.resolve('work'))
    await fs.rm(directory, { recursive: true, force: true });
}
