import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {
  warbonds,
  warbondForSlug,
  warbondPageNumber,
  warbondListEntries,
} from '../src/lib/warbonds.mjs';
import { equipment, equipmentForId } from '../src/lib/equipment.mjs';

const source = JSON.parse(await fs.readFile('docs/warbonds/sources.json', 'utf8'));
assert.equal(warbonds.length, equipment.filter((item) => item.group === 'warbond').length);
assert.equal(new Set(warbonds.map((item) => item.slug)).size, warbonds.length);
const assets = new Set(['/warbonds/medal.webp']);
for (const warbond of warbonds) {
  assert.equal(warbond.pages.length, warbond.type === 'standard' ? 10 : 3, warbond.label);
  assert.equal(
    warbond.totalMedals,
    source.warbonds.find((item) => item.id === warbond.id).expectedMedals,
    warbond.label,
  );
  assert.equal(
    warbond.price,
    warbond.type === 'standard' ? 0 : warbond.type === 'legendary' ? 1500 : 1000,
  );
  assert.equal(
    warbond.credits,
    warbond.type === 'standard' ? 750 : warbond.type === 'legendary' ? 0 : 300,
  );
  assert.deepEqual(
    warbond.pages.map((page) => page.number),
    Array.from({ length: warbond.pages.length }, (_, i) => i + 1),
  );
  for (const page of warbond.pages) {
    assert.ok(page.items.length >= 4, `${warbond.label} ${page.number}`);
    assert.equal(new Set(page.items.map((item) => item.id)).size, page.items.length);
    for (const item of page.items) {
      assert.ok(item.label && item.typeLabel && item.src);
      assert.ok(Number.isInteger(item.medals) && item.medals > 0);
      if (item.equipmentId) assert.equal(item.src, equipmentForId(item.equipmentId).src);
      if (item.kind === 'suit')
        assert.equal(item.passive?.group, 'armor', `${item.label} must reference a real passive`);
      assert.notEqual(
        item.kind,
        'armor',
        'A real armor reward must not be substituted with its passive icon',
      );
      assets.add(item.src);
    }
  }
}
for (const src of assets) {
  assert.match(src, /^\/(equipment|warbonds)\/[a-z0-9-]+\.webp$/);
  const info = await sharp(`public${src}`).metadata();
  assert.ok(info.width > 0 && info.height > 0, src);
}
assert.equal(warbondForSlug('../unknown'), undefined);
for (const value of ['bad', '-1', '0', '3.5', '999', undefined])
  assert.equal(warbondPageNumber(value, 3), 1);
assert.equal(warbondPageNumber('3', 3), 3);
assert.ok(
  warbondListEntries()
    .find((item) => item.slug === 'cutting-edge')
    .searchText.includes('시클'),
);
assert.ok(warbondListEntries().every((item) => !('pages' in item)));
console.log(
  `PASS: ${warbonds.length} warbonds, complete page membership, verified medal/credit totals, ${assets.size} local images, shared equipment references`,
);
