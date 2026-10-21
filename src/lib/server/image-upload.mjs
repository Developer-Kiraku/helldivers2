import sharp from 'sharp';

export class ImageUploadError extends Error {
  constructor(message) {
    super(message);
    this.status = 400;
  }
}
export async function normalizeUploadedImage(src, { avatar = false } = {}) {
  if (typeof src !== 'string') throw new ImageUploadError('이미지 형식을 확인해주세요.');
  if (!src || !src.startsWith('data:')) return src;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src);
  if (!match || src.length > 7000000)
    throw new ImageUploadError('JPG·PNG·WebP 형식의 이미지를 선택해주세요.');
  try {
    const bytes = Buffer.from(match[2], 'base64');
    const signature =
      match[1] === 'jpeg'
        ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
        : match[1] === 'png'
          ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
          : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
    if (!signature) throw Error();
    const options = { limitInputPixels: 60000000, failOn: 'warning', animated: false };
    const metadata = await sharp(bytes, options).metadata();
    if (metadata.format !== match[1] || (metadata.pages || 1) > 1) throw Error();
    const format = match[1] === 'jpeg' ? 'jpeg' : 'webp';
    for (const quality of [88, 75, 60, 45, 30]) {
      let image = sharp(bytes, options).autoOrient();
      image = avatar
        ? image.resize(256, 256, { fit: 'cover', withoutEnlargement: true })
        : image.resize({ width: 1600, withoutEnlargement: true });
      const output = await image[format]({ quality }).toBuffer();
      const result = `data:image/${format};base64,${output.toString('base64')}`;
      if (result.length <= 900000) return result;
    }
  } catch {
    throw new ImageUploadError(
      '이미지를 읽을 수 없습니다. 올바른 JPG·PNG·WebP 이미지를 선택해주세요.',
    );
  }
  throw new ImageUploadError('압축 후 이미지 용량이 큽니다. 더 작은 이미지를 선택해주세요.');
}

export async function normalizePostImages(input, board) {
  if (!Array.isArray(input.images)) return input;
  const limit = board === 'helstagram' ? 10 : 5;
  if (input.images.length > limit)
    throw new ImageUploadError(`이미지는 최대 ${limit}장까지 넣을 수 있습니다.`);
  const result = {
    ...input,
    images: [],
    bodyHtml: typeof input.bodyHtml === 'string' ? input.bodyHtml : '',
  };
  const converted = new Map();
  for (const src of input.images) {
    if (!converted.has(src)) converted.set(src, await normalizeUploadedImage(src));
    const next = converted.get(src);
    result.images.push(next);
    if (src !== next) result.bodyHtml = result.bodyHtml.split(src).join(next);
  }
  return result;
}
