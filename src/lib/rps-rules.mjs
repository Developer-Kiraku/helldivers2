import { rpsHandLevel } from './rps-enhancement.mjs';
export const rpsStakes = [50, 100, 500, 1000];
export const rpsDefaultStake = 100;
export const rpsDailyAttempts = 5;
export const rpsChoices = [
  { id: 'scissors', label: '가위' },
  { id: 'rock', label: '바위' },
  { id: 'paper', label: '보' },
];
export const rpsHandWinBonusTiers = [
  { from: 1, to: 5, percent: 1 },
  { from: 6, to: 10, percent: 1.5 },
  { from: 11, to: 15, percent: 2 },
  { from: 16, to: 20, percent: 3 },
];
// Integer tickets preserve exact thirds and split each win bonus between draw and loss.
// At +20: 6,375 wins / 1,800 draws / 825 losses out of 9,000.
export const rpsOutcomeTickets = 9000;
export function rpsOutcomeWeights(level = 0) {
  const hand = rpsHandLevel(level);
  const bonus = rpsHandWinBonusTiers.reduce(
    (total, tier) => total + Math.max(0, Math.min(hand, tier.to) - tier.from + 1) * tier.percent,
    0,
  );
  // Each +1%p contributes 90 win tickets: 32 from draws and 58 from losses.
  return { win: 3000 + bonus * 90, draw: 3000 - bonus * 32, lose: 3000 - bonus * 58 };
}
// Integer weights out of 1,000 keep the displayed probabilities exact.
export const rpsRewards = [200, 300, 180, 110, 80, 50, 35, 20, 15, 10].map((weight, index) => ({
  multiplier: index + 1,
  weight,
  percent: weight / 10,
}));
export function rpsOutcome(choice, opponent) {
  if (choice === opponent) return 'draw';
  return { scissors: 'paper', rock: 'scissors', paper: 'rock' }[choice] === opponent
    ? 'win'
    : 'lose';
}
export function rpsOpponent(choice, ticket, level = 0) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= rpsOutcomeTickets)
    throw Error('Invalid outcome ticket');
  for (const [outcome, weight] of Object.entries(rpsOutcomeWeights(level))) {
    if (ticket < weight)
      return rpsChoices.find((opponent) => rpsOutcome(choice, opponent.id) === outcome).id;
    ticket -= weight;
  }
}
export function rpsMultiplier(ticket) {
  for (const reward of rpsRewards) {
    if (ticket < reward.weight) return reward.multiplier;
    ticket -= reward.weight;
  }
  throw Error('Invalid reward ticket');
}
