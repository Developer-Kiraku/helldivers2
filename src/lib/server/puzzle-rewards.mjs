import { randomUUID } from 'node:crypto';
import { puzzleMonth, comparePuzzleRecords, puzzleMonthlyPrizes } from '../sliding-puzzle.mjs';
import { awardPuzzlePrize } from './points.mjs';

// Launch month's records qualify. Older records predate this reward policy.
export const puzzleRewardStartMonth = '2026-11';
export function puzzleRewardDueAt(month) {
  const [year, number] = month.split('-').map(Number);
  // Completion may be submitted for one hour. Preserve that window before freezing ranks.
  return Date.UTC(year, number, 1) - 9 * 3600000 + 3600000;
}
export function settlePuzzleRewards(db, now = Date.now()) {
  const months = [...new Set((db.puzzleRecords || []).map((record) => record.month))]
    .filter((month) => /^\d{4}-(0[1-9]|1[0-2])$/.test(month))
    .filter((month) => month >= puzzleRewardStartMonth && month < puzzleMonth(now))
    .sort();
  let changed = false;
  for (const month of months) {
    if (now < puzzleRewardDueAt(month) || db.puzzleRewards?.some((row) => row.id === month))
      continue;
    const seen = new Set();
    const winners = (db.puzzleRecords || [])
      .filter((record) => record.month === month)
      .sort(comparePuzzleRecords)
      .filter((record) => {
        if (seen.has(record.userId)) return false;
        seen.add(record.userId);
        return true;
      })
      .slice(0, 3);
    const createdAt = new Date(now).toISOString();
    const recipients = winners.map((record, index) => {
      const rank = index + 1;
      const amount = puzzleMonthlyPrizes[index];
      const user = db.users.find((item) => item.id === record.userId);
      const paid = user?.status === 'active';
      if (paid) {
        awardPuzzlePrize(db, user.id, month, rank, amount);
        db.notifications ||= [];
        db.notifications.push({
          id: randomUUID(),
          recipientId: user.id,
          family: 'puzzle',
          kind: 'puzzle_monthly_reward',
          month,
          rank,
          amount,
          createdAt,
          readAt: null,
        });
        db.audit ||= [];
        db.audit.push({
          id: randomUUID(),
          actorId: null,
          action: 'points.grant',
          targetId: month,
          details: {
            actorNickname: '시스템',
            targetTitle: `${user.nickname} · ${month} 퍼즐 ${rank}위`,
            amount,
            reason: '슬라이딩 퍼즐 월간 랭킹 보상',
          },
          createdAt,
        });
      }
      return {
        userId: record.userId,
        nickname: user?.nickname || '탈퇴한 회원',
        recordId: record.id,
        rank,
        amount,
        status: paid ? 'paid' : 'withdrawn',
      };
    });
    db.puzzleRewards ||= [];
    db.puzzleRewards.push({ id: month, createdAt, recipients });
    changed = true;
  }
  return changed;
}
