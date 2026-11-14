export const rpsStakes = [50, 100, 500, 1000];
export const rpsDefaultStake = 100;
export const rpsDailyAttempts = 5;
export const rpsChoices = [
  { id: 'scissors', label: '가위' },
  { id: 'rock', label: '바위' },
  { id: 'paper', label: '보' },
];
// 11/30 is a relative 10% increase from 1/3; draws stay at 1/3.
export const rpsOutcomeWeights = { win: 11, draw: 10, lose: 9 };
export const rpsOutcomeTickets = Object.values(rpsOutcomeWeights).reduce(
  (total, weight) => total + weight,
  0,
);
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
export function rpsOpponent(choice, ticket) {
  if (!Number.isInteger(ticket) || ticket < 0 || ticket >= rpsOutcomeTickets)
    throw Error('Invalid outcome ticket');
  for (const [outcome, weight] of Object.entries(rpsOutcomeWeights)) {
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
