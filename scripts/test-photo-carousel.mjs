import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';

const dom = new JSDOM('<div id="carousel-test"></div>', { url: 'http://localhost' });
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
  React = require('react'),
  { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/photo-carousel-'));
let root;
try {
  const output = path.join(directory, 'carousel.cjs');
  await build({
    entryPoints: ['src/components/PhotoCarousel.jsx'],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    loader: { '.css': 'empty', '.scss': 'empty' },
    plugins: [
      {
        name: 'isolate',
        setup(builder) {
          builder.onResolve({ filter: /^\.\/(ui|Modal)$/ }, (args) => ({
            path: args.path,
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({
            loader: 'jsx',
            resolveDir: process.cwd(),
            contents:
              args.path === './ui'
                ? `export const Button=props=><button {...props}/>;`
                : `export default function Modal({children,onClose,onKeyDown}){return <div role="dialog" onKeyDown={onKeyDown}><button onClick={onClose}>닫기</button>{children}</div>}`,
          }));
        },
      },
    ],
  });
  const Carousel = require(output).default;
  root = createRoot(document.getElementById('carousel-test'));
  await React.act(async () =>
    root.render(
      React.createElement(Carousel, {
        images: ['/one.png', '/two.png', '/three.png'],
        title: '사진',
      }),
    ),
  );
  const stage = () => document.querySelector('.photo-carousel-stage');
  Object.defineProperty(stage(), 'clientWidth', { value: 400 });
  const pointer = async (type, x, y = 20) =>
    React.act(async () => {
      const event = new dom.window.MouseEvent(type, {
        bubbles: true,
        clientX: x,
        clientY: y,
        button: 0,
      });
      Object.defineProperties(event, { pointerId: { value: 1 }, isPrimary: { value: true } });
      stage().dispatchEvent(event);
    });
  const counter = () => document.querySelector('.photo-counter').textContent;
  await pointer('pointerdown', 300);
  await pointer('pointermove', 100);
  assert.match(document.querySelector('.photo-slider-track').style.transform, /-200px/);
  await pointer('pointerup', 100);
  assert.equal(counter(), '2 / 3');
  await React.act(async () => document.querySelectorAll('.photo-open')[1].click());
  assert.equal(document.querySelector('[role=dialog]'), null);
  await pointer('pointerdown', 100);
  await pointer('pointermove', 300);
  await pointer('pointerup', 300);
  assert.equal(counter(), '1 / 3');
  await pointer('pointerdown', 100);
  await pointer('pointermove', 300);
  await pointer('pointerup', 300);
  assert.equal(counter(), '1 / 3');
  await pointer('pointerdown', 200);
  await pointer('pointermove', 190, 150);
  await pointer('pointerup', 190, 150);
  assert.equal(counter(), '1 / 3');
  await React.act(async () => document.querySelector('.photo-next').click());
  assert.equal(counter(), '2 / 3');
  await React.act(async () => document.querySelectorAll('.photo-open')[1].click());
  assert.ok(document.querySelector('[role=dialog]'));
  await React.act(async () =>
    document
      .querySelector('[role=dialog]')
      .dispatchEvent(new dom.window.KeyboardEvent('keydown', { key: 'ArrowRight', bubbles: true })),
  );
  assert.equal(counter(), '3 / 3');
  console.log(
    'PASS: photo drag tracking, swipe navigation, boundary clamp, vertical scroll, click suppression, arrows and enlarged keyboard navigation',
  );
} finally {
  if (root) await React.act(async () => root.unmount());
  await fs.rm(directory, { recursive: true, force: true });
  dom.window.close();
}
