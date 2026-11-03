import assert from 'node:assert/strict';
import { randomBytes, randomUUID } from 'node:crypto';
import { createPool } from '../src/lib/server/postgres.mjs';
import harness from './test-functional.cjs';
const url = new URL(process.env.DATABASE_URL),
  schema = `hd_api_${randomBytes(6).toString('hex')}`;
const adminPool = createPool(url.href);
await adminPool.query(`CREATE SCHEMA ${schema}`);
url.searchParams.set('options', `-c search_path=${schema}`);
process.env.DATABASE_URL = url.href;
try {
  await harness.start('work/postgres-http-unused.json', { databaseUrl: url.href });
  const admin = harness.client(),
    member = harness.client();
  assert.equal((await member.call('/api/health')).data.storage, 'postgresql');
  await member.call('/api/bootstrap', 'GET', undefined, 401);
  await admin.call('/api/auth/login', 'POST', { loginId: 'admin', password: '1234' });
  await member.call('/api/auth/login', 'POST', { loginId: 'user1', password: '1234' });
  const bootstrap = (await member.call('/api/bootstrap')).data;
  for (const board of ['notice', 'guide', 'talk', 'qna'])
    assert.equal(bootstrap.posts[board].length, 18);
  const post = (
    await member.call('/api/posts', 'POST', {
      board: 'qna',
      category: '질문',
      title: 'PostgreSQL API 검증',
      content: 'DB에 저장되는 본문',
      bodyHtml: '',
      images: [],
      poll: { question: '확인', options: ['찬성', '반대'] },
    })
  ).data.post;
  const views = await Promise.all(
    Array.from({ length: 5 }, () => member.call(`/api/posts/${post.id}/view`, 'POST', {})),
  );
  assert.ok(views.every(({ data }) => data.views === 1));
  assert.equal((await admin.call(`/api/posts/${post.id}/view`, 'POST', {})).data.views, 2);
  assert.equal(
    (await member.call('/api/bootstrap')).data.posts.qna.find((item) => item.id === post.id).views,
    2,
  );
  await admin.call(`/api/posts/${post.id}/poll`, 'POST', { choices: [post.poll.options[0].id] });
  const root = (
    await admin.call(`/api/posts/${post.id}/comments`, 'POST', { body: 'PostgreSQL 댓글' })
  ).data.comment;
  const reply = (
    await member.call(`/api/posts/${post.id}/comments`, 'POST', {
      body: '@라미아 답글',
      parentId: root.id,
    })
  ).data.comment;
  await admin.call(`/api/posts/${post.id}/comments/${reply.id}/vote`, 'POST', { value: 1 });
  const mention = (await admin.call('/api/notifications')).data.notifications.find(
    (item) => item.commentId === reply.id,
  );
  assert.equal(mention.kind, 'mention');
  await admin.call(`/api/notifications/${mention.id}/read`, 'POST', {});
  await admin.call('/api/admin/users/u-user2/approve', 'POST', {});
  const message = (
    await member.call('/api/messages', 'POST', {
      recipientId: 'u-admin',
      body: '재시작 후에도 보존되는 비공개 쪽지',
      requestId: randomUUID(),
    })
  ).data.message;
  const messageReadAt = (await admin.call(`/api/messages/${message.id}/read`, 'POST', {})).data
    .message.readAt;
  const puzzleRun = (await member.call('/api/games/sliding-puzzle/start', 'POST', {})).data.run;
  const fixturePool = createPool(url.href);
  try {
    await fixturePool.query(
      "UPDATE hd_puzzle_runs SET data=jsonb_set(data,'{board}',$1::jsonb) WHERE id=$2",
      [JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 0, 15]), puzzleRun.id],
    );
  } finally {
    await fixturePool.end();
  }
  await member.call('/api/games/sliding-puzzle/move', 'POST', {
    runId: puzzleRun.id,
    tile: 15,
    step: 0,
  });
  const puzzleResult = (
    await member.call('/api/games/sliding-puzzle/finish', 'POST', {
      runId: puzzleRun.id,
      moves: [15],
    })
  ).data;
  assert.equal(puzzleResult.rank, 1);
  const pointBalance = (await member.call('/api/bootstrap')).data.user.points;
  assert.ok(pointBalance.current >= 50);
  await admin.call('/api/admin/settings/points', 'PATCH', {
    post: 25,
    comment: 5,
    like: 2,
    daily: 50,
    bonusMultiplier: 2,
  });
  await member.call('/api/games/sliding-puzzle/finish', 'POST', {
    runId: puzzleRun.id,
    moves: [15],
  });
  const activePuzzle = (await admin.call('/api/games/sliding-puzzle/start', 'POST', {})).data.run;
  const activeFixturePool = createPool(url.href);
  try {
    await activeFixturePool.query(
      "UPDATE hd_puzzle_runs SET data=jsonb_set(data,'{board}',$1::jsonb) WHERE id=$2",
      [JSON.stringify([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 0, 14, 15]), activePuzzle.id],
    );
  } finally {
    await activeFixturePool.end();
  }
  await admin.call('/api/games/sliding-puzzle/move', 'POST', {
    runId: activePuzzle.id,
    tile: 14,
    step: 0,
  });
  await harness.stop();
  await harness.start('work/postgres-http-unused.json', { databaseUrl: url.href });
  const activeState = (await admin.call('/api/games/sliding-puzzle/state?runId=' + activePuzzle.id))
    .data.run;
  assert.equal(activeState.moves, 1);
  assert.equal(activeState.step, 1);
  await admin.call('/api/games/sliding-puzzle/move', 'POST', {
    runId: activePuzzle.id,
    tile: 15,
    step: 1,
  });
  assert.equal(
    (await admin.call('/api/games/sliding-puzzle/finish', 'POST', { runId: activePuzzle.id })).data
      .record.moves,
    2,
  );
  assert.deepEqual((await member.call('/api/bootstrap')).data.user.points, pointBalance);
  assert.equal((await admin.call('/api/admin/settings/points')).data.settings.post, 25);
  console.log(
    'PASS: current/cumulative points, daily attendance and configurable point settings persist across PostgreSQL restart',
  );
  const puzzleRankings = (
    await member.call('/api/games/sliding-puzzle?month=' + puzzleResult.record.month)
  ).data;
  assert.equal(puzzleRankings.mine.moves, 1);
  assert.equal(puzzleRankings.mine.elapsedMs, puzzleResult.record.elapsedMs);
  assert.equal(
    (await member.call('/api/notifications')).data.notifications.filter(
      (item) => item.kind === 'puzzle_rank_enter',
    ).length,
    1,
  );
  console.log(
    'PASS: puzzle run, monthly record and top-three notification persist across PostgreSQL restart; repeated finish is idempotent',
  );
  const persisted = (await member.call(`/api/posts/${post.id}`)).data;
  assert.equal(persisted.comments.find((item) => item.id === root.id).body, 'PostgreSQL 댓글');
  const persistedReply = persisted.comments.find((item) => item.id === reply.id);
  assert.equal(persistedReply.parentId, root.id);
  assert.equal(persistedReply.likes, 1);
  assert.ok(
    (await admin.call('/api/notifications')).data.notifications.find(
      (item) => item.id === mention.id,
    ).readAt,
  );
  assert.ok(
    (await member.call('/api/notifications')).data.notifications.some(
      (item) => item.commentId === reply.id && item.kind === 'like',
    ),
  );
  assert.equal(persisted.post.poll.totalVoters, 1);
  assert.equal(persisted.post.views, 2);
  assert.ok(!('viewReceipts' in persisted.post));
  assert.equal((await member.call(`/api/posts/${post.id}/view`, 'POST', {})).data.views, 2);
  assert.equal(
    (await admin.call('/api/admin/users')).data.users.find((user) => user.id === 'u-user2').role,
    'member',
  );
  const persistedMessage = (await member.call(`/api/messages/${message.id}`)).data.message;
  assert.equal(persistedMessage.body, message.body);
  assert.equal(persistedMessage.readAt, messageReadAt);
  await member.call(`/api/messages/${message.id}`, 'DELETE', {});
  assert.equal((await admin.call(`/api/messages/${message.id}`)).data.message.body, message.body);
  await member.call('/api/auth/logout', 'POST', {});
  await member.call('/api/bootstrap', 'GET', undefined, 401);
  console.log(
    'PASS: PostgreSQL HTTP health, authentication, boards, comments, approval, private messages and read receipts across restart, independent deletion and logout',
  );
} finally {
  await harness.stop();
  await adminPool.query(`DROP SCHEMA ${schema} CASCADE`);
  await adminPool.end();
}
