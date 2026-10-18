import assert from 'node:assert/strict';
import { youtubeEmbedUrl } from '../src/lib/editor-format.mjs';
import { sanitizePostHtml } from '../src/lib/server/post-html.mjs';

const video = 'M7lc1UVf-VE', embed = `https://www.youtube-nocookie.com/embed/${video}`;
for (const url of [`https://www.youtube.com/watch?v=${video}`,`https://youtu.be/${video}`,`https://youtube.com/shorts/${video}`,`https://m.youtube.com/live/${video}`,embed]) assert.equal(youtubeEmbedUrl(url),embed);
assert.equal(youtubeEmbedUrl(`https://youtu.be/${video}?t=1m2s`),embed+'?start=62');
for (const url of ['javascript:alert(1)',`https://youtube.com.attacker.example/embed/${video}`,`https://youtube.com@attacker.example/embed/${video}`,`https://youtube.com/embed/not-valid`,`https://attacker.example/${video}`]) assert.equal(youtubeEmbedUrl(url),null);
const clean = sanitizePostHtml(`<p style="font-size:17px;text-align:center;position:fixed;background:url(https://attacker.example)">본문 <span style="font-size:25px">강조</span></p><script>alert(1)</script><img src=x onerror=alert(1)><iframe src="https://youtube.com/embed/${video}?autoplay=1" srcdoc="<script>alert(1)</script>" onload="alert(1)"></iframe><iframe src="https://attacker.example"></iframe><font style="font-size:21px">글자</font>`);
assert.match(clean,/font-size:17px/);assert.match(clean,/font-size:25px/);assert.match(clean,/text-align:center/);assert.match(clean,/<span style="font-size:21px">글자/);
assert.ok(!/script|onload|onerror|srcdoc|position|background|autoplay|attacker/.test(clean));
assert.match(clean,/youtube-nocookie.com\/embed\//);assert.match(clean,/strict-origin-when-cross-origin/);
assert.equal((clean.match(/<iframe /g)||[]).length,1);
for(const size of [12,13,17,24,48,72])assert.match(sanitizePostHtml(`<span style="font-size:${size}px">a</span>`),new RegExp(`font-size:${size}px`));
for(const size of [0,11,73,1000])assert.ok(!sanitizePostHtml(`<span style="font-size:${size}px">a</span>`).includes('font-size'));
console.log('PASS: YouTube URL variants and start time, strict iframe origins, HTML XSS filtering, precise persisted font sizes');
