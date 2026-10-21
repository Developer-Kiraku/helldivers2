import assert from 'node:assert/strict';
import sharp from 'sharp';
import { uploadDimensions } from '../src/lib/image-upload.mjs';
import { normalizeUploadedImage, normalizePostImages } from '../src/lib/server/image-upload.mjs';

assert.deepEqual(uploadDimensions(3200, 1800), { width: 1600, height: 900 });
assert.deepEqual(uploadDimensions(1600, 900), { width: 1600, height: 900 });
assert.deepEqual(uploadDimensions(800, 2000), { width: 800, height: 2000 });
assert.deepEqual(uploadDimensions(800, 2000, true), { width: 256, height: 256 });
assert.throws(() => uploadDimensions(100000, 100000));
for (const [width, height] of [
  [3200, 1800],
  [1600, 900],
  [800, 2000],
]) {
  const bytes = await sharp({
    create: { width, height, channels: 4, background: { r: 80, g: 150, b: 170, alpha: 0.5 } },
  })
    .png()
    .withMetadata()
    .toBuffer();
  const src = `data:image/png;base64,${bytes.toString('base64')}`;
  const result = await normalizeUploadedImage(src);
  const info = await sharp(Buffer.from(result.split(',')[1], 'base64')).metadata();
  assert.equal(info.width, Math.min(width, 1600));
  assert.equal(info.height, Math.round(height * Math.min(1, 1600 / width)));
  assert.equal(info.hasAlpha, true);
  assert.equal(info.exif, undefined);
  assert.ok(result.length <= 900000);
  const post = await normalizePostImages(
    { images: [src], bodyHtml: `<p>사진</p><img src="${src}">` },
    'talk',
  );
  assert.ok(post.bodyHtml.includes(post.images[0]));
  assert.ok(!post.bodyHtml.includes(src));
  const avatar = await normalizeUploadedImage(src, { avatar: true });
  const avatarInfo = await sharp(Buffer.from(avatar.split(',')[1], 'base64')).metadata();
  assert.equal(avatarInfo.width, 256);
  assert.equal(avatarInfo.height, 256);
}
for (const src of [
  'data:image/svg+xml;base64,PHN2Zz4=',
  'data:image/png;base64,iVBORw0KGgo=',
  'data:image/jpeg;base64,YWJjZA==',
])
  await assert.rejects(normalizeUploadedImage(src));
assert.equal(
  await normalizeUploadedImage('/images/community-squad.png'),
  '/images/community-squad.png',
);
await assert.rejects(normalizePostImages({ images: Array(6).fill('') }, 'talk'));
console.log(
  'PASS: image width cap, aspect ratio, no upscaling, avatars, alpha, metadata removal, corrupt files and HTML image references',
);
