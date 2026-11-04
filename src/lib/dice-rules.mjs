export const diceInviteMs = 60000;
export const dicePollDelay = ({ onGame, visible, activeGame }) =>
  !visible ? 15000 : onGame || activeGame ? 1000 : 5000;
