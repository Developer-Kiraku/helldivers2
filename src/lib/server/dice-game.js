import { randomInt, randomUUID } from 'node:crypto';
import { fail } from './auth';
import { transferGamePoints } from './points.mjs';
import { diceInviteMs, diceMaxMultiplier } from '../dice-rules.mjs';

export const diceStakeOptions = [10, 100, 1000];
const active = (game) =>
  ['invited', 'playing', 'revealing'].includes(game.status) ||
  (game.status === 'finished' && game.autoContinue && !game.nextGameId);
const member = (db, id) => db.users.find((user) => user.id === id);
const balance = (db, id) => member(db, id)?.points?.current || 0;
const rounds = (game) => (game.rulesVersion === 2 ? 4 : 3);
const currentBet = (game, id) => {
  const action = game.actions[game.round]?.[id];
  return action?.choice === 'call' ? game.stake * action.multiplier : 0;
};
const isLoggedIn = (db, id, now) =>
  (db.sessions || []).some(
    (session) => session.userId === id && Date.parse(session.expiresAt) > now,
  );
function beginRound(game, now) {
  game.round++;
  for (const id of game.players) game.dice[id].push(randomInt(1, 7));
  game.readyAt = now + 1800;
  game.deadlineAt = game.readyAt + 30000;
  game.revision++;
}
function stopSeries(game, reason, userId = null) {
  if (!game.autoContinue) return;
  game.autoContinue = false;
  game.stopReason = reason;
  game.stopBy = userId;
  game.revision++;
}
function continueSeries(db, game, now) {
  if (game.status !== 'finished' || !game.autoContinue || game.nextGameId) return;
  if (game.players.some((id) => member(db, id)?.status !== 'active' || !isLoggedIn(db, id, now))) {
    stopSeries(game, 'left');
    return;
  }
  if (game.players.some((id) => balance(db, id) < game.stake)) {
    stopSeries(game, 'points');
    return;
  }
  if (now < game.nextRoundAt) return;
  // Require both players to have returned to the game after settlement. A reload
  // can reconnect, while an abandoned page never starts an endless series.
  const present = game.players.every((id) =>
    (db.dicePresence || []).some(
      (row) =>
        row.userId === id &&
        row.page === 'dice' &&
        row.seenAt >= game.finishedAt &&
        now - row.seenAt < 20000,
    ),
  );
  if (!present) {
    if (now >= game.nextRoundAt + 30000) stopSeries(game, 'left');
    return;
  }
  if (
    db.diceGames.some(
      (item) =>
        item.id !== game.id && active(item) && item.players.some((id) => game.players.includes(id)),
    )
  ) {
    stopSeries(game, 'left');
    return;
  }
  game.nextGameId = createGame(
    db,
    game.players,
    game.stake,
    now,
    false,
    (game.matchNumber || 1) + 1,
  ).id;
  game.revision++;
}
function finish(db, game, winnerId, reason, now) {
  if (game.status === 'finished') return;
  // A folded turn never joins the contested pot. Return its reserved CALLs
  // before awarding only the money committed in completed earlier turns.
  if (reason !== 'showdown') {
    for (const id of game.players) {
      const refund = currentBet(game, id);
      if (!refund) continue;
      transferGamePoints(db, id, `dice:${game.id}:refund:${game.round}`, refund, game.id);
      game.bets[id] -= refund;
    }
  }
  const pot = game.players.reduce((sum, id) => sum + game.bets[id], 0);
  for (const id of game.players) {
    const amount = winnerId ? (id === winnerId ? pot : 0) : game.bets[id];
    if (amount) transferGamePoints(db, id, 'dice:' + game.id + ':settlement', amount, game.id);
  }
  Object.assign(game, {
    status: 'finished',
    winnerId,
    reason,
    finishedAt: now,
    nextRoundAt: now + 5000,
    revision: game.revision + 1,
  });
  if (reason === 'timeout' || reason === 'left') stopSeries(game, reason);
}
export function settleDiceGames(db, now = Date.now()) {
  let changed = false;
  for (const game of db.diceGames || []) {
    if (
      game.status === 'finished' &&
      game.autoContinue &&
      !game.nextGameId &&
      now >= game.nextRoundAt + 30000 &&
      !game.players.every((id) =>
        (db.dicePresence || []).some(
          (row) =>
            row.userId === id &&
            row.page === 'dice' &&
            row.seenAt >= game.finishedAt &&
            now - row.seenAt < 20000,
        ),
      )
    ) {
      stopSeries(game, 'left');
      changed = true;
    }
    if (game.status === 'invited' && now >= game.expiresAt) {
      game.status = 'expired';
      stopSeries(game, 'left');
      game.revision++;
      changed = true;
    }
    if (game.status === 'playing') {
      const unavailable = game.players.filter((id) => member(db, id)?.status !== 'active');
      if (unavailable.length || now >= game.deadlineAt) {
        const folded = unavailable.length
          ? unavailable
          : game.players.filter((id) => game.actions[game.round]?.[id]?.choice !== 'call');
        finish(
          db,
          game,
          folded.length === 1 ? game.players.find((id) => id !== folded[0]) : null,
          unavailable.length ? 'left' : 'timeout',
          now,
        );
        changed = true;
      }
    }
    if (game.status === 'revealing' && now >= game.revealAt) {
      const sums = game.players.map((id) => game.dice[id].reduce((sum, value) => sum + value, 0));
      finish(
        db,
        game,
        sums[0] === sums[1] ? null : game.players[sums[0] > sums[1] ? 0 : 1],
        'showdown',
        game.revealAt,
      );
      changed = true;
    }
  }
  return changed;
}
function publicGame(db, game, actor) {
  if (!game) return null;
  const revealed = game.status === 'finished';
  return {
    id: game.id,
    revision: game.revision,
    status: game.status,
    stake: game.stake,
    round: game.round,
    roundCount: rounds(game),
    matchNumber: game.matchNumber || 1,
    firstDiePublic: game.rulesVersion === 2,
    hostId: game.players[0],
    expiresAt: game.expiresAt,
    receivedAt: game.receivedAt || null,
    readyAt: game.readyAt || null,
    deadlineAt: game.deadlineAt || null,
    revealAt: game.revealAt || null,
    winnerId: game.winnerId || null,
    reason: game.reason || null,
    autoContinue: Boolean(game.autoContinue),
    nextRoundAt: game.autoContinue ? game.nextRoundAt || null : null,
    stopReason: game.stopReason || null,
    stopBy: game.stopBy || null,
    // Keep already-open clients from crashing while the new UI rolls out.
    rematch: [],
    rematchDeclined: true,
    nextGameId: game.nextGameId || null,
    pot: game.players.reduce(
      (sum, id) =>
        sum +
        game.bets[id] -
        (game.status === 'playing' && id !== actor.id ? currentBet(game, id) : 0),
      0,
    ),
    players: game.players.map((id) => ({
      id,
      nickname: member(db, id)?.status === 'active' ? member(db, id).nickname : '탈퇴한 회원',
      photo: member(db, id)?.photo || '',
      bet:
        game.bets[id] - (game.status === 'playing' && id !== actor.id ? currentBet(game, id) : 0),
      dice:
        revealed || id === actor.id
          ? game.dice[id]
          : game.rulesVersion === 2
            ? game.dice[id].slice(0, 1)
            : [],
      sum:
        revealed || id === actor.id ? game.dice[id].reduce((sum, value) => sum + value, 0) : null,
      decision: game.actions[game.round]?.[id]
        ? revealed || id === actor.id
          ? game.actions[game.round][id].choice
          : 'locked'
        : null,
    })),
  };
}
function snapshot(db, actor, now, page = '') {
  const own = (db.diceGames || []).filter((game) => game.players.includes(actor.id));
  const game = own.findLast(active) || own.at(-1);
  return {
    viewerId: actor.id,
    serverTime: now,
    points: member(db, actor.id).points || { total: 0, current: 0 },
    inviteAvailableAt: (member(db, actor.id).lastDiceInviteAt || 0) + 5000,
    game: publicGame(db, game, actor),
    online:
      page === 'dice'
        ? db.users
            .filter(
              (user) =>
                user.status === 'active' && user.id !== actor.id && isLoggedIn(db, user.id, now),
            )
            .map((user) => ({
              id: user.id,
              nickname: user.nickname,
              photo: user.photo || '',
              busy: (db.diceGames || []).some(
                (item) => active(item) && item.players.includes(user.id),
              ),
            }))
        : [],
  };
}
function createGame(db, players, stake, now, invited = true, matchNumber = 1) {
  const game = {
    id: randomUUID(),
    rulesVersion: 2,
    matchNumber,
    players,
    stake,
    status: invited ? 'invited' : 'playing',
    round: 0,
    revision: 1,
    createdAt: now,
    expiresAt: now + diceInviteMs,
    receivedAt: null,
    bets: Object.fromEntries(players.map((id) => [id, 0])),
    dice: Object.fromEntries(players.map((id) => [id, []])),
    actions: {},
    autoContinue: true,
  };
  db.diceGames ||= [];
  // Retain recent settlement history while bounding the hot game-state collection.
  db.diceGames = db.diceGames.filter(
    (item) => active(item) || now - (item.finishedAt || item.createdAt) < 30 * 86400000,
  );
  db.diceGames.push(game);
  if (!invited) beginRound(game, now);
  return game;
}
export function handleDiceGame(db, actor, segments, method, input) {
  const now = Date.now();
  if (actor.actualRole) fail(403, '화면 확인 모드에서는 게임을 이용할 수 없습니다.');
  const action = segments[2];
  if (segments.length !== 3 || method !== 'POST') fail(404, '게임 요청을 찾을 수 없습니다.');
  if (action === 'presence') {
    if (
      typeof input.tabId !== 'string' ||
      !/^[a-zA-Z0-9-]{16,64}$/.test(input.tabId) ||
      !['site', 'dice', 'away'].includes(input.page) ||
      typeof input.visible !== 'boolean' ||
      (input.focused !== undefined && typeof input.focused !== 'boolean')
    )
      fail(400, '접속 정보를 확인해주세요.');
    const previous = (db.dicePresence || []).find(
      (row) => row.userId === actor.id && row.tabId === input.tabId,
    );
    const own = (db.diceGames || []).findLast(
      (game) => active(game) && game.players.includes(actor.id),
    );
    if (
      input.page === 'site' &&
      previous?.page === 'dice' &&
      own &&
      (own.status !== 'invited' || own.players[0] === actor.id)
    ) {
      stopSeries(own, 'left', actor.id);
      if (own.status === 'invited') {
        own.status = 'expired';
        own.revision++;
      }
    }
    db.dicePresence = (db.dicePresence || []).filter(
      (row) => now - row.seenAt < 60000 && !(row.userId === actor.id && row.tabId === input.tabId),
    );
    db.dicePresence.push({
      id: actor.id + ':' + input.tabId,
      tabId: input.tabId,
      userId: actor.id,
      seenAt: now,
      page: input.page,
      visible: input.visible,
    });
    if (input.visible && input.focused !== false) {
      const invitation = (db.diceGames || []).findLast(
        (game) => game.status === 'invited' && game.players[1] === actor.id && !game.receivedAt,
      );
      if (invitation) {
        invitation.receivedAt = now;
        invitation.expiresAt = now + diceInviteMs;
        invitation.revision++;
      }
    }
    // Evaluate continuation only after this heartbeat, so a navigation away wins
    // over a next-round deadline arriving in the same request.
    if (own) continueSeries(db, own, now);
    return snapshot(db, actor, now, input.page);
  }
  if (action === 'invite') {
    if (
      !(db.dicePresence || []).some(
        (row) =>
          row.userId === actor.id &&
          row.tabId === input.tabId &&
          row.page === 'dice' &&
          row.visible &&
          now - row.seenAt < 8000,
      )
    )
      fail(403, '주사위 게임 페이지에서만 초대할 수 있습니다.');
    if (now < (member(db, actor.id).lastDiceInviteAt || 0) + 5000)
      fail(429, '초대 후 5초 동안은 다시 초대할 수 없습니다.');
    if (!diceStakeOptions.includes(input.stake) || input.targetId === actor.id)
      fail(400, '상대와 최소 베팅금액을 확인해주세요.');
    const target = member(db, input.targetId);
    if (!target || target.status !== 'active' || !isLoggedIn(db, target.id, now))
      fail(409, '현재 로그인 상태인 회원만 초대할 수 있습니다.');
    if (
      (db.diceGames || []).some(
        (game) => active(game) && game.players.some((id) => [actor.id, target.id].includes(id)),
      )
    )
      fail(409, '이미 초대 또는 게임이 진행 중입니다.');
    if ([actor.id, target.id].some((id) => balance(db, id) < input.stake))
      fail(400, '최소 베팅금액 이상의 포인트가 필요합니다.');
    member(db, actor.id).lastDiceInviteAt = now;
    createGame(db, [actor.id, target.id], input.stake, now);
    return snapshot(db, actor, now, 'dice');
  }
  const game = (db.diceGames || []).find(
    (item) => item.id === input.gameId && item.players.includes(actor.id),
  );
  if (!game) fail(404, '게임을 찾을 수 없습니다.');
  if (action === 'accept' || action === 'decline') {
    if (game.players[1] !== actor.id) fail(403, '초대받은 회원만 응답할 수 있습니다.');
    if (action === 'accept' && ['playing', 'revealing', 'finished'].includes(game.status))
      return snapshot(db, actor, now, 'dice');
    if (game.status !== 'invited') fail(409, '초대가 만료되었거나 이미 처리됐습니다.');
    if (action === 'decline') {
      game.status = 'declined';
      stopSeries(game, 'requested', actor.id);
      game.revision++;
    } else {
      if (
        game.players.some(
          (id) => member(db, id)?.status !== 'active' || balance(db, id) < game.stake,
        )
      )
        fail(400, '참여 가능한 회원과 포인트를 확인해주세요.');
      game.status = 'playing';
      game.autoContinue = true;
      beginRound(game, now);
    }
  } else if (action === 'decision') {
    if (
      !Number.isInteger(input.round) ||
      input.round < 1 ||
      input.round >= rounds(game) ||
      !['call', 'die'].includes(input.choice)
    )
      fail(400, 'CALL 또는 DIE를 선택해주세요.');
    const previous = game.actions[input.round]?.[actor.id];
    const multiplier = input.round === 1 ? 1 : input.multiplier;
    if (previous) {
      if (
        previous.choice !== input.choice ||
        (input.choice === 'call' && previous.multiplier !== multiplier)
      )
        fail(409, '이미 선택한 턴입니다.');
      return snapshot(db, actor, now, 'dice');
    }
    if (game.status !== 'playing' || game.round !== input.round)
      fail(409, '이미 종료되었거나 다른 턴입니다.');
    if (now < game.readyAt) fail(409, '주사위가 멈춘 뒤 선택해주세요.');
    game.actions[input.round] ||= {};
    if (input.choice === 'die') {
      game.actions[input.round][actor.id] = { choice: 'die' };
    } else {
      if (
        !Number.isInteger(multiplier) ||
        multiplier < (input.round === 1 ? 1 : 2) ||
        multiplier > diceMaxMultiplier(input.round)
      )
        fail(400, `2~${diceMaxMultiplier(input.round)}배 중 선택해주세요.`);
      const amount = game.stake * multiplier;
      if (balance(db, actor.id) < amount) fail(400, '베팅할 포인트가 부족합니다.');
      transferGamePoints(db, actor.id, 'dice:' + game.id + ':bet:' + input.round, -amount, game.id);
      game.bets[actor.id] += amount;
      game.actions[input.round][actor.id] = { choice: 'call', multiplier };
    }
    game.revision++;
    if (game.players.every((id) => game.actions[input.round][id])) {
      const callers = game.players.filter((id) => game.actions[input.round][id].choice === 'call');
      if (callers.length < 2) {
        finish(db, game, callers.length === 1 ? callers[0] : null, 'die', now);
      } else {
        beginRound(game, now);
        if (game.round === rounds(game)) {
          game.status = 'revealing';
          game.revealAt = now + 2200;
        }
      }
    }
  } else if (action === 'stop' || (action === 'rematch' && input.accept === false)) {
    let current = game;
    while (current.nextGameId) {
      const next = db.diceGames.find((item) => item.id === current.nextGameId);
      if (!next) break;
      current = next;
    }
    if (!['playing', 'revealing', 'finished'].includes(current.status))
      fail(409, '게임이 시작된 뒤 선택해주세요.');
    stopSeries(current, 'requested', actor.id);
  } else fail(404, '게임 요청을 찾을 수 없습니다.');
  return snapshot(db, actor, now, 'dice');
}
