export const rpsStakes = [50, 100, 500, 1000];
export const rpsDefaultStake = 100;
export const rpsDailyAttempts = 5;
export const rpsChoices = [
  { id: 'scissors', label: '가위' },
  { id: 'rock', label: '바위' },
  { id: 'paper', label: '보' },
];
// Integer weights out of 1,000 keep the displayed probabilities exact.
export const rpsRewards = [300, 220, 160, 110, 80, 50, 30, 25, 15, 10].map((weight, index) => ({
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
export function rpsMultiplier(ticket) {
  for (const reward of rpsRewards) {
    if (ticket < reward.weight) return reward.multiplier;
    ticket -= reward.weight;
  }
  throw Error('Invalid reward ticket');
}
