import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {
  equipment,
  equipmentGroups,
  equipmentForId,
  equipmentParts,
  equipmentHtml,
  equipmentMatchesSearch,
  selectableEquipment,
  stratagemKinds,
} from '../src/lib/equipment.mjs';
import { sanitizePostHtml } from '../src/lib/server/post-html.mjs';
import { postSummary } from '../src/lib/post-summary.mjs';
import { commentDocument, commentText } from '../src/lib/comment-editor.js';

assert.equal(new Set(equipment.map((item) => item.id)).size, equipment.length);
const authorityIds = [
  'primary-r-40-sightliner',
  'secondary-p-44-mist',
  'throwable-g-11-caltrops',
  'armor-stationary-shroud',
  'stratagem-amw-20-apex',
  'stratagem-las-44-nova',
  'warbond-scope-of-authority',
].sort();
for (const query of ['권한의 범위', '권위의 가늠자', 'scope OF authority']) {
  assert.deepEqual(
    selectableEquipment()
      .filter((item) => equipmentMatchesSearch(item, query))
      .map((item) => item.id)
      .sort(),
    authorityIds,
  );
}
assert.equal(equipmentForId('throwable-g-11-caltrops').label, 'G-11 마름쇠');
assert.equal(equipmentForId('armor-stationary-shroud').label, '정적인 장막');
assert.ok(equipmentMatchesSearch(equipmentForId('throwable-g-11-caltrops'), '캘트롭스'));
assert.ok(equipmentMatchesSearch(equipmentForId('armor-stationary-shroud'), '정지 은폐'));
const selectableStratagems = equipment.filter(
  (item) => item.group === 'stratagem' && item.selectable !== false,
);
assert.equal(selectableStratagems.length, 95);
const sortedStratagems = selectableEquipment('stratagem');
const kinds = stratagemKinds.map(([id]) => id);
assert.deepEqual([...new Set(sortedStratagems.map((item) => item.kind))], kinds);
assert.equal(new Set(sortedStratagems.map((item) => item.id)).size, 95);
for (const id of ['stratagem-amw-20-apex', 'stratagem-las-44-nova']) {
  assert.equal(equipmentForId(id).kind, 'support');
}
assert.equal(equipmentForId('stratagem-eagle-cluster-bomb').label, '이글 집속탄');
assert.equal(equipmentForId('armor-med-kit').label, '구급 키트');
for (const item of equipment) {
  for (const alias of item.searchAliases || []) assert.ok(equipmentMatchesSearch(item, alias));
}
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
  assert.equal(image.width, item.group === 'warbond' ? 640 : 240);
  assert.equal(image.height, item.group === 'warbond' ? 320 : 160);
  assert.equal(sanitizePostHtml(equipmentHtml(item)), equipmentHtml(item));
}
const item = equipment[0];
const warbonds = selectableEquipment('warbond');
assert.equal(warbonds.length, 26);
for (const warbond of warbonds) {
  assert.ok(warbond.id.startsWith('warbond-'));
  assert.equal(equipmentParts(warbond.token)[0].equipment, warbond);
  assert.equal(commentText(commentDocument(warbond.token)), warbond.token);
  assert.equal(postSummary({ content: warbond.token }), `[${warbond.label}]`);
}
assert.ok(equipmentMatchesSearch(equipmentForId('warbond-righteous-revenants'), '킬존'));
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
