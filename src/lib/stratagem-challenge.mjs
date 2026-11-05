export const challengeEntry = 100;
export const challengeStages = [
  { payout: 100, commands: 5, seconds: 24, minLength: 3, maxLength: 3 },
  { payout: 150, commands: 6, seconds: 25, minLength: 4, maxLength: 4 },
  { payout: 220, commands: 7, seconds: 26, minLength: 4, maxLength: 5 },
  { payout: 320, commands: 8, seconds: 27, minLength: 5, maxLength: 5 },
  { payout: 450, commands: 9, seconds: 27, minLength: 5, maxLength: 6 },
  { payout: 650, commands: 10, seconds: 26, minLength: 6, maxLength: 6 },
  { payout: 900, commands: 11, seconds: 25, minLength: 6, maxLength: 7 },
  { payout: 1200, commands: 12, seconds: 25, minLength: 6, maxLength: 7 },
  { payout: 1500, commands: 13, seconds: 25, minLength: 6, maxLength: 7 },
  { payout: 2000, commands: 14, seconds: 25, minLength: 6, maxLength: 7 },
];
// Runs created before the rebalance have no saved stages; honor their original rules.
const originalStages = [
  { payout: 100, commands: 1, seconds: 12, minLength: 3, maxLength: 3 },
  { payout: 120, commands: 2, seconds: 11, minLength: 4, maxLength: 4 },
  { payout: 150, commands: 2, seconds: 10, minLength: 4, maxLength: 5 },
  { payout: 200, commands: 3, seconds: 10, minLength: 5, maxLength: 5 },
  { payout: 250, commands: 3, seconds: 9, minLength: 5, maxLength: 6 },
  { payout: 320, commands: 4, seconds: 9, minLength: 6, maxLength: 6 },
  { payout: 400, commands: 4, seconds: 8, minLength: 6, maxLength: 7 },
];
export const challengeStagesFor = (run) => run.stages || originalStages;
export const directionLabels = { U: '위', D: '아래', L: '왼쪽', R: '오른쪽' };
export const directionArrows = { U: '↑', D: '↓', L: '←', R: '→' };
export const directionKeys = {
  ArrowUp: 'U',
  ArrowDown: 'D',
  ArrowLeft: 'L',
  ArrowRight: 'R',
  KeyW: 'U',
  KeyS: 'D',
  KeyA: 'L',
  KeyD: 'R',
  w: 'U',
  s: 'D',
  a: 'L',
  d: 'R',
};
