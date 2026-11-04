const assert = require('node:assert/strict');
const fs = require('node:fs/promises');

module.exports = async function ({ guest, member, file }) {
  await guest.call('/api/rankings/points', 'GET', undefined, 401);
  await guest.call('/api/rankings/puzzle', 'GET', undefined, 401);
  for (const page of ['0', '-1', '1.5', 'no', 'Infinity'])
    await member.call('/api/rankings/points?page=' + page, 'GET', undefined, 400);
  await member.call('/api/rankings/unknown', 'GET', undefined, 404);
  const original = await fs.readFile(file, 'utf8');
  const db = JSON.parse(original);
  const { puzzleMonth } = await import('../src/lib/sliding-puzzle.mjs');
  const month = puzzleMonth();
  const users = Array.from({ length: 12 }, (_, i) => ({
    id: `ranking-fixture-${i}`,
    nickname: `랭킹 대원 ${i}`,
    role: 'member',
    status: 'active',
    photo: '',
    createdAt: '2026-01-01T00:00:00Z',
    points: { current: 1000000 - i * 100, total: 100 + i },
    passwordHash: 'must-not-leak',
    kakao: { id: 'private' },
  }));
  db.users.push(
    ...users,
    {
      ...users[0],
      id: 'ranking-withdrawn',
      status: 'withdrawn',
      points: { current: 9999999, total: 9999999 },
    },
    {
      ...users[0],
      id: 'ranking-test',
      isTestPlayer: true,
      points: { current: 9999999, total: 9999999 },
    },
  );
  db.puzzleRecords = users.map((user, i) => ({
    id: `ranking-record-${i}`,
    userId: user.id,
    month,
    elapsedMs: 20000 + Math.floor(i / 2) * 1000,
    moves: 50 + i,
    finishedAt: new Date().toISOString(),
  }));
  db.puzzleRecords.push({
    ...db.puzzleRecords[0],
    id: 'other-month',
    month: '2020-01',
    elapsedMs: 1,
  });
  try {
    await fs.writeFile(file, JSON.stringify(db));
    const points = (await member.call('/api/rankings/points')).data;
    assert.equal(points.rankings.length, 5);
    assert.equal(
      points.rankings[0].id,
      users[0].id,
      'Current balance, not total, determines ranking',
    );
    assert.equal(points.rankings[0].points, 1000000);
    assert.equal(points.hasMore, true);
    assert.ok(
      points.rankings.every(
        (row) => !('passwordHash' in row) && !('kakao' in row) && !('total' in row),
      ),
    );
    const ten = (await member.call('/api/rankings/points?page=2')).data;
    assert.equal(ten.rankings.length, 10);
    assert.deepEqual(ten.rankings.slice(0, 5), points.rankings);
    const all = (await member.call('/api/rankings/points?page=100')).data;
    assert.equal(all.hasMore, false);
    assert.ok(!all.rankings.some((row) => ['ranking-withdrawn', 'ranking-test'].includes(row.id)));
    assert.equal(all.rankings.filter((row) => row.own).length, 1);
    const puzzle = (await member.call('/api/rankings/puzzle')).data;
    assert.equal(puzzle.month, month);
    assert.equal(puzzle.total, 12);
    assert.equal(puzzle.rankings.length, 5);
    assert.equal(puzzle.rankings[0].moves, 50);
    assert.equal(puzzle.rankings[1].moves, 51, 'Equal times use fewer moves first');
    const game = (await member.call('/api/games/sliding-puzzle')).data;
    assert.deepEqual(
      puzzle.rankings,
      game.rankings.slice(0, 5),
      'Dashboard and game share ranking rules',
    );
    assert.equal((await member.call('/api/rankings/puzzle?page=2')).data.rankings.length, 10);
    const twelve = (await member.call('/api/rankings/puzzle?page=3')).data;
    assert.equal(twelve.rankings.length, 12);
    assert.equal(twelve.hasMore, false);
    db.users.find((u) => u.id === users[0].id).points.current = 0;
    db.puzzleRecords = [];
    await fs.writeFile(file, JSON.stringify(db));
    assert.equal((await member.call('/api/rankings/points')).data.rankings[0].id, users[1].id);
    assert.deepEqual((await member.call('/api/rankings/puzzle')).data.rankings, []);
    console.log(
      'PASS: dashboard rankings auth, current balances, safe member fields, test/withdrawn exclusion, five-at-a-time results, shared monthly puzzle tie-breaking and live updates',
    );
  } finally {
    await fs.writeFile(file, original);
  }
};
