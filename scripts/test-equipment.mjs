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
