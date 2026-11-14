import { rpsHandLevel } from './rps-enhancement.mjs';
export const rpsStakes = [50, 100, 500, 1000];
export const rpsDefaultStake = 100;
export const rpsDailyAttempts = 5;
export const rpsChoices = [
  { id: 'scissors', label: '가위' },
  { id: 'rock', label: '바위' },
  { id: 'paper', label: '보' },
];
// 600 tickets represent exact thirds and the 0.5 / 1 / 1.5 percentage-point bonuses.
export const rpsOutcomeTickets = 600;
export function rpsOutcomeWeights(level = 0) {
  const hand = rpsHandLevel(level);
  const bonus =
    Math.min(hand, 5) * 3 + Math.min(Math.max(hand - 5, 0), 5) * 6 + Math.max(hand - 10, 0) * 9;
  return { win: 200 + bonus, draw: 200, lose: 200 - bonus };
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
