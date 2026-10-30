import catalog from './equipment-catalog.mjs';

export const equipmentGroups = [
  ['primary', '주무기'],
  ['secondary', '보조무기'],
  ['throwable', '투척무기'],
  ['stratagem', '스트라타젬'],
  ['booster', '부스터'],
  ['armor', '방어구 옵션'],
  ['warbond', '채권'],
];
export const stratagemKinds = [
  ['support', '지원 무기'],
  ['backpack', '배낭'],
  ['eagle', '이글'],
  ['orbital', '궤도'],
  ['defense', '방어 시설'],
  ['vehicle', '탑승 장비'],
];
const kindOrder = new Map(stratagemKinds.map(([id], index) => [id, index]));
const groupOrder = new Map(equipmentGroups.map(([id], index) => [id, index]));
const nameOrder = new Intl.Collator('ko', { numeric: true });
export const equipment = catalog.map((item) => ({ ...item, token: `:gear-${item.id}:` }));
const byId = new Map(equipment.map((item) => [item.id, item]));
const bySrc = new Map(equipment.map((item) => [item.src, item]));
export const equipmentForId = (id) => byId.get(id);
export const equipmentForSrc = (src) => bySrc.get(src);
// Shared catalog access for post/comment pickers and loadout slots.
const selectable = equipment
  .filter((item) => item.selectable !== false)
  .sort((a, b) =>
    a.group === 'stratagem' && b.group === 'stratagem'
      ? (kindOrder.get(a.kind) ?? 99) - (kindOrder.get(b.kind) ?? 99) ||
        nameOrder.compare(a.label, b.label)
      : groupOrder.get(a.group) - groupOrder.get(b.group),
  );
export const selectableEquipment = (group) =>
  selectable.filter((item) => !group || item.group === group);
export const equipmentMatchesSearch = (item, search) =>
  [item.label, item.name, item.warbond, ...(item.searchAliases || [])]
    .filter(Boolean)
    .join(' ')
    .toLocaleLowerCase()
    .includes(search.trim().toLocaleLowerCase());
export function equipmentParts(value) {
  return String(value || '')
    .split(/(:gear-[a-z0-9-]+:)/g)
    .filter(Boolean)
    .map((text) => ({
      text,
      equipment: text.startsWith(':gear-') ? equipmentForId(text.slice(6, -1)) : undefined,
    }));
}
const escape = (value) =>
  value.replace(/[&<>]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;' })[char]);
export function equipmentHtml(item) {
  return `<span class="equipment-inline" data-equipment="${item.id}"><img src="${item.src}" alt=""><span>${escape(item.label)}</span></span>`;
}
