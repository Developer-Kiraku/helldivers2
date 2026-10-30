import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { emptyTierList } from '../src/lib/tier-list.mjs';
import { selectableEquipment } from '../src/lib/equipment.mjs';

const dom = new JSDOM('<div id="root"></div>', { pretendToBeVisual: true });
for (const key of ['window', 'document', 'navigator', 'HTMLElement'])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.getComputedStyle = window.getComputedStyle.bind(window);
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
let nextFrame = 0;
const frames = new Map();
globalThis.requestAnimationFrame = (fn) => {
  frames.set(++nextFrame, fn);
  return nextFrame;
};
globalThis.cancelAnimationFrame = (id) => frames.delete(id);
const require = createRequire(import.meta.url);
const React = require('react');
const { createRoot } = require('react-dom/client');
const directory = await fs.mkdtemp(path.resolve('work/tier-ui-'));
const root = createRoot(document.getElementById('root'));
try {
  const outfile = path.join(directory, 'component.cjs');
  await build({
    entryPoints: ['src/components/TierList.jsx'],
    outfile,
    bundle: true,
    jsx: 'automatic',
    platform: 'node',
    format: 'cjs',
    packages: 'external',
    plugins: [
      {
        name: 'native-controls',
        setup(builder) {
          builder.onResolve({ filter: /^\.\/ui$/ }, () => ({
            path: 'controls',
            namespace: 'controls',
          }));
          builder.onLoad({ filter: /.*/, namespace: 'controls' }, () => ({
            contents: `import React from 'react';export const Input=p=>React.createElement('input',p);`,
            loader: 'js',
            resolveDir: process.cwd(),
          }));
        },
      },
    ],
  });
  const TierList = require(outfile).default;
  let value = emptyTierList();
  let disabled = false;
  let editable = true;
  let commits = 0;
  const render = () =>
    root.render(
      React.createElement(TierList, {
        value,
        disabled,
        ...(editable
          ? {
              onChange: (next) => {
                commits++;
                value = next;
                render();
              },
            }
          : {}),
      }),
    );
  await React.act(async () => render());
  const [a, b, c] = selectableEquipment('primary').slice(0, 3);
  const card = (id) => document.querySelector(`[data-tier-item="${id}"]`);
  const zone = (row) => document.querySelector(`[data-tier-drop="${row === null ? 'pool' : row}"]`);
  let hit = null;
  document.elementFromPoint = () => hit;
  HTMLElement.prototype.getBoundingClientRect = function () {
    const parent = this.closest('[data-tier-drop]');
    const row = parent?.dataset.tierDrop === 'pool' ? 7 : Number(parent?.dataset.tierDrop || 0);
    const siblings = parent ? [...parent.querySelectorAll('.tier-item')] : [];
    const index = Math.max(0, siblings.indexOf(this));
    const left = 200 + index * 100,
      top = 100 + row * 100;
    return { left, right: left + 100, top, bottom: top + 90, width: 100, height: 90 };
  };
  let x = 0,
    y = 0;
  async function pointer(type, target = window, props = {}) {
    await React.act(async () => {
      const event = new window.MouseEvent(type, {
        bubbles: true,
        cancelable: true,
        button: 0,
        clientX: x,
        clientY: y,
        ...props,
      });
      Object.defineProperties(event, {
        pointerId: { value: 1 },
        pointerType: { value: props.pointerType || 'mouse' },
        isPrimary: { value: true },
      });
      target.dispatchEvent(event);
      if (type === 'pointermove') {
        const pending = [...frames.entries()];
        frames.clear();
        pending.forEach(([, fn]) => fn());
      }
    });
  }
  async function begin(id, row, before = null, pointerType = 'mouse', area = 'card') {
    x = 10;
    y = 300;
    const source =
      area === 'image'
        ? card(id).querySelector('img')
        : area === 'name'
          ? card(id).querySelector('.equipment-inline > span')
          : card(id);
    await pointer('pointerdown', source, { pointerType });
    hit = before ? card(before) : zone(row);
    const rect = hit.getBoundingClientRect();
    x = before ? rect.left + 10 : 2000;
    y = rect.top + 30;
    await pointer('pointermove');
  }
  const release = () => pointer('pointerup');
  const escape = () =>
    React.act(async () =>
      window.dispatchEvent(new window.KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    );
  const preview = () => document.querySelector('[data-tier-placeholder]');
  await begin(a.id, 0);
  assert.equal(commits, 0, 'Drag preview must not mutate the draft');
  assert.equal(preview().closest('[data-tier-drop]').dataset.tierDrop, '0');
  assert.ok(document.querySelector('.tier-drag-overlay'));
  await release();
  assert.deepEqual(value.rows[0].items, [a.id]);
  assert.equal(preview(), null);
  for (const item of [b, c]) {
    await begin(item.id, 0);
    await release();
  }
  await begin(c.id, 0, b.id);
  assert.equal(preview().nextElementSibling.dataset.tierItem, b.id);
  assert.equal(preview().previousElementSibling.dataset.tierItem, a.id);
  assert.deepEqual(value.rows[0].items, [a.id, b.id, c.id]);
  // The preview is itself a stable hit target, even though inserting it shifts neighbours.
  hit = preview();
  await pointer('pointermove');
  assert.equal(preview().nextElementSibling.dataset.tierItem, b.id);
  await escape();
  assert.equal(preview(), null);
  assert.equal(document.querySelector('.tier-drag-overlay'), null);
  assert.deepEqual(value.rows[0].items, [a.id, b.id, c.id]);
  await begin(c.id, 0, b.id);
  await release();
  assert.deepEqual(value.rows[0].items, [a.id, c.id, b.id]);
  for (const cancel of [
    () => pointer('pointercancel'),
    () => React.act(async () => window.dispatchEvent(new window.Event('blur'))),
    async () => {
      hit = document.body;
      await release();
    },
  ]) {
    await begin(b.id, 2);
    await cancel();
    assert.equal(preview(), null);
    assert.deepEqual(value.rows[0].items, [a.id, c.id, b.id]);
    assert.deepEqual(value.rows[2].items, []);
  }
  await begin(b.id, 2, null, 'touch');
  await release();
  assert.deepEqual(value.rows[2].items, [b.id]);
  await begin(a.id, null);
  await release();
  assert.deepEqual(value.rows[0].items, [c.id]);
  assert.equal(card(a.id).closest('[data-tier-drop]').dataset.tierDrop, 'pool');
  await React.act(async () =>
    card(c.id).dispatchEvent(
      new window.KeyboardEvent('keydown', { key: 'ArrowDown', bubbles: true }),
    ),
  );
  assert.deepEqual(value.rows[1].items, [c.id]);
  for (const pointerType of ['mouse', 'touch', 'pen']) {
    for (const area of ['image', 'name', 'card']) {
      const before = commits;
      await begin(a.id, 6, null, pointerType, area);
      assert.ok(preview(), `${pointerType}: drag should start from ${area}`);
      assert.equal(commits, before);
      await release();
      assert.deepEqual(value.rows[6].items, [a.id]);
      await begin(a.id, null, null, pointerType, area);
      await release();
      assert.deepEqual(value.rows[6].items, []);
    }
  }
  assert.equal(document.querySelector('.tier-drag-handle'), null);
  disabled = true;
  await React.act(async () => render());
  await begin(a.id, 1);
  await release();
  assert.deepEqual(value.rows[1].items, [c.id]);
  assert.equal(preview(), null);
  editable = false;
  await React.act(async () => render());
  assert.equal(document.querySelector('.tier-pool'), null);
  assert.equal(document.querySelectorAll('[data-equipment]').length, 2);
  console.log(
    'PASS: pointer/touch dragging, insertion ghost before commit, stable middle preview, drop order, Escape/outside/cancel/blur restoration, pool return, keyboard and disabled controls',
  );
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  if (path.dirname(directory) === path.resolve('work'))
    await fs.rm(directory, { recursive: true, force: true });
}
