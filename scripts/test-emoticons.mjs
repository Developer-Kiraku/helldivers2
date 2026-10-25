import assert from 'node:assert/strict';
import sharp from 'sharp';
import { emoticons, emoticonForSrc, emoticonParts } from '../src/lib/emoticons.mjs';
import { sanitizePostHtml } from '../src/lib/server/post-html.mjs';
assert.equal(emoticons.length, 50);
assert.equal(new Set(emoticons.map((item) => item.src)).size, 50);
for (const item of emoticons) {
  const metadata = await sharp('public' + item.src).metadata();
  assert.equal(metadata.width, 256);
  assert.equal(metadata.height, 256);
  assert.equal(metadata.hasAlpha, true);
  const html = sanitizePostHtml(
    `<p><img src="${item.src}" class="evil" alt="wrong" onerror="alert(1)" data-emoticon="99"></p>`,
  );
  assert.ok(html.includes(`data-emoticon="${item.id}"`));
  assert.ok(!/evil|wrong|onerror/.test(html));
}
for (const src of [
  '/emoticons/00.webp',
  '/emoticons/51.webp',
  'https://evil.example/emoticons/01.webp',
  '/emoticons/../01.webp',
  '/emoticons/01.webp?x=1',
]) {
  assert.equal(emoticonForSrc(src), undefined);
  assert.ok(!sanitizePostHtml(`<img src="${src}">`).includes('<img'));
}
const parts = emoticonParts('안녕 :hd01: <script>x</script> :hd40: :hd42: :hd50: :hd51: :hd00:');
assert.equal(parts.filter((p) => p.emoticon).length, 4);
assert.ok(parts.some((p) => p.text.includes(':hd51:')));
assert.equal(parts.find((p) => p.text === ':hd00:').emoticon, undefined);
console.log(
  'PASS: 50 transparent emoticons, safe source allowlist, canonical markup and text tokens.',
);
