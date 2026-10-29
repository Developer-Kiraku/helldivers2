export const muteDurations = { day: '1일', week: '7일', month: '1달' };

export function isMuted(user, now = Date.now()) {
  return Boolean(user?.mutedUntil && Date.parse(user.mutedUntil) > now);
}

export function muteExpiry(duration, now = Date.now()) {
  if (typeof duration !== 'string' || !Object.hasOwn(muteDurations, duration))
    throw new Error('벙어리 기간을 확인해주세요.');
  if (duration !== 'month')
    return new Date(now + (duration === 'day' ? 1 : 7) * 86400000).toISOString();
  // A calendar month in Korea; clamp month-end dates to the next month's last day.
  const date = new Date(now + 9 * 3600000);
  const day = date.getUTCDate();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() + 1);
  const lastDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + 1, 0)).getUTCDate();
  date.setUTCDate(Math.min(day, lastDay));
  return new Date(date.getTime() - 9 * 3600000).toISOString();
}

export function muteNotice(user) {
  const until = new Date(user.mutedUntil).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
  return `벙어리 적용 중입니다. ${until}까지 게시글 작성·수정이 제한되고, 댓글은 같은 글자 수의 무작위 내용으로 등록됩니다.`;
}
