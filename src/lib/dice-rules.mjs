export const diceInviteMs = 60000;
export const diceConsolation = { lossPercent: 90, amount: 5000 };
export const diceMaxMultiplier = (round) => (round === 1 ? 1 : round === 2 ? 5 : 10);
export const dicePollDelay = ({ onGame, visible, activeGame }) =>
  !visible ? 15000 : onGame || activeGame ? 1000 : 5000;
