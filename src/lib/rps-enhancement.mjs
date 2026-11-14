export const rpsMaxHandLevel = 20;
const names = [
  '여행자의 손',
  '불씨의 손',
  '서리의 손',
  '바람의 손',
  '대지의 손',
  '룬 수호자의 손',
  '황혼 기사의 손',
  '은빛 파수꾼의 손',
  '폭풍술사의 손',
  '여명의 성기사의 손',
  '용혈 군주의 손',
  '별빛 현자의 손',
  '심연 파수자의 손',
  '불사조의 손',
  '천공 지배자의 손',
  '운명의 직조자의 손',
  '태고의 용왕의 손',
  '차원 파괴자의 손',
  '영원의 군주의 손',
  '신성의 창조자의 손',
  '창세신의 손',
];
const chances = [100, 98, 95, 92, 90, 85, 80, 75, 70, 65, 60, 58, 56, 54, 52, 50, 48, 46, 43, 40];
const costs = [
  100, 150, 200, 300, 400, 600, 800, 1000, 1300, 1600, 2000, 2400, 2800, 3300, 3900, 4600, 5400,
  6300, 7300, 8500,
];
export const rpsHandStages = names.map((name, level) => ({
  level,
  name,
  cost: level ? costs[level - 1] : 0,
  successPercent: level ? chances[level - 1] : 0,
  failureDrop: level <= 5 ? 0 : level <= 10 ? 1 : 2,
}));
export function rpsHandLevel(level) {
  return Number.isInteger(level) ? Math.min(rpsMaxHandLevel, Math.max(0, level)) : 0;
}
export function rpsHandState(user) {
  return { level: rpsHandLevel(user.rpsHand?.level), version: user.rpsHand?.version || 0 };
}
