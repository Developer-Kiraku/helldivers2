import { fail } from './auth';
import { puzzleMonth } from '../sliding-puzzle.mjs';
import { puzzleRanking, serializePuzzleRank } from './sliding-puzzle';
import { isRankingExcluded, separateRankingUsers } from './ranking-policy.mjs';
import { stratagemRanking } from './stratagem-rankings.mjs';
import { rpsHandLevel } from '../rps-enhancement.mjs';

export function dashboardRanking(db, actor, kind, query) {
  if (!['points', 'puzzle', 'hand', 'stratagem'].includes(kind))
    fail(404, '랭킹을 찾을 수 없습니다.');
  const page = Number(query.get('page') || 1);
  if (!Number.isSafeInteger(page) || page < 1 || !Number.isSafeInteger(page * 5))
    fail(400, '랭킹 페이지를 확인해주세요.');
  const limit = page * 5;
  if (kind === 'stratagem') {
    const { rankings, unranked, total } = stratagemRanking(db, actor, limit);
    return { month: null, total, hasMore: total > limit, rankings, unranked };
  }
  const month = kind === 'puzzle' ? puzzleMonth() : null;
  const points = (user) => user.points?.current || 0;
  const hand = kind === 'hand';
  const level = (user) => rpsHandLevel(user.rpsHand?.level);
  const value = hand ? level : points;
  const rows =
    kind !== 'puzzle'
      ? db.users
          .filter(
            (user) =>
              user.status === 'active' &&
              !isRankingExcluded(db, user.id) &&
              (!hand || level(user) > 0),
          )
          .sort(
            (a, b) =>
              value(b) - value(a) ||
              a.nickname.localeCompare(b.nickname, 'ko') ||
              a.id.localeCompare(b.id),
          )
      : puzzleRanking(db, month);
  const serialize = (row, index) =>
    kind === 'puzzle'
      ? serializePuzzleRank(db, actor, row, index)
      : {
          id: row.id,
          rank: index < 0 ? null : index + 1,
          nickname: row.nickname,
          photo: row.photo || '',
          role: row.role,
          own: row.id === actor.id,
          ...(hand ? { level: level(row) } : { points: points(row) }),
        };
  const separate = separateRankingUsers(db);
  const unranked =
    kind !== 'puzzle'
      ? separate.filter((user) => !hand || level(user) > 0)
      : (db.puzzleRecords || []).filter(
          (row) => row.month === month && separate.some((user) => user.id === row.userId),
        );
  return {
    month,
    total: rows.length,
    hasMore: rows.length > limit,
    rankings: rows.slice(0, limit).map(serialize),
    unranked: unranked.map((row) => serialize(row, -1)),
  };
}
