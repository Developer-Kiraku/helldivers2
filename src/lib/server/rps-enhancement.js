import { randomInt } from 'node:crypto';
import { fail } from './auth';
import { transferGamePoints } from './points.mjs';
import { rpsHandState, rpsHandStages, rpsMaxHandLevel } from '../rps-enhancement.mjs';

const validId = (value) =>
  typeof value === 'string' &&
  /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(value);
const publicResult = (receipt) =>
  receipt &&
  Object.fromEntries(
    ['requestId', 'from', 'to', 'success', 'cost', 'successPercent', 'createdAt'].map((key) => [
      key,
      receipt[key],
    ]),
  );
export function handleRpsEnhancement(
  db,
  actor,
  method,
  input = {},
  query = new URLSearchParams(),
  options = {},
) {
  const now = options.now ?? Date.now();
  const receipts = (db.rpsEnhancements || []).filter((row) => row.userId === actor.id);
  const snapshot = (receipt = null) => ({
    points: { ...actor.points },
    hand: rpsHandState(actor),
    result: publicResult(receipt),
  });
  if (method === 'GET') {
    const id = query.get('requestId');
    if (id !== null && !validId(id)) fail(400, '강화 요청을 확인해주세요.');
    return snapshot(id ? receipts.find((row) => row.requestId === id) : null);
  }
  if (method !== 'POST') fail(404, '강화 요청을 찾을 수 없습니다.');
  if (actor.actualRole) fail(403, '실제 등급으로 돌아온 뒤 강화해주세요.');
  if (
    !validId(input.requestId) ||
    !Number.isInteger(input.expectedVersion) ||
    input.expectedVersion < 0
  )
    fail(400, '강화 요청을 확인해주세요.');
  const previous = receipts.find((row) => row.requestId === input.requestId);
  if (previous) {
    if (previous.version !== input.expectedVersion) fail(409, '이미 처리한 강화 요청입니다.');
    return snapshot(previous);
  }
  const hand = rpsHandState(actor);
  if (hand.version !== input.expectedVersion)
    fail(409, '손 강화 상태가 변경되었습니다. 확인 후 다시 강화해주세요.');
  if (hand.level >= rpsMaxHandLevel) fail(409, '이미 최고 강화 단계입니다.');
  if (receipts.length && now < receipts.at(-1).createdAt + 1200)
    fail(429, '강화 결과를 확인한 뒤 다시 시도해주세요.');
  const target = rpsHandStages[hand.level + 1];
  if ((actor.points?.current || 0) < target.cost) fail(400, '강화할 포인트가 부족합니다.');
  const success = (options.randomInt || randomInt)(100) < target.successPercent;
  const receipt = {
    id: actor.id + ':' + input.requestId,
    userId: actor.id,
    requestId: input.requestId,
    version: hand.version,
    from: hand.level,
    to: success ? target.level : Math.max(0, hand.level - target.failureDrop),
    success,
    cost: target.cost,
    successPercent: target.successPercent,
    createdAt: now,
  };
  transferGamePoints(db, actor.id, `rps-enhance:${receipt.id}`, -target.cost, receipt.id);
  actor.rpsHand = { level: receipt.to, version: hand.version + 1 };
  (db.rpsEnhancements ||= []).push(receipt);
  return snapshot(receipt);
}
