import { randomUUID, randomInt } from 'node:crypto';
import { fail } from './auth';
import {
  shufflePuzzle,
  movePuzzle,
  slidePuzzle,
  puzzleSolved,
  puzzleMonth,
  comparePuzzleRecords,
} from '../sliding-puzzle.mjs';

const ranking = (db, month) =>
  (db.puzzleRecords || []).filter((r) => r.month === month).sort(comparePuzzleRecords);
function notifyRank(db, userId, kind, month, rank, previousRank, runId) {
  if (!db.users.some((u) => u.id === userId && u.status === 'active')) return;
  db.notifications ||= [];
  db.notifications.push({
    id: randomUUID(),
    recipientId: userId,
    family: 'puzzle',
    kind,
    month,
    rank,
    previousRank,
    runId,
    createdAt: new Date().toISOString(),
    readAt: null,
  });
}
export function handlePuzzle(db, actor, segments, method, input, query) {
  const now = Date.now();
  if (segments.length === 2 && method === 'GET') {
    const month = query.get('month') || puzzleMonth(now);
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)) fail(400, '월을 확인해주세요.');
    const rows = ranking(db, month);
    const serialize = (row, index) => ({
      rank: index + 1,
      elapsedMs: row.elapsedMs,
      moves: row.moves,
      finishedAt: row.finishedAt,
      own: row.userId === actor.id,
      nickname:
        db.users.find((u) => u.id === row.userId)?.status === 'active'
          ? db.users.find((u) => u.id === row.userId).nickname
          : '탈퇴한 회원',
    });
    const own = rows.findIndex((r) => r.userId === actor.id);
    return {
      month,
      currentMonth: puzzleMonth(now),
      months: [...new Set([puzzleMonth(now), ...(db.puzzleRecords || []).map((r) => r.month)])]
        .sort()
        .reverse(),
      total: rows.length,
      rankings: rows.slice(0, 50).map(serialize),
      mine: own < 0 ? null : serialize(rows[own], own),
    };
  }
  if (segments[2] === 'start' && segments.length === 3 && method === 'POST') {
    db.puzzleRuns ||= [];
    if (
      db.puzzleRuns.some(
        (r) => r.userId === actor.id && now - Date.parse(r.issuedAt || r.startedAt) < 2000,
      )
    )
      fail(429, '잠시 후 다시 시작해주세요.');
    db.puzzleRuns = db.puzzleRuns.filter(
      (r) =>
        now - Date.parse(r.issuedAt || r.startedAt) < 86400000 &&
        (r.userId !== actor.id || r.result),
    );
    const run = {
      id: randomUUID(),
      userId: actor.id,
      board: shufflePuzzle(() => randomInt(0, 0x1000000) / 0x1000000),
      issuedAt: new Date(now).toISOString(),
      startedAt: null,
    };
    db.puzzleRuns.push(run);
    return { run: { id: run.id, board: run.board, startedAt: run.startedAt }, serverTime: now };
  }
  if (segments[2] === 'begin' && segments.length === 3 && method === 'POST') {
    const run = (db.puzzleRuns || []).find((r) => r.id === input.runId && r.userId === actor.id);
    if (!run) fail(404, '진행 중인 게임을 찾을 수 없습니다.');
    if (now - Date.parse(run.issuedAt || run.startedAt) > 3600000)
      fail(400, '대기 시간이 만료됐습니다. 다시 시작해주세요.');
    if (!Number.isInteger(input.tile) || !slidePuzzle(run.board, input.tile))
      fail(400, '빈칸과 같은 줄의 숫자를 선택해주세요.');
    if (run.firstTile != null && run.firstTile !== input.tile)
      fail(409, '이미 첫 이동이 기록된 게임입니다.');
    if (!run.startedAt) {
      run.startedAt = new Date(now).toISOString();
      run.firstTile = input.tile;
      run.firstMoves = slidePuzzle(run.board, input.tile).moves;
    }
    return { startedAt: run.startedAt, serverTime: now };
  }
  if (segments[2] === 'finish' && segments.length === 3 && method === 'POST') {
    const run = (db.puzzleRuns || []).find((r) => r.id === input.runId && r.userId === actor.id);
    if (!run) fail(404, '진행 중인 게임을 찾을 수 없습니다. 다시 시작해주세요.');
    if (run.result) return run.result;
    if (!run.startedAt) fail(400, '숫자를 처음 움직인 뒤 기록을 등록해주세요.');
    if (now - Date.parse(run.startedAt) > 3600000)
      fail(400, '1시간이 지나 기록 등록이 만료됐습니다.');
    if (!Array.isArray(input.moves) || !input.moves.length || input.moves.length > 10000)
      fail(400, '이동 기록을 확인해주세요.');
    if (run.firstMoves?.some((tile, index) => input.moves[index] !== tile))
      fail(400, '첫 이동 기록이 일치하지 않습니다.');
    let board = run.board;
    for (const tile of input.moves) {
      if (!Number.isInteger(tile)) fail(400, '올바르지 않은 이동 기록입니다.');
      board = movePuzzle(board, tile);
      if (!board) fail(400, '올바르지 않은 이동 기록입니다.');
    }
    if (!puzzleSolved(board)) fail(400, '퍼즐을 완성한 후 등록해주세요.');
    const record = {
      id: run.id,
      userId: actor.id,
      month: puzzleMonth(now),
      elapsedMs: now - Date.parse(run.startedAt),
      moves: input.moves.length,
      finishedAt: new Date(now).toISOString(),
    };
    db.puzzleRecords ||= [];
    const before = ranking(db, record.month);
    const previous = before.find((r) => r.userId === actor.id);
    const improved = !previous || comparePuzzleRecords(record, previous) < 0;
    if (improved) {
      db.puzzleRecords = db.puzzleRecords.filter(
        (r) => r.month !== record.month || r.userId !== actor.id,
      );
      db.puzzleRecords.push(record);
      const after = ranking(db, record.month);
      const rank = after.findIndex((r) => r.userId === actor.id) + 1;
      const oldRank = before.findIndex((r) => r.userId === actor.id) + 1;
      if (rank <= 3)
        notifyRank(db, actor.id, 'puzzle_rank_enter', record.month, rank, oldRank || null, run.id);
      for (const [index, old] of before.slice(0, 3).entries()) {
        const newRank = after.findIndex((r) => r.userId === old.userId) + 1;
        if (newRank > index + 1)
          notifyRank(db, old.userId, 'puzzle_rank_drop', record.month, newRank, index + 1, run.id);
      }
    }
    const rank = ranking(db, record.month).findIndex((r) => r.userId === actor.id) + 1;
    run.result = { record, improved, rank };
    return run.result;
  }
  fail(404, '게임 요청을 찾을 수 없습니다.');
}
