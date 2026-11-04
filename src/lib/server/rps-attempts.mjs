import { pointDay } from './points.mjs';
import { rpsDailyAttempts } from '../rps-rules.mjs';

export function rpsAttempts(user, now = Date.now()) {
  const day = pointDay(now);
  const daily = Math.max(
    0,
    rpsDailyAttempts - (user.rps?.day === day ? user.rps.dailyUsed || 0 : 0),
  );
  const bonus = user.rps?.bonus || 0;
  return {
    day,
    daily,
    bonus,
    total: daily + bonus,
    resetsAt: Date.parse(day + 'T00:00:00+09:00') + 86400000,
  };
}
export function consumeRpsAttempt(user, now) {
  const attempts = rpsAttempts(user, now);
  if (!attempts.total) throw Error('No RPS attempts remaining');
  user.rps = {
    day: attempts.day,
    dailyUsed: rpsDailyAttempts - attempts.daily + (attempts.daily > 0 ? 1 : 0),
    bonus: attempts.bonus - (attempts.daily > 0 ? 0 : 1),
  };
  return attempts.daily > 0 ? 'daily' : 'bonus';
}
export function awardRpsPostAttempt(db, postId) {
  const post = db.posts?.find((item) => item.id === postId);
  if (!post || post.deletedAt || post.status === 'draft' || post.rpsAttemptGrantedAt) return;
  const user = db.users.find((item) => item.id === post.authorId && item.status === 'active');
  if (!user) return;
  post.rpsAttemptGrantedAt = new Date().toISOString();
  user.rps = { ...user.rps, bonus: (user.rps?.bonus || 0) + 1 };
}
