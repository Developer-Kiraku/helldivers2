import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { closeHistory } from '@tiptap/pm/history';
import { commentDocument, commentText, commentExtensions } from '../src/lib/comment-editor.js';
import { equipment } from '../src/lib/equipment.mjs';
const dom = new JSDOM('<!doctype html><html><body></body></html>', { pretendToBeVisual: true });
for (const name of [
  'window',
  'document',
  'navigator',
  'HTMLElement',
  'Node',
  'DOMParser',
  'MutationObserver',
])
  Object.defineProperty(globalThis, name, { configurable: true, value: dom.window[name] });
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
const gear = equipment[0];
const original = `첫 줄 :hd01: ${gear.token}\n\n끝 :gear-unknown: <script>  `;
const editor = new Editor({
  element: document.createElement('div'),
  extensions: commentExtensions(1000),
  content: commentDocument(original),
});
assert.equal(commentText(editor.getJSON()), original);
assert.equal(editor.view.dom.querySelectorAll('img').length, 2);
assert.ok(editor.view.dom.textContent.includes(gear.label));
assert.ok(!editor.view.dom.textContent.includes(gear.token));
editor.commands.setContent(commentDocument('앞뒤'));
editor.view.dispatch(closeHistory(editor.state.tr));
editor
  .chain()
  .setTextSelection({ from: 1, to: 2 })
  .insertContent({ type: 'equipment', attrs: { id: gear.id } })
  .run();
assert.equal(commentText(editor.getJSON()), gear.token + '뒤');
editor.commands.undo();
assert.equal(commentText(editor.getJSON()), '앞뒤');
editor.commands.setContent(commentDocument(original));
const restored = new Editor({
  element: document.createElement('div'),
  extensions: commentExtensions(1000),
  content: commentDocument(commentText(editor.getJSON())),
});
assert.equal(restored.view.dom.querySelectorAll('img').length, 2);
editor.commands.setContent(commentDocument('a'.repeat(1000)));
editor.commands.insertContent('b');
assert.equal(commentText(editor.getJSON()).length, 1000);
editor.commands.setContent(commentDocument(''));
assert.equal(commentText(editor.getJSON()), '');
editor.setEditable(false);
assert.equal(editor.view.dom.getAttribute('contenteditable'), 'false');
editor.destroy();
restored.destroy();
dom.window.close();
console.log(
  'PASS comment visual atoms, exact text/newline roundtrip, selection replacement, undo, length limit, clear and disabled',
);
