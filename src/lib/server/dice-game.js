import { randomInt, randomUUID } from 'node:crypto';
import { fail } from './auth';
import { transferGamePoints } from './points.mjs';
import { diceInviteMs } from '../dice-rules.mjs';

export const diceStakeOptions = [10, 100, 1000];
const active = (game) => ['invited', 'playing', 'revealing'].includes(game.status);
const member = (db, id) => db.users.find((user) => user.id === id);
const balance = (db, id) => member(db, id)?.points?.current || 0;
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
function finish(db, game, winnerId, reason, now) {
  if (game.status === 'finished') return;
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
    rematch: [],
    revision: game.revision + 1,
  });
}
export function settleDiceGames(db, now = Date.now()) {
  let changed = false;
  for (const game of db.diceGames || []) {
    if (game.status === 'invited' && now >= game.expiresAt) {
      game.status = 'expired';
      game.revision++;
      changed = true;
    }
    if (game.status === 'playing') {
      const unavailable = game.players.filter((id) => member(db, id)?.status !== 'active');
      if (unavailable.length || now >= game.deadlineAt) {
        const folded = unavailable.length
          ? unavailable
          : game.players.filter((id) => !game.actions[game.round]?.[id]);
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
    hostId: game.players[0],
    expiresAt: game.expiresAt,
    receivedAt: game.receivedAt || null,
    readyAt: game.readyAt || null,
    deadlineAt: game.deadlineAt || null,
    revealAt: game.revealAt || null,
    winnerId: game.winnerId || null,
    reason: game.reason || null,
    rematch: game.rematch || [],
    rematchDeclined: Boolean(game.rematchDeclined),
    nextGameId: game.nextGameId || null,
    pot: game.players.reduce((sum, id) => sum + game.bets[id], 0),
    players: game.players.map((id) => ({
      id,
      nickname: member(db, id)?.status === 'active' ? member(db, id).nickname : '탈퇴한 회원',
      photo: member(db, id)?.photo || '',
      bet: game.bets[id],
      dice: revealed || id === actor.id ? game.dice[id] : [],
      sum:
        revealed || id === actor.id ? game.dice[id].reduce((sum, value) => sum + value, 0) : null,
      decision: game.actions[game.round]?.[id]?.choice || null,
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
function createGame(db, players, stake, now, invited = true) {
  const game = {
    id: randomUUID(),
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
    rematch: [],
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
      !['site', 'dice'].includes(input.page) ||
      typeof input.visible !== 'boolean' ||
      (input.focused !== undefined && typeof input.focused !== 'boolean')
    )
      fail(400, '접속 정보를 확인해주세요.');
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
      game.revision++;
    } else {
      if (
        game.players.some(
          (id) => member(db, id)?.status !== 'active' || balance(db, id) < game.stake,
        )
      )
        fail(400, '참여 가능한 회원과 포인트를 확인해주세요.');
      game.status = 'playing';
      beginRound(game, now);
    }
  } else if (action === 'decision') {
    if (![1, 2].includes(input.round) || !['call', 'die'].includes(input.choice))
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
      finish(
        db,
        game,
        game.players.find((id) => id !== actor.id),
        'die',
        now,
      );
    } else {
      if (
        !Number.isInteger(multiplier) ||
        multiplier < (input.round === 1 ? 1 : 2) ||
        multiplier > 10
      )
        fail(400, '2~10배 중 선택해주세요.');
      const amount = game.stake * multiplier;
      if (balance(db, actor.id) < amount) fail(400, '베팅할 포인트가 부족합니다.');
      transferGamePoints(db, actor.id, 'dice:' + game.id + ':bet:' + input.round, -amount, game.id);
      game.bets[actor.id] += amount;
      game.actions[input.round][actor.id] = { choice: 'call', multiplier };
      game.revision++;
      if (game.players.every((id) => game.actions[input.round][id])) {
        beginRound(game, now);
        if (game.round === 3) {
          game.status = 'revealing';
          game.revealAt = now + 2200;
        }
      }
    }
  } else if (action === 'rematch') {
    if (game.status !== 'finished') fail(409, '승부가 끝난 뒤 선택해주세요.');
    if (game.rematchDeclined) fail(409, '상대가 재대결을 종료했습니다.');
    if (
      !game.nextGameId &&
      (db.diceGames || []).some(
        (item) =>
          item.id !== game.id &&
          active(item) &&
          item.players.some((id) => game.players.includes(id)),
      )
    )
      fail(409, '이미 다른 초대 또는 게임이 진행 중입니다.');
    if (input.accept !== true) {
      game.rematchDeclined = true;
      game.rematch = [];
      game.revision++;
    } else if (!game.nextGameId) {
      if (balance(db, actor.id) < game.stake) fail(400, '재대결할 포인트가 부족합니다.');
      if (!game.rematch.includes(actor.id)) {
        game.rematch.push(actor.id);
        game.revision++;
      }
      if (game.players.every((id) => game.rematch.includes(id))) {
        if (
          game.players.some(
            (id) => member(db, id)?.status !== 'active' || balance(db, id) < game.stake,
          )
        )
          fail(400, '상대의 포인트가 부족하거나 탈퇴한 상태입니다.');
        game.nextGameId = createGame(db, game.players, game.stake, now, false).id;
      }
    }
  } else fail(404, '게임 요청을 찾을 수 없습니다.');
  return snapshot(db, actor, now, 'dice');
}
