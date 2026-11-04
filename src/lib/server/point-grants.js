import { fail } from './auth';
import { awardManualPoints } from './points.mjs';
import { createHash } from 'node:crypto';
const audienceVersion = (db) =>
  createHash('sha256')
    .update(
      JSON.stringify(
        db.users
          .filter((user) => user.status === 'active')
          .map((user) => user.id)
          .sort(),
      ),
    )
    .digest('hex');

const receipt = (row) => ({
  id: row.id,
  scope: row.scope,
  amount: row.amount,
  count: row.recipients.length,
  total: row.amount * row.recipients.length,
  recipients: row.recipients,
  actorNickname: row.actorNickname,
  reason: row.reason,
  createdAt: row.createdAt,
});
export function handlePointGrants(db, actor, method, input = {}) {
  if (actor.role !== 'operator' || actor.actualRole)
    fail(403, '총관리자만 포인트를 지급할 수 있습니다.');
  if (method === 'GET')
    return {
      audienceVersion: audienceVersion(db),
      users: db.users
        .filter((user) => user.status === 'active')
        .map((user) => ({
          id: user.id,
          nickname: user.nickname,
          current: user.points?.current || 0,
        }))
        .sort((a, b) => a.nickname.localeCompare(b.nickname, 'ko')),
      history: (db.pointGrants || []).slice(-10).reverse().map(receipt),
    };
  if (method !== 'POST') fail(404, '지급 요청을 찾을 수 없습니다.');
  if (
    !['all', 'selected'].includes(input.scope) ||
    !Number.isInteger(input.amount) ||
    input.amount < 1 ||
    input.amount > 1000000
  )
    fail(400, '지급 대상과 1~1,000,000 사이의 정수 금액을 입력해주세요.');
  if (
    typeof input.requestId !== 'string' ||
    !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input.requestId)
  )
    fail(400, '지급 요청 정보를 확인해주세요.');
  if (
    !Array.isArray(input.userIds) ||
    input.userIds.length > 1000 ||
    input.userIds.some((id) => typeof id !== 'string' || id.length > 100)
  )
    fail(400, '지급할 회원을 선택해주세요.');
  const ids = [...new Set(input.userIds)].sort();
  if ((input.scope === 'selected' && !ids.length) || (input.scope === 'all' && ids.length))
    fail(400, '지급 대상을 확인해주세요.');
  if (typeof input.reason !== 'string' || input.reason.trim().length > 200)
    fail(400, '지급 사유는 200자 이하로 입력해주세요.');
  const reason = input.reason.trim();
  const intent = JSON.stringify([
    input.scope,
    input.amount,
    ids,
    reason,
    input.expectedCount,
    input.scope === 'all' ? input.audienceVersion : null,
  ]);
  db.pointGrants ||= [];
  const previous = db.pointGrants.find((row) => row.id === input.requestId);
  if (previous) {
    if (previous.actorId !== actor.id || previous.intent !== intent)
      fail(409, '이미 사용한 지급 요청입니다. 대상을 다시 확인해주세요.');
    return { grant: receipt(previous), created: false };
  }
  const users = db.users.filter(
    (user) => user.status === 'active' && (input.scope === 'all' || ids.includes(user.id)),
  );
  if (
    !users.length ||
    (input.scope === 'selected' && users.length !== ids.length) ||
    (input.scope === 'all' &&
      (users.length !== input.expectedCount || input.audienceVersion !== audienceVersion(db)))
  )
    fail(409, '회원 목록이 변경됐습니다. 지급 대상을 다시 확인해주세요.');
  if (
    users.some(
      (user) =>
        !Number.isSafeInteger((user.points?.current || 0) + input.amount) ||
        !Number.isSafeInteger((user.points?.total || 0) + input.amount),
    )
  )
    fail(400, '지급 후 포인트 범위를 확인해주세요.');
  const row = {
    id: input.requestId,
    actorId: actor.id,
    actorNickname: actor.nickname,
    scope: input.scope,
    amount: input.amount,
    reason,
    intent,
    recipients: users.map((user) => ({ id: user.id, nickname: user.nickname })),
    createdAt: new Date().toISOString(),
  };
  awardManualPoints(
    db,
    users.map((user) => user.id),
    row.id,
    row.amount,
    actor.id,
    reason,
  );
  db.pointGrants.push(row);
  return { grant: receipt(row), created: true };
}
