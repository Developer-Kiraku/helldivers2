import fs from 'node:fs/promises';
import sharp from 'sharp';
const pngDirectory = process.argv[2];
if (pngDirectory) await fs.mkdir(pngDirectory, { recursive: true });
await fs.mkdir('public/emoticons', { recursive: true });
for (const [sheetIndex, sheet] of ['A', 'B', 'C', 'D'].entries()) {
  const source = `assets/emoticons/atlas-${sheet}.png`;
  const { width, height, hasAlpha } = await sharp(source).metadata();
  if (!hasAlpha) throw Error(`${source}: alpha channel required`);
  const pixels = await sharp(source).ensureAlpha().raw().toBuffer();
  const separators = Array.from({ length: 5 }, (_, col) => {
    const left = Math.round((col * width) / 5),
      right = Math.round(((col + 1) * width) / 5);
    let best = { y: Math.round(height / 2), count: Infinity };
    for (let y = Math.round(height * 0.43); y <= Math.round(height * 0.57); y++) {
      let count = 0;
      for (let x = left; x < right; x++) if (pixels[(y * width + x) * 4 + 3] > 100) count++;
      if (
        count < best.count ||
        (count === best.count && Math.abs(y - height / 2) < Math.abs(best.y - height / 2))
      )
        best = { y, count };
    }
    return best.y;
  });
  for (let index = 0; index < 10; index++) {
    const col = index % 5,
      row = Math.floor(index / 5);
    const left = Math.round((col * width) / 5),
      top = row === 0 ? 0 : separators[col];
    const right = Math.round(((col + 1) * width) / 5),
      bottom = row === 0 ? separators[col] : height;
    const id = String(sheetIndex * 10 + index + 1).padStart(2, '0');
    if (pngDirectory)
      await sharp(source)
        .extract({ left, top, width: right - left, height: bottom - top })
        .png()
        .toFile(`${pngDirectory}/${id}.png`);
    await sharp(source)
      .extract({ left, top, width: right - left, height: bottom - top })
      .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .webp({ quality: 92 })
      .toFile(`public/emoticons/${id}.webp`);
  }
}
for (let id = 41; id <= 50; id++) {
  const source = `assets/emoticons/members/${id}.png`;
  if (!(await sharp(source).metadata()).hasAlpha) throw Error(`${source}: alpha channel required`);
  await sharp(source)
    .resize(256, 256, { fit: 'contain', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .webp({ quality: 92 })
    .toFile(`public/emoticons/${id}.webp`);
  if (pngDirectory) await fs.copyFile(source, `${pngDirectory}/${id}.png`);
}
console.log(
  'Built 50 transparent 256px emoticons.' + (pngDirectory ? ` PNGs: ${pngDirectory}` : ''),
);
