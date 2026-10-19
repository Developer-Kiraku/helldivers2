import assert from 'node:assert/strict';
import { JSDOM } from 'jsdom';
import { htmlTextSegments, replaceHtmlText } from '../src/lib/ai-draft.mjs';
import { polishPost, validatePolishInput } from '../src/lib/server/ai-polish.mjs';

const dom = new JSDOM();
const html = '<p><span style="font-size:23px">맞춤뻡</span> 고쳐줘</p><img src="https://example.com/a.png"><iframe src="https://www.youtube-nocookie.com/embed/M7lc1UVf-VE"></iframe><p><a href="https://example.com">링크</a></p><pre><code>const x = 1;</code></pre>';
assert.deepEqual(htmlTextSegments(html, dom.window.document), ['맞춤뻡', ' 고쳐줘', '링크']);
const changed = replaceHtmlText(html, ['맞춤법', ' 고쳐 줘', '<script>alert(1)</script>'], dom.window.document);
const root = dom.window.document.createElement('div'); root.innerHTML = changed;
assert.equal(root.querySelector('script'), null);
assert.equal(root.querySelector('span').style.fontSize, '23px');
assert.equal(root.querySelector('img').src, 'https://example.com/a.png');
assert.equal(root.querySelector('a').href, 'https://example.com/');
assert.ok(root.querySelector('iframe'));
assert.equal(root.querySelector('code').textContent, 'const x = 1;');
assert.throws(() => replaceHtmlText(html, [], dom.window.document));
for (const input of [null, {}, { title: 'x', segments: [1] }, { title: '', segments: [] }, { title: 'x', segments: ['x'.repeat(10001)] }]) assert.throws(() => validatePolishInput(input));
let calls = 0;
const input = { title: '제목', segments: ['맞춤뻡'] };
const result = { title: '제목', segments: ['맞춤법'] };
const options = { apiKey: 'test-key', fetcher: async (url, init) => {
  calls++;
  assert.equal(url, 'https://api.openai.com/v1/responses');
  const body = JSON.parse(init.body);
  assert.equal(body.store, false);
  assert.equal(body.text.format.strict, true);
  assert.deepEqual(JSON.parse(body.input), input);
  return { ok: true, json: async () => ({ status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify(result) }] }] }) };
} };
assert.deepEqual(await polishPost(input, options), result);
assert.equal(calls, 1);
await assert.rejects(polishPost(input, { apiKey: '' }), error => error.status === 503);
await assert.rejects(polishPost(input, { ...options, fetcher: async () => ({ ok: false, status: 429 }) }), error => error.status === 429);
await assert.rejects(polishPost(input, { ...options, fetcher: async () => { throw Error('secret provider details'); } }), error => error.status === 502 && !error.message.includes('secret'));
for (const data of [
  { status: 'incomplete', output: [] },
  { status: 'completed', output: [{ content: [{ type: 'refusal', refusal: 'No' }] }] },
  { status: 'completed', output: [{ content: [{ type: 'output_text', text: JSON.stringify({ title: '제목', segments: [] }) }] }] },
]) await assert.rejects(polishPost(input, { ...options, fetcher: async () => ({ ok: true, json: async () => data }) }), error => error.status === 502);
dom.window.close();
console.log('PASS: AI correction validation, API payload/errors/refusal, escaped text and media/format/code preservation');
