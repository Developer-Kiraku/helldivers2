import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import sharp from 'sharp';
import {
  warbonds,
  warbondForSlug,
  warbondPageNumber,
  warbondListEntries,
  resolveWarbondReward,
} from '../src/lib/warbonds.mjs';
import { equipment, equipmentForId } from '../src/lib/equipment.mjs';
import catalog from '../src/lib/warbond-catalog.mjs';
import rewards from '../src/lib/warbond-rewards.mjs';

const source = JSON.parse(await fs.readFile('docs/warbonds/sources.json', 'utf8'));
assert.equal(warbonds.length, equipment.filter((item) => item.group === 'warbond').length);
assert.equal(new Set(warbonds.map((item) => item.slug)).size, warbonds.length);
assert.equal(new Set(warbonds.map((item) => item.id)).size, warbonds.length);
assert.equal(new Set(rewards.map((item) => item.id)).size, rewards.length);
const rewardIds = new Set();
for (const warbond of catalog) {
  for (const page of warbond.pages) {
    for (const entry of page.items) {
      assert.equal(Boolean(entry.equipmentId) === Boolean(entry.rewardId), false);
      assert.ok(
        Object.keys(entry).every((key) =>
          ['equipmentId', 'rewardId', 'medals', 'amount'].includes(key),
        ),
        'Reward placements must not duplicate names, icons or effects',
      );
      if (entry.rewardId) rewardIds.add(entry.rewardId);
    }
  }
}
assert.deepEqual(
  [...rewardIds].sort(),
  rewards.map((item) => item.id).sort(),
  'No missing or unused dictionary-only rewards',
);
const reference = equipmentForId('primary-las-5-scythe');
const resolved = resolveWarbondReward({
  equipmentId: reference.id,
  medals: 1,
  label: 'stale name',
  src: '/stale.webp',
  details: {},
});
assert.equal(resolved.label, reference.label);
assert.equal(resolved.src, reference.src);
assert.equal(resolved.details, reference.details);
assert.throws(() => resolveWarbondReward({ equipmentId: 'unknown' }), /Unknown/);
assert.throws(
  () => resolveWarbondReward({ equipmentId: reference.id, rewardId: 'super-credits' }),
  /exactly one/,
);
const assets = new Set(['/warbonds/medal.webp']);
const combatRewards = new Set();
for (const warbond of warbonds) {
  const cover = equipmentForId(warbond.id);
  assert.equal(warbond.label, cover.label);
  assert.equal(warbond.src, cover.src);
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
      if (item.equipmentId) {
        const equipment = equipmentForId(item.equipmentId);
        assert.equal(item.src, equipment.src);
        assert.equal(item.label, equipment.label);
        assert.equal(item.details, equipment.details);
        assert.equal(item.detailsId, equipment.id);
        assert.ok(item.details, `${item.label} is missing its equipment details`);
        assert.ok(item.details.summary || item.details.stats.length || item.details.traits.length);
        assert.match(
          item.details.source,
          /^https:\/\/(www\.namu\.moe|blog\.ko\.playstation\.com)\//,
        );
        assert.match(item.details.checkedAt, /^\d{4}-\d{2}-\d{2}$/);
        assert.equal(
          new Set(item.details.stats.map(([label]) => label)).size,
          item.details.stats.length,
        );
        for (const [label, value] of item.details.stats) {
          assert.ok(label.trim() && value.trim());
          assert.doesNotMatch(value, /undefined|NaN|\?\?\?|[{}<>]/);
        }
        combatRewards.add(item.id);
      }
      if (item.kind === 'suit') {
        assert.equal(item.passive?.group, 'armor', `${item.label} must reference a real passive`);
        assert.equal(item.passive, equipmentForId(item.passiveId));
        assert.equal(item.detailsId, item.passiveId);
        assert.ok(item.passive.details.summary);
      }
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
assert.ok(combatRewards.size > 0);
assert.ok(warbondListEntries().some((item) => item.searchText.includes('구급 키트')));
assert.deepEqual(equipmentForId('primary-las-5-scythe').details.stats[0], ['초당 대미지', '350']);
assert.ok(
  equipmentForId('throwable-ted-63-dynamite').details.stats.some(
    ([label, value]) => label === '신관 지연 시간' && value === '5초 / 15초 / 60초',
  ),
);
assert.ok(
  equipmentForId('secondary-cqc-73-entrenchment-tool').details.traits.includes('근접 무기'),
);
assert.ok(equipmentForId('booster-surplus-eat-allocation').details.summary.includes('두 번'));
console.log(
  `PASS: ${warbonds.length} warbonds, complete page membership, verified medal/credit totals, ${assets.size} local images, shared equipment references`,
);
