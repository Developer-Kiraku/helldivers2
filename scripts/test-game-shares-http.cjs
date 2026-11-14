const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const sharp = require('sharp');
module.exports = async ({ guest, member, admin, file }) => {
  const store = JSON.parse(await fs.readFile(file, 'utf8'));
  const round = store.rpsRounds.findLast((row) => row.userId === 'u-user1');
  assert.ok(round);
  const input = { game: 'rps', resultId: round.requestId, profit: 999999 };
  await guest.call('/api/games/share', 'POST', input, 401);
  await member.call('/api/games/share', 'POST', input, 403, { Origin: null });
  await admin.call('/api/games/share', 'POST', input, 404);
  const shares = await Promise.all(
    Array.from({ length: 3 }, () => member.call('/api/games/share', 'POST', input)),
  );
  assert.equal(shares[0].data.share.path, shares[1].data.share.path);
  assert.equal(shares[1].data.share.path, shares[2].data.share.path);
  const share = shares[0].data.share;
  const publicPage = await guest.call(share.path);
  assert.match(publicPage.response.headers.get('x-robots-tag'), /noindex/);
  assert.match(publicPage.data, /og:image/);
  assert.match(publicPage.data, /게임 결과|MISSION REPORT/);
  assert.ok(!publicPage.data.includes('999999'));
  assert.ok(!publicPage.data.includes('passwordHash'));
  const image = await fetch(new URL(share.path + '/image', publicPage.response.url));
  assert.equal(image.status, 200);
  assert.equal(image.headers.get('content-type'), 'image/png');
  const bytes = Buffer.from(await image.arrayBuffer());
  const meta = await sharp(bytes).metadata();
  assert.equal(meta.width, 1200);
  assert.equal(meta.height, 630);
  await fs.writeFile('work/game-result-http-proof.png', bytes);
  const download = await fetch(new URL(share.path + '/image?download=1', publicPage.response.url));
  assert.match(download.headers.get('content-disposition'), /attachment/);
  await guest.call('/game-results/invalid', 'GET', undefined, 404);
  await guest.call('/game-results/' + 'A'.repeat(24), 'GET', undefined, 404);
  await guest.call('/game-results/' + 'A'.repeat(24) + '/image', 'GET', undefined, 404);
  await guest.call('/games/rps', 'GET', undefined, 307);
  const after = JSON.parse(await fs.readFile(file, 'utf8'));
  assert.equal(after.gameShares.filter((row) => row.resultId === round.requestId).length, 1);
  const handBefore = (await member.call('/api/games/rps/enhance')).data;
  const handRequest = {
    game: 'rps-hand',
    resultId: String(handBefore.hand.version),
    handLevel: 20,
  };
  await guest.call('/api/games/share', 'POST', handRequest, 401);
  await member.call('/api/games/share', 'POST', handRequest, 403, { Origin: null });
  const handShare = (await member.call('/api/games/share', 'POST', handRequest)).data.share;
  assert.equal(handShare.result.handLevel, handBefore.hand.level);
  const handPage = await guest.call(handShare.path);
  assert.match(handPage.data, /href="\/games\/rps"/);
  const handImage = await fetch(new URL(handShare.path + '/image', handPage.response.url));
  assert.equal(handImage.status, 200);
  const handBytes = Buffer.from(await handImage.arrayBuffer());
  const handMeta = await sharp(handBytes).metadata();
  assert.equal(handMeta.width, 1200);
  assert.equal(handMeta.height, 630);
  await fs.writeFile('work/hand-result-http-proof.png', handBytes);
  assert.deepEqual(
    (await member.call('/api/games/rps/enhance')).data,
    handBefore,
    'Sharing never spends points or changes the hand',
  );
  console.log(
    'PASS: share HTTP auth/CSRF/ownership, concurrency, public OG/PNG/download, invalid IDs and protected games',
  );
};
