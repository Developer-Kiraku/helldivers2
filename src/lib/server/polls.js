import { randomUUID } from 'node:crypto';
import { fail } from './auth';

export function createPoll(input) {
  if (input == null) return null;
  const question = typeof input.question === 'string' ? input.question.trim() : '';
  const options = Array.isArray(input.options) ? input.options.map(value => typeof value === 'string' ? value.trim() : '') : [];
  if (!question || question.length > 100) fail(400, '투표 제목은 1~100자로 입력해주세요.');
  if (options.length < 2 || options.length > 20 || options.some(value => !value || value.length > 100) || new Set(options).size !== options.length) fail(400, '서로 다른 투표 항목을 2~20개 입력해주세요. 항목은 100자 이하입니다.');
  const endsAt = input.endsAt ? new Date(input.endsAt) : null;
  if (endsAt && (!Number.isFinite(endsAt.getTime()) || endsAt.getTime() <= Date.now())) fail(400, '투표 마감은 현재보다 이후로 지정해주세요.');
  return { question, options: options.map(text => ({ id: randomUUID(), text })), multiple: input.multiple === true, anonymous: input.anonymous === true, endsAt: endsAt?.toISOString() || null, closedAt: null, ballots: [] };
}

export function pollClosed(poll) { return Boolean(poll.closedAt || poll.endsAt && Date.parse(poll.endsAt) <= Date.now()); }

export function serializePoll(db, poll, viewer) {
  if (!poll) return null;
  return {
    question: poll.question, multiple: poll.multiple, anonymous: poll.anonymous, endsAt: poll.endsAt,
    closed: pollClosed(poll), totalVoters: poll.ballots.length,
    myChoices: poll.ballots.find(ballot => ballot.userId === viewer.id)?.choices || [],
    options: poll.options.map(option => {
      const ballots = poll.ballots.filter(ballot => ballot.choices.includes(option.id));
      return { ...option, count: ballots.length, ...(!poll.anonymous ? { voters: ballots.map(ballot => {
        const user = db.users.find(user => user.id === ballot.userId);
        return user?.status === 'active' ? user.nickname : '탈퇴한 회원';
      }) } : {}) };
    }),
  };
}

export function castBallot(poll, actor, choices) {
  if (pollClosed(poll)) fail(409, '이미 마감된 투표입니다.');
  if (!Array.isArray(choices) || choices.length > poll.options.length || new Set(choices).size !== choices.length || choices.some(id => !poll.options.some(option => option.id === id)) || !poll.multiple && choices.length > 1) fail(400, '투표 항목을 확인해주세요.');
  poll.ballots = poll.ballots.filter(ballot => ballot.userId !== actor.id);
  if (choices.length) poll.ballots.push({ userId: actor.id, choices, updatedAt: new Date().toISOString() });
}
