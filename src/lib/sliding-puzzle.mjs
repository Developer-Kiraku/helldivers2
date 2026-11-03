export const solvedPuzzle = () => [...Array.from({ length: 15 }, (_, i) => i + 1), 0];
export const puzzleSolved = (board) => board.every((tile, i) => tile === (i + 1) % 16);
export function movePuzzle(board, tile) {
  const from = board.indexOf(tile),
    blank = board.indexOf(0);
  if (
    !tile ||
    from < 0 ||
    Math.abs(Math.floor(from / 4) - Math.floor(blank / 4)) + Math.abs((from % 4) - (blank % 4)) !==
      1
  )
    return null;
  const next = [...board];
  [next[from], next[blank]] = [next[blank], next[from]];
  return next;
}
export function slidePuzzle(board, tile) {
  const target = board.indexOf(tile),
    blank = board.indexOf(0);
  if (!tile || target < 0) return null;
  const sameRow = Math.floor(target / 4) === Math.floor(blank / 4);
  const sameColumn = target % 4 === blank % 4;
  if (!sameRow && !sameColumn) return null;
  const step = sameRow ? Math.sign(target - blank) : 4 * Math.sign(target - blank);
  const moves = [];
  let next = board;
  for (let index = blank + step; ; index += step) {
    const value = board[index];
    moves.push(value);
    next = movePuzzle(next, value);
    if (index === target) break;
  }
  return { board: next, moves };
}
export function shufflePuzzle(random = Math.random) {
  const board = solvedPuzzle();
  for (let i = 15; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [board[i], board[j]] = [board[j], board[i]];
  }
  let inversions = 0;
  for (let i = 0; i < 16; i++)
    for (let j = i + 1; j < 16; j++) if (board[i] && board[j] && board[i] > board[j]) inversions++;
  if ((inversions + 4 - Math.floor(board.indexOf(0) / 4)) % 2 !== 1) {
    const a = board.indexOf(1),
      b = board.indexOf(2);
    [board[a], board[b]] = [board[b], board[a]];
  }
  if (puzzleSolved(board)) return movePuzzle(board, 15);
  return board;
}
export const puzzleMonth = (time = Date.now()) =>
  new Date(Number(time) + 9 * 3600000).toISOString().slice(0, 7);
export const comparePuzzleRecords = (a, b) =>
  a.elapsedMs - b.elapsedMs ||
  a.moves - b.moves ||
  a.finishedAt.localeCompare(b.finishedAt) ||
  a.id.localeCompare(b.id);
export function puzzleTime(ms) {
  const value = Math.max(0, ms);
  return (
    Math.floor(value / 60000)
      .toString()
      .padStart(2, '0') +
    ':' +
    Math.floor((value / 1000) % 60)
      .toString()
      .padStart(2, '0') +
    '.' +
    Math.floor(value % 1000)
      .toString()
      .padStart(3, '0')
  );
}
