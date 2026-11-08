import { randomBytes } from 'node:crypto';
import { fail } from './auth';
import { puzzleTime } from '../sliding-puzzle.mjs';
import { challengeEntry } from '../stratagem-challenge.mjs';
import { gameResultLabels, gameSharePath, validGameShareCode } from '../game-results.mjs';

const number = (value) => value.toLocaleString('ko-KR');
const points = (value) => `${number(value)} P`;
const profit = (value) => `${value > 0 ? '+' : ''}${points(value)}`;
const choices = { rock: '바위', paper: '보', scissors: '가위' };
const outcomes = { win: '승리!', lose: '다음 승리를 향해', draw: '무승부' };
const stat = (label, value) => ({ label, value });
function snapshot(db, actor, game, resultId) {
  const common = { game, gameLabel: gameResultLabels[game], nickname: actor.nickname };
  if (game === 'sliding-puzzle') {
    const run = (db.puzzleRuns || []).find((row) => row.id === resultId && row.userId === actor.id);
    const record =
      run?.result?.record ||
      (db.puzzleRecords || []).find((row) => row.id === resultId && row.userId === actor.id);
    if (!record) fail(404, '완료한 퍼즐 기록을 찾을 수 없습니다.');
    return {
      ...common,
      completedAt: record.finishedAt,
      tone: 'win',
      headline: '퍼즐 클리어!',
      summary: `${puzzleTime(record.elapsedMs)} · ${record.moves}회 이동`,
      stats: [
        stat('클리어 시간', puzzleTime(record.elapsedMs)),
        stat('이동 횟수', `${record.moves}회`),
      ],
      emblem: '01 — 15',
    };
  }
  if (game === 'rps') {
    const round = (db.rpsRounds || []).find(
      (row) => row.requestId === resultId && row.userId === actor.id,
    );
    if (!round) fail(404, '완료한 가위바위보 기록을 찾을 수 없습니다.');
    return {
      ...common,
      completedAt: new Date(round.createdAt).toISOString(),
      tone: round.outcome,
      headline: round.outcome === 'win' ? `${round.multiplier}배 승리!` : outcomes[round.outcome],
      summary: `${choices[round.choice]} vs ${choices[round.opponent]} · ${profit(round.profit)}`,
      stats: [
        stat('배팅액', points(round.stake)),
        stat('지급 포인트', points(round.payout)),
        stat('손익', profit(round.profit)),
      ],
      emblem: round.outcome === 'win' ? `×${round.multiplier}` : choices[round.choice],
    };
  }
  if (game === 'dice') {
    const round = (db.diceGames || []).find(
      (row) => row.id === resultId && row.players.includes(actor.id) && row.status === 'finished',
    );
    if (!round) fail(404, '완료한 주사위 기록을 찾을 수 없습니다.');
    const other = round.players.find((id) => id !== actor.id);
    const sum = (id) => round.dice[id].reduce((total, value) => total + value, 0);
    const pot = round.players.reduce((total, id) => total + round.bets[id], 0);
    const payout = !round.winnerId ? round.bets[actor.id] : round.winnerId === actor.id ? pot : 0;
    const outcome = !round.winnerId ? 'draw' : round.winnerId === actor.id ? 'win' : 'lose';
    return {
      ...common,
      completedAt: new Date(round.finishedAt).toISOString(),
      tone: outcome,
      headline: outcomes[outcome],
      summary: `${round.matchNumber || 1}번째 승부 · ${round.reason === 'showdown' ? '주사위 합산' : 'DIE 종료'} · ${profit(payout - round.bets[actor.id])}`,
      stats: [
        stat('나 / 상대 합계', `${sum(actor.id)} / ${sum(other)}`),
        stat('내 배팅액', points(round.bets[actor.id])),
        stat('손익', profit(payout - round.bets[actor.id])),
      ],
      emblem: round.dice[actor.id].join(' · '),
    };
  }
  const run = (db.stratagemRuns || []).find(
    (row) =>
      row.id === resultId &&
      row.userId === actor.id &&
      ['cashed', 'completed', 'failed', 'abandoned'].includes(row.status),
  );
  if (!run?.finishedAt) fail(404, '종료된 스트라타젬 히어로 기록을 찾을 수 없습니다.');
  const cleared =
    run.clearedStage ??
    (['cashed', 'completed'].includes(run.status) ? run.stage : Math.max(0, run.stage - 1));
  return {
    ...common,
    completedAt: new Date(run.finishedAt).toISOString(),
    tone: run.payout ? 'win' : 'lose',
    headline: cleared ? `${cleared}단계 클리어` : '다음 도전을 향해',
    summary: `${run.status === 'completed' ? '전체 단계 완주' : run.status === 'cashed' ? '보상 확보' : '도전 종료'} · ${profit((run.payout || 0) - challengeEntry)}`,
    stats: [
      stat('클리어 단계', `${cleared}단계`),
      stat('누적 클리어 시간', run.timingVersion === 1 ? puzzleTime(run.elapsedMs) : '기록 없음'),
      stat('지급 포인트', points(run.payout || 0)),
    ],
    emblem: `STAGE ${String(cleared).padStart(2, '0')}`,
  };
}
export function createGameShare(db, actor, input) {
  if (actor.actualRole) fail(403, '실제 등급으로 돌아온 뒤 공유해주세요.');
  const { game, resultId } = input;
  if (
    !Object.hasOwn(gameResultLabels, game) ||
    typeof resultId !== 'string' ||
    !/^[a-f0-9-]{36}$/.test(resultId)
  )
    fail(400, '공유할 게임 결과를 확인해주세요.');
  db.gameShares ||= [];
  let share = db.gameShares.find(
    (row) => row.ownerId === actor.id && row.game === game && row.resultId === resultId,
  );
  if (!share) {
    const result = snapshot(db, actor, game, resultId);
    let id;
    do {
      id = randomBytes(18).toString('base64url');
    } while (db.gameShares.some((row) => row.id === id));
    share = { id, ownerId: actor.id, game, resultId, result, createdAt: new Date().toISOString() };
    db.gameShares.push(share);
  }
  return { share: { path: gameSharePath(share.id), result: share.result } };
}
export function findPublicGameShare(db, code) {
  if (!validGameShareCode(code)) return null;
  const share = (db.gameShares || []).find((row) => row.id === code);
  if (!share || !db.users.some((user) => user.id === share.ownerId && user.status === 'active'))
    return null;
  return { path: gameSharePath(share.id), result: share.result };
}
