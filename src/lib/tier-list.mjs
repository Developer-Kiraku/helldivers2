import { equipmentForId, equipmentGroups, selectableEquipment } from './equipment.mjs';

export const tierFactions = ['전체', '테르미닛', '오토마톤', '일루미닛'];
export const tierNames = ['S', 'A', 'B', 'C', 'D', 'E', '모름'];
export const emptyTierList = (group = equipmentGroups[0][0]) => ({
  group,
  faction: '전체',
  rows: tierNames.map((name) => ({ name, items: [] })),
});
export function normalizeTierList(value, { draft = false } = {}) {
  if (!value || !equipmentGroups.some(([group]) => group === value.group))
    throw Error('장비 분류를 선택해주세요.');
  if (!tierFactions.includes(value.faction)) throw Error('종족을 선택해주세요.');
  if (!Array.isArray(value.rows) || value.rows.length !== tierNames.length)
    throw Error('7개의 티어를 확인해주세요.');
  const seen = new Set();
  const rows = value.rows.map((row) => {
    const name = typeof row?.name === 'string' ? row.name.trim() : '';
    if (!name || name.length > 20) throw Error('티어명은 1~20자로 입력해주세요.');
    if (!Array.isArray(row.items) || row.items.length > 300)
      throw Error('티어의 장비 목록을 확인해주세요.');
    const items = row.items.map((id) => {
      const item = equipmentForId(id);
      if (!item || item.group !== value.group || item.selectable === false || seen.has(id))
        throw Error('분류에 맞는 장비를 중복 없이 배치해주세요.');
      seen.add(id);
      return id;
    });
    return { name, items };
  });
  if (!draft && !seen.size) throw Error('장비를 하나 이상 티어에 배치해주세요.');
  return { group: value.group, faction: value.faction, rows };
}
export function unrankedEquipment(value) {
  const ranked = new Set(value.rows.flatMap((row) => row.items));
  return selectableEquipment(value.group).filter((item) => !ranked.has(item.id));
}
// Insert before a specific item, or append to the row. A null row returns to the pool.
export function moveTierItem(value, id, targetRow, beforeId = null) {
  const item = equipmentForId(id);
  if (!item || item.group !== value.group || item.selectable === false) return value;
  if (beforeId === id) return value;
  if (targetRow !== null && !value.rows[targetRow]) return value;
  const rows = value.rows.map((row) => ({ ...row, items: row.items.filter((key) => key !== id) }));
  if (targetRow !== null) {
    const items = rows[targetRow].items;
    const index = beforeId ? items.indexOf(beforeId) : -1;
    items.splice(index < 0 ? items.length : index, 0, id);
  }
  return { ...value, rows };
}
