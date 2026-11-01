import catalog from './warbond-catalog.mjs';
import rewards from './warbond-rewards.mjs';
import { equipmentForId, equipmentGroupLabels } from './equipment.mjs';

export const warbondTypes = {
  standard: '기본 채권',
  premium: '프리미엄 채권',
  legendary: '전설 채권',
};
export const rewardTypes = {
  ...equipmentGroupLabels,
  suit: '방어구',
  helmet: '헬멧',
  cape: '망토',
  card: '플레이어 카드',
  emote: '감정 표현',
  pose: '승리 포즈',
  pattern: '패턴',
  title: '칭호',
  credits: '슈퍼 크레딧',
};
const rewardById = new Map(rewards.map((item) => [item.id, item]));

// Placements contain references and costs only. Canonical names, art and effects
// always come from the shared catalogs, never from a page-local override.
export function resolveWarbondReward({ equipmentId, rewardId, medals, amount }) {
  if (Boolean(equipmentId) === Boolean(rewardId))
    throw new Error('A warbond reward must reference exactly one catalog item');
  const item = equipmentId ? equipmentForId(equipmentId) : rewardById.get(rewardId);
  if (!item) throw new Error(`Unknown warbond reward: ${equipmentId || rewardId}`);
  const kind = equipmentId ? item.group : item.kind;
  const passive = item.passiveId ? equipmentForId(item.passiveId) : undefined;
  if (item.passiveId && passive?.group !== 'armor')
    throw new Error(`Unknown armor passive: ${item.passiveId}`);
  const detailItem = passive || item;
  return {
    ...item,
    ...(equipmentId ? { equipmentId } : { rewardId }),
    medals,
    kind,
    typeLabel: rewardTypes[kind],
    ...(amount ? { amount, label: `${amount} ${item.label}` } : {}),
    passive,
    detailsId: detailItem.details ? detailItem.id : undefined,
  };
}

export const warbonds = catalog.map((item) => {
  const cover = equipmentForId(item.id);
  if (cover?.group !== 'warbond') throw new Error(`Unknown warbond cover: ${item.id}`);
  const pages = item.pages.map((page) => ({
    ...page,
    items: page.items.map(resolveWarbondReward),
  }));
  const items = pages.flatMap((page) => page.items);
  return {
    ...item,
    label: cover.label,
    name: cover.name,
    src: cover.src,
    typeLabel: warbondTypes[item.type],
    pages,
    rewardCount: items.length,
    totalMedals: items.reduce((sum, entry) => sum + entry.medals, 0),
    credits: items.reduce((sum, entry) => sum + (entry.amount || 0), 0),
    searchText: [
      cover.label,
      cover.name,
      ...(cover.searchAliases || []),
      ...items.flatMap((entry) => [
        entry.label,
        entry.name,
        ...(entry.searchAliases || []),
        entry.passive?.label,
        entry.passive?.name,
        ...(entry.passive?.searchAliases || []),
      ]),
    ].join(' '),
  };
});
const bySlug = new Map(warbonds.map((item) => [item.slug, item]));
export const warbondForSlug = (slug) => bySlug.get(slug);
export function warbondListEntries() {
  return warbonds.map(({ pages, source, ...item }) => ({ ...item, pageCount: pages.length }));
}
export function warbondPageNumber(value, pageCount) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= pageCount ? parsed : 1;
}
