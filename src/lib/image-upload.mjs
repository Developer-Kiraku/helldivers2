export function uploadDimensions(width, height, avatar = false) {
  if (
    !Number.isInteger(width) ||
    !Number.isInteger(height) ||
    width < 1 ||
    height < 1 ||
    width * height > 60000000
  )
    throw Error('이미지 해상도가 너무 크거나 올바르지 않습니다.');
  if (avatar) return { width: Math.min(256, width, height), height: Math.min(256, width, height) };
  const scale = Math.min(1, 1600 / width);
  return { width: Math.round(width * scale), height: Math.max(1, Math.round(height * scale)) };
}

export async function prepareUpload(file, { avatar = false } = {}) {
  if (
    !['image/jpeg', 'image/png', 'image/webp'].includes(file.type) ||
    file.size > 20 * 1024 * 1024
  )
    throw Error('JPG·PNG·WebP 형식의 20MB 이하 이미지를 선택해주세요.');
  const url = URL.createObjectURL(file);
  try {
    const image = new Image();
    image.src = url;
    await image.decode();
    const size = uploadDimensions(image.naturalWidth, image.naturalHeight, avatar);
    const canvas = document.createElement('canvas');
    canvas.width = size.width;
    canvas.height = size.height;
    const context = canvas.getContext('2d');
    if (!context) throw Error('이미지를 처리하지 못했습니다.');
    if (avatar) {
      const side = Math.min(image.naturalWidth, image.naturalHeight);
      context.drawImage(
        image,
        (image.naturalWidth - side) / 2,
        (image.naturalHeight - side) / 2,
        side,
        side,
        0,
        0,
        size.width,
        size.height,
      );
    } else context.drawImage(image, 0, 0, size.width, size.height);
    const format = file.type === 'image/jpeg' ? 'image/jpeg' : 'image/webp';
    for (const quality of [0.88, 0.75, 0.6, 0.45, 0.3]) {
      const src = canvas.toDataURL(format, quality);
      if (src.length <= 900000) return src;
    }
    throw Error('압축 후에도 이미지 용량이 큽니다. 더 작은 이미지를 선택해주세요.');
  } catch (error) {
    if (error.name === 'EncodingError')
      throw Error('이미지를 읽을 수 없습니다. 다른 파일을 선택해주세요.');
    throw error;
  } finally {
    URL.revokeObjectURL(url);
  }
}
