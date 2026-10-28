import catalog from './equipment-catalog.mjs';

export const equipmentGroups = [
  ['primary', '주무기'],
  ['secondary', '보조무기'],
  ['throwable', '투척무기'],
  ['stratagem', '스트라타젬'],
  ['booster', '부스터'],
  ['armor', '방어구 옵션'],
];
export const equipment = catalog.map((item) => ({ ...item, token: `:gear-${item.id}:` }));
const byId = new Map(equipment.map((item) => [item.id, item]));
const bySrc = new Map(equipment.map((item) => [item.src, item]));
export const equipmentForId = (id) => byId.get(id);
export const equipmentForSrc = (src) => bySrc.get(src);
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
  value.replace(
    /[&<>"']/g,
    (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char],
  );
export function equipmentHtml(item) {
  return `<span class="equipment-inline" data-equipment="${item.id}"><img src="${item.src}" alt=""><span>${escape(item.label)}</span></span>`;
}
