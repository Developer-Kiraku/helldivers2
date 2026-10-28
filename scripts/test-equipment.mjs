import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {
  equipment,
  equipmentGroups,
  equipmentForId,
  equipmentParts,
  equipmentHtml,
} from '../src/lib/equipment.mjs';
import { sanitizePostHtml } from '../src/lib/server/post-html.mjs';
import { postSummary } from '../src/lib/post-summary.mjs';

assert.equal(new Set(equipment.map((item) => item.id)).size, equipment.length);
const selectableStratagems = equipment.filter(
  (item) => item.group === 'stratagem' && item.selectable !== false,
);
assert.equal(selectableStratagems.length, 95);
for (const name of [
  'Reinforce',
  'Resupply',
  'NUX-223 Hellbomb',
  'Eagle Rearm',
  'Super Earth Flag',
]) {
  assert.ok(!selectableStratagems.some((item) => item.name === name));
}
for (const [group] of equipmentGroups) assert.ok(equipment.some((item) => item.group === group));
for (const item of equipment) {
  assert.match(item.id, /^[a-z0-9]+(?:-[a-z0-9]+)*$/);
  assert.equal(equipmentForId(item.id), item);
  const image = await sharp(await fs.readFile(`public${item.src}`)).metadata();
  assert.equal(image.format, 'webp');
  assert.equal(image.width, 240);
  assert.equal(image.height, 160);
  assert.equal(sanitizePostHtml(equipmentHtml(item)), equipmentHtml(item));
}
const item = equipment[0];
const caltrops = equipmentForId('throwable-g-11-caltrops');
const { data: pixels, info } = await sharp(`public${caltrops.src}`)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });
let minX = info.width,
  maxX = -1,
  minY = info.height,
  maxY = -1;
for (let y = 0; y < info.height; y++)
  for (let x = 0; x < info.width; x++) {
    if (pixels[(y * info.width + x) * info.channels + 3] > 10) {
      minX = Math.min(minX, x);
      maxX = Math.max(maxX, x);
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
  }
assert.ok(
  maxX >= minX && maxX - minX + 1 <= 156 && maxY - minY + 1 <= 104,
  'Caltrops artwork stays within the reduced visual size',
);
assert.equal(equipmentParts(`앞 ${item.token} 뒤`)[1].equipment, item);
assert.equal(equipmentParts(':gear-not-real:')[0].equipment, undefined);
assert.equal(postSummary({ content: `추천 ${item.token}` }), `추천 [${item.label}]`);
const spoof = `<span data-equipment="${item.id}" class="evil" onclick="bad()"><img src="https://evil.invalid/a"><span>가짜 이름</span><script>bad()</script></span>`;
assert.equal(sanitizePostHtml(spoof), equipmentHtml(item));
assert.ok(
  !sanitizePostHtml(
    '<span data-equipment="unknown" class="equipment-inline">텍스트</span>',
  ).includes('data-equipment'),
);
assert.ok(!sanitizePostHtml('<img src="/equipment/not-real.webp">').includes('<img'));
console.log(
  `PASS: ${equipment.length} equipment assets, IDs, categories, tokens, summaries and canonical safe HTML`,
);
