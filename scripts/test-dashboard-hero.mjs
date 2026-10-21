import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import sharp from 'sharp';
import { dashboardSlides, dashboardSlideInterval } from '../src/lib/dashboard-slides.mjs';

const dom = new JSDOM('<div id="hero-test"></div>', {
  url: 'http://localhost',
  pretendToBeVisual: true,
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
let reduceMotion = false,
  tick,
  interval,
  cleared = false;
window.matchMedia = () => ({
  get matches() {
    return reduceMotion;
  },
});
const originalInterval = globalThis.setInterval,
  originalClear = globalThis.clearInterval;
globalThis.setInterval = (callback, milliseconds) => {
  tick = callback;
  interval = milliseconds;
  return 1;
};
globalThis.clearInterval = () => {
  cleared = true;
};
const require = createRequire(import.meta.url),
  React = require('react'),
  { createRoot } = require('react-dom/client');
await fs.mkdir('work', { recursive: true });
const directory = await fs.mkdtemp(path.resolve('work/dashboard-hero-'));
let root;
try {
  const output = path.join(directory, 'hero.cjs');
  await build({
    entryPoints: ['src/components/DashboardHero.jsx'],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    jsx: 'automatic',
    plugins: [
      {
        name: 'isolated-hero',
        setup(builder) {
          builder.onResolve({ filter: /^\.\/(ui|Icon|KakaoSymbol)$/ }, (args) => ({
            path: args.path,
            namespace: 'test',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'test' }, (args) => ({
            loader: 'jsx',
            resolveDir: process.cwd(),
            contents:
              args.path === './ui'
                ? `export const ExternalButton=props=><a {...props}/>;`
                : `export default function Icon(){return null;}`,
          }));
        },
      },
    ],
  });
  const Hero = require(output).default;
  root = createRoot(document.getElementById('hero-test'));
  await React.act(async () => root.render(React.createElement(Hero)));
  const images = [...document.querySelectorAll('.hero-slide')];
  assert.equal(images.length, 4);
  assert.equal(dashboardSlides[0].image, '/images/community-squad.png');
  assert.equal(dashboardSlideInterval, 6000);
  assert.equal(interval, 6000);
  const active = () => document.querySelector('.hero-slide.is-active').getAttribute('src');
  assert.equal(active(), dashboardSlides[0].image);
  // Unloaded images must not replace a visible frame.
  await React.act(async () => tick());
  assert.equal(active(), dashboardSlides[0].image);
  for (const image of images)
    await React.act(async () => image.dispatchEvent(new window.Event('load')));
  const logo = document.querySelector('.hero-logo'),
    links = [...document.querySelectorAll('.hero-actions a')];
  for (const index of [1, 2, 3, 0]) {
    await React.act(async () => tick());
    assert.equal(active(), dashboardSlides[index].image);
    assert.equal(
      document.querySelector('.hero-title.is-active').textContent,
      dashboardSlides[index].title.join(''),
    );
    assert.equal(document.querySelector('.hero-logo'), logo);
    assert.deepEqual([...document.querySelectorAll('.hero-actions a')], links);
  }
  reduceMotion = true;
  await React.act(async () => tick());
  assert.equal(active(), dashboardSlides[0].image);
  reduceMotion = false;
  Object.defineProperty(document, 'hidden', { configurable: true, value: true });
  await React.act(async () => tick());
  assert.equal(active(), dashboardSlides[0].image);
  await React.act(async () => root.unmount());
  root = null;
  assert.ok(cleared);
  for (const slide of dashboardSlides) {
    const filename = path.resolve('public', '.' + slide.image),
      metadata = await sharp(filename).metadata();
    if (slide.id === 'original-squad') {
      assert.equal(metadata.width, 2172);
      assert.equal(metadata.height, 724);
    } else {
      assert.equal(metadata.width, 1600);
      assert.ok((await fs.stat(filename)).size < 400000);
    }
  }
  console.log(
    'PASS: original plus three faction scenes, six-second rotation, synchronized copy, fixed logo/actions, unloaded image guard, hidden-tab/reduced-motion pause, timer cleanup and optimized assets',
  );
} finally {
  if (root) await React.act(async () => root.unmount());
  globalThis.setInterval = originalInterval;
  globalThis.clearInterval = originalClear;
  await fs.rm(directory, { recursive: true, force: true });
  dom.window.close();
}
