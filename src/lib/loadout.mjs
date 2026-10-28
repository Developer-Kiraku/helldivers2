import { equipmentForId } from './equipment.mjs';

export const loadoutFactions = ['테르미닛', '오토마톤', '일루미닛'];
export const armorClasses = ['경장갑', '일반장갑', '중장갑'];
export const loadoutSlots = [
  ['primary', '주무기'],
  ['secondary', '보조무기'],
  ['throwable', '투척무기'],
  ['armor', '갑옷 옵션'],
];
export const emptyLoadout = () => ({
  primary: '',
  secondary: '',
  throwable: '',
  armor: '',
  armorClass: '경장갑',
  stratagems: ['', '', '', ''],
});
export function normalizeLoadout(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value))
    throw Error('장비 세팅을 선택해주세요.');
  const result = {};
  for (const [group, label] of loadoutSlots) {
    const item = equipmentForId(value[group]);
    if (!item || item.group !== group || item.selectable === false)
      throw Error(`${label}을 선택해주세요.`);
    result[group] = item.id;
  }
  if (!armorClasses.includes(value.armorClass)) throw Error('갑옷 종류를 선택해주세요.');
  result.armorClass = value.armorClass;
  if (
    !Array.isArray(value.stratagems) ||
    value.stratagems.length !== 4 ||
    new Set(value.stratagems).size !== 4
  )
    throw Error('서로 다른 스트라타젬 4개를 선택해주세요.');
  result.stratagems = value.stratagems.map((id) => {
    const item = equipmentForId(id);
    if (!item || item.group !== 'stratagem' || item.selectable === false)
      throw Error('사용 가능한 스트라타젬을 선택해주세요.');
    return item.id;
  });
  return result;
}
