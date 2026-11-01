import catalog from './warbond-catalog.mjs';
import rewards from './warbond-rewards.mjs';
import { equipmentForId } from './equipment.mjs';

export const warbondTypes = {
  standard: '기본 채권',
  premium: '프리미엄 채권',
  legendary: '전설 채권',
};
export const rewardTypes = {
  primary: '주무기',
  secondary: '보조무기',
  throwable: '투척무기',
  stratagem: '스트라타젬',
  booster: '부스터',
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

export function resolveWarbondReward(entry) {
  const item = entry.equipmentId
    ? equipmentForId(entry.equipmentId)
    : rewardById.get(entry.rewardId);
  if (!item) throw new Error(`Unknown warbond reward: ${entry.equipmentId || entry.rewardId}`);
  const kind = entry.equipmentId ? item.group : item.kind;
  return {
    ...item,
    ...entry,
    kind,
    typeLabel: rewardTypes[kind],
    ...(entry.amount ? { label: `${entry.amount} 슈퍼 크레딧` } : {}),
    passive: item.passiveId ? equipmentForId(item.passiveId) : undefined,
  };
}

export const warbonds = catalog.map((item) => {
  const cover = equipmentForId(item.id);
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
      ...items.flatMap((entry) => [entry.label, entry.name]),
    ].join(' '),
  };
});
export const warbondForSlug = (slug) => warbonds.find((item) => item.slug === slug);
export function warbondListEntries() {
  return warbonds.map(({ pages, source, ...item }) => ({ ...item, pageCount: pages.length }));
}
export function warbondPageNumber(value, pageCount) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed >= 1 && parsed <= pageCount ? parsed : 1;
}
