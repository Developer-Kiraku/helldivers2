// One-time reset requested after the puzzle timing and monthly rollover fixes.
const resetId = '2026-11-25';

export function resetPuzzleRankings(db, now = Date.now()) {
  if (db.puzzleRankingReset?.id === resetId) return false;
  db.puzzleRankingReset = {
    id: resetId,
    createdAt: new Date(now).toISOString(),
    records: db.puzzleRecords?.length || 0,
    runs: db.puzzleRuns?.length || 0,
  };
  db.puzzleRecords = [];
  db.puzzleRuns = [];
  db.notifications = (db.notifications || []).filter(
    (row) => !['puzzle_rank_enter', 'puzzle_rank_drop'].includes(row.kind),
  );
  return true;
}
