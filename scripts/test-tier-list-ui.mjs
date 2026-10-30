import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { createRequire } from 'node:module';
import { build } from 'esbuild';
import { JSDOM } from 'jsdom';
import { emptyTierList } from '../src/lib/tier-list.mjs';
import { selectableEquipment } from '../src/lib/equipment.mjs';

const dom = new JSDOM('<div id="root"></div>');
for (const key of ['window', 'document', 'navigator', 'HTMLElement'])
  Object.defineProperty(globalThis, key, { configurable: true, value: dom.window[key] });
globalThis.IS_REACT_ACT_ENVIRONMENT = true;
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
            contents: `import React from 'react';export const Button=p=>React.createElement('button',p);export const Input=p=>React.createElement('input',p);export const Select=p=>React.createElement('select',p);`,
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
  const render = () =>
    root.render(
      React.createElement(TierList, {
        value,
        disabled,
        ...(editable
          ? {
              onChange: (next) => {
                value = next;
                render();
              },
            }
          : {}),
      }),
    );
  await React.act(async () => render());
  const [a, b] = selectableEquipment('primary').slice(0, 2);
  const card = (id) => document.querySelector(`[data-equipment="${id}"]`).closest('button');
  const row = (i) => document.querySelectorAll('.tier-row')[i];
  async function drag(id, destination) {
    await React.act(async () => {
      const event = new window.Event('dragstart', { bubbles: true });
      Object.defineProperty(event, 'dataTransfer', { value: { setData() {} } });
      card(id).dispatchEvent(event);
    });
    await React.act(async () =>
      destination().dispatchEvent(new window.Event('drop', { bubbles: true, cancelable: true })),
    );
  }
  await drag(a.id, () => row(0));
  await drag(b.id, () => row(0));
  assert.deepEqual(value.rows[0].items, [a.id, b.id]);
  await drag(b.id, () => card(a.id));
  assert.deepEqual(value.rows[0].items, [b.id, a.id]);
  await drag(a.id, () => row(2));
  assert.deepEqual(value.rows[2].items, [a.id]);
  await drag(a.id, () => document.querySelector('.tier-pool'));
  assert.deepEqual(value.rows[2].items, []);
  await React.act(async () => card(a.id).click());
  const chooseTier = async (target) =>
    React.act(async () => {
      const select = document.querySelector('[aria-label="이동할 티어"]');
      select.value = target;
      select.dispatchEvent(new window.Event('change', { bubbles: true }));
    });
  await chooseTier('0');
  assert.deepEqual(value.rows[0].items, [b.id, a.id]);
  await React.act(async () => document.querySelector('[aria-label="앞으로 이동"]').click());
  assert.deepEqual(value.rows[0].items, [a.id, b.id]);
  await React.act(async () => document.querySelector('[aria-label="뒤로 이동"]').click());
  assert.deepEqual(value.rows[0].items, [b.id, a.id]);
  await chooseTier('pool');
  assert.deepEqual(value.rows[0].items, [b.id]);
  disabled = true;
  await React.act(async () => render());
  await drag(a.id, () => row(1));
  assert.deepEqual(value.rows[1].items, []);
  editable = false;
  await React.act(async () => render());
  assert.equal(document.querySelector('.tier-pool'), null);
  assert.equal(document.querySelectorAll('[data-equipment]').length, 1);
  assert.equal(document.querySelector('[data-equipment]').dataset.equipment, b.id);
  console.log(
    'PASS: actual tier component drag/drop insertion, row transfer, pool return, tap movement/reorder, disabled state and published pool exclusion',
  );
} finally {
  await React.act(async () => root.unmount());
  dom.window.close();
  // The temporary directory is created directly under this workspace's work folder.
  if (path.dirname(directory) === path.resolve('work'))
    await fs.rm(directory, { recursive: true, force: true });
}
