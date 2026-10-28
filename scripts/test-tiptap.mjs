import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { Editor } from '@tiptap/core';
import { communityEditorExtensions } from '../src/lib/tiptap-extensions.js';
import { sanitizePostHtml } from '../src/lib/server/post-html.mjs';

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
  Object.defineProperty(globalThis, name, {
    configurable: true,
    writable: true,
    value: dom.window[name],
  });
globalThis.getComputedStyle = dom.window.getComputedStyle.bind(dom.window);
globalThis.requestAnimationFrame = dom.window.requestAnimationFrame.bind(dom.window);
globalThis.cancelAnimationFrame = dom.window.cancelAnimationFrame.bind(dom.window);
const { cleanEditorHtml } = await import('../src/lib/editor-html.js');
const make = (content) =>
  new Editor({
    element: document.createElement('div'),
    extensions: communityEditorExtensions(),
    content,
  });
const loaded = make('');
const { equipment, equipmentHtml } = await import('../src/lib/equipment.mjs');
const gear = equipment[0];
const gearEditor = make('<p>앞 뒤</p>');
gearEditor
  .chain()
  .setTextSelection(3)
  .insertContent({ type: 'equipment', attrs: { id: gear.id } })
  .run();
assert.ok(gearEditor.getText().includes(gear.token));
const gearSaved = sanitizePostHtml(cleanEditorHtml(gearEditor.getHTML()));
assert.ok(gearSaved.includes(equipmentHtml(gear)));
const gearRestored = make(gearSaved);
assert.ok(gearRestored.getText().includes(gear.token));
let gearCount = 0;
gearRestored.state.doc.descendants((node) => {
  if (node.type.name === 'equipment') gearCount++;
});
assert.equal(gearCount, 1);
gearEditor.commands.undo();
assert.ok(!gearEditor.getHTML().includes('data-equipment'));
gearEditor.destroy();
gearRestored.destroy();
const sticker = make('<p>앞 뒤</p>');
sticker
  .chain()
  .setTextSelection(3)
  .insertContent({ type: 'emoticon', attrs: { id: '03' } })
  .run();
assert.match(sticker.getHTML(), /data-emoticon="03"/);
assert.ok(sticker.getText().includes(':hd03:'));
const stickerHtml = sanitizePostHtml(cleanEditorHtml(sticker.getHTML()));
assert.match(stickerHtml, /src="\/emoticons\/03.webp"/);
const stickerRestored = make(stickerHtml);
let stickerNodes = 0;
stickerRestored.state.doc.descendants((node) => {
  if (node.type.name === 'emoticon') stickerNodes++;
});
assert.equal(stickerNodes, 1);
assert.match(stickerRestored.getHTML(), /class="post-emoticon"/);
sticker.commands.undo();
assert.ok(!sticker.getHTML().includes('/emoticons/'));
sticker.destroy();
stickerRestored.destroy();
loaded
  .chain()
  .setContent('<p>저장된 본문</p>', { emitUpdate: false })
  .setMeta('addToHistory', false)
  .run();
assert.equal(loaded.can().undo(), false);
loaded.destroy();
const formatted = make('<p>서식 검증</p>');
formatted.commands.selectAll();
for (const [mark, command, tag] of [
  ['bold', 'toggleBold', 'strong'],
  ['italic', 'toggleItalic', 'em'],
  ['underline', 'toggleUnderline', 'u'],
  ['strike', 'toggleStrike', 's'],
]) {
  formatted.commands[command]();
  assert.equal(formatted.isActive(mark), true);
  assert.ok(formatted.getHTML().includes(`<${tag}>`));
}
const formattedSaved = sanitizePostHtml(cleanEditorHtml(formatted.getHTML()));
const formattedRestored = make(formattedSaved);
formattedRestored.commands.selectAll();
for (const mark of ['bold', 'italic', 'underline', 'strike'])
  assert.equal(formattedRestored.isActive(mark), true);
formattedRestored.commands.setFontSize('23px');
formattedRestored.commands.unsetAllMarks();
assert.equal(formattedRestored.getHTML(), '<p>서식 검증</p>');
formattedRestored.commands.undo();
assert.match(formattedRestored.getHTML(), /font-size: 23px/);
for (const mark of ['bold', 'italic', 'underline', 'strike'])
  assert.equal(formattedRestored.isActive(mark), true);
formatted.commands.toggleStrike();
assert.equal(formatted.isActive('strike'), false);
assert.equal(formatted.isActive('bold'), true);
formatted.commands.setTextSelection(formatted.state.doc.content.size - 1);
formatted.commands.insertContent(' 이어쓰기');
assert.match(formatted.getHTML(), /이어쓰기<\/u>/);
formatted.destroy();
formattedRestored.destroy();
const first = make('<p><span style="font-size:17px">기존 본문</span></p>');
first.commands.selectAll();
first.commands.setColor('#65afff');
assert.equal(first.getAttributes('textStyle').color, '#65afff');
const colored = sanitizePostHtml(cleanEditorHtml(first.getHTML()));
assert.match(colored, /color:rgb\(101, 175, 255\)/);
const colorRestored = make(colored);
colorRestored.commands.selectAll();
assert.equal(colorRestored.getAttributes('textStyle').color, 'rgb(101, 175, 255)');
colorRestored.commands.unsetAllMarks();
assert.ok(!colorRestored.getHTML().includes('color:'));
colorRestored.commands.undo();
assert.match(colorRestored.getHTML(), /color: rgb\(101, 175, 255\)/);
colorRestored.destroy();
first.commands.setFontSize('19px');
assert.match(first.getHTML(), /font-size: 19px/);
first.commands.undo();
assert.match(first.getHTML(), /font-size: 17px/);
first.commands.redo();
assert.match(first.getHTML(), /font-size: 19px/);
first.commands.setTextSelection(first.state.doc.content.size);
assert.equal(first.commands.setYoutubeVideo({ src: 'https://youtu.be/M7lc1UVf-VE?t=62' }), true);
const saved = sanitizePostHtml(cleanEditorHtml(first.getHTML()));
assert.match(saved, /font-size:19px/);
assert.match(saved, /youtube-nocookie.com/);
assert.match(saved, /start=62/);
const restored = make(saved);
let videos = 0;
restored.state.doc.descendants((node) => {
  if (node.type.name === 'youtube') videos++;
});
assert.equal(videos, 1);
assert.match(restored.getHTML(), /font-size: 19px/);
assert.match(restored.getHTML(), /start=62/);
restored.commands.setContent(
  cleanEditorHtml(
    '<p><span style="font-size:23px">HTML 소스 수정</span></p><iframe src="https://www.youtube.com/embed/M7lc1UVf-VE"></iframe><script>alert(1)</script>',
  ),
);
assert.match(restored.getHTML(), /font-size: 23px/);
assert.ok(!restored.getHTML().includes('<script'));
assert.match(restored.getHTML(), /youtube-nocookie.com/);
first.destroy();
restored.destroy();
dom.window.close();
console.log(
  'PASS: Tiptap immediate font size, undo/redo, HTML source parsing, YouTube persistence and saved-HTML re-editing',
);
