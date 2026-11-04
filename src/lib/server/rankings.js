import { fail } from './auth';
import { puzzleMonth } from '../sliding-puzzle.mjs';
import { puzzleRanking, serializePuzzleRank } from './sliding-puzzle';

export function dashboardRanking(db, actor, kind, query) {
  if (!['points', 'puzzle'].includes(kind)) fail(404, '랭킹을 찾을 수 없습니다.');
  const page = Number(query.get('page') || 1);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(page * 5))
    fail(400, '랭킹 페이지를 확인해주세요.');
  const month = kind === 'puzzle' ? puzzleMonth() : null;
  const points = (user) => user.points?.current || 0;
  const rows =
    kind === 'points'
      ? db.users
          .filter((user) => user.status === 'active' && !user.isTestPlayer)
          .sort(
            (a, b) =>
              points(b) - points(a) ||
              a.nickname.localeCompare(b.nickname, 'ko') ||
              a.id.localeCompare(b.id),
          )
      : puzzleRanking(db, month);
  const limit = page * 5;
  return {
    month,
    total: rows.length,
    hasMore: rows.length > limit,
    rankings: rows.slice(0, limit).map((row, index) =>
      kind === 'puzzle'
        ? serializePuzzleRank(db, actor, row, index)
        : {
            id: row.id,
            rank: index + 1,
            nickname: row.nickname,
            photo: row.photo || '',
            role: row.role,
            own: row.id === actor.id,
            points: points(row),
          },
    ),
  };
}
