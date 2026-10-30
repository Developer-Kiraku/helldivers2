import 'server-only';
import { sanitizePostHtml } from './post-html.mjs';
import { youtubeEmbedUrl } from '../editor-format.mjs';
import { boards } from '../data';
import { fail } from './auth';
import { normalizeMaps } from '../post-maps.mjs';
import { normalizeLoadout } from '../loadout.mjs';
import { normalizeTierList } from '../tier-list.mjs';
import { equipmentGroups } from '../equipment.mjs';

export function validImage(value, allowLocal = false, max = 900000, allowRemote = false) {
  if (typeof value !== 'string' || value.length > max)
    fail(400, '이미지 크기가 허용 범위를 초과했습니다.');
  if (!value) return '';
  if (allowRemote && value.startsWith('https://')) {
    try {
      const url = new URL(value);
      if (url.username || url.password || value.length > 2048) throw Error();
      return url.href;
    } catch {
      fail(400, '유효한 HTTPS 이미지 주소를 입력해주세요.');
    }
  }
  if (allowLocal && /^\/images\/[a-zA-Z0-9_.-]+$/.test(value)) return value;
  const match = /^data:image\/(jpeg|png|webp);base64,([A-Za-z0-9+/]+={0,2})$/.exec(value);
  if (!match) fail(400, 'JPG·PNG·WebP 이미지 형식만 사용할 수 있습니다.');
  const bytes = Buffer.from(match[2], 'base64');
  const valid =
    match[1] === 'jpeg'
      ? bytes[0] === 255 && bytes[1] === 216 && bytes[2] === 255
      : match[1] === 'png'
        ? bytes.subarray(0, 8).equals(Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]))
        : bytes.toString('ascii', 0, 4) === 'RIFF' && bytes.toString('ascii', 8, 12) === 'WEBP';
  if (!valid) fail(400, '유효한 이미지 파일을 선택해주세요.');
  return value;
}
export function cleanPost(input, board) {
  if (!boards[board]) fail(400, '게시판을 확인해주세요.');
  if (board === 'tierlist') {
    const status = input.status ?? 'published';
    if (!['draft', 'published'].includes(status)) fail(400, '저장 상태를 확인해주세요.');
    const title = typeof input.title === 'string' ? input.title.trim() : '';
    if (!title || title.length > 100) fail(400, '제목은 1~100자로 입력해주세요.');
    let tierList;
    try {
      tierList = normalizeTierList(input.tierList, { draft: status === 'draft' });
    } catch (error) {
      fail(400, error.message);
    }
    return {
      title,
      status,
      tierList,
      category: equipmentGroups.find(([id]) => id === tierList.group)[1],
      content: '',
      bodyHtml: '',
      images: [],
      maps: [],
    };
  }
  let loadout;
  if (board === 'loadout') {
    try {
      loadout = normalizeLoadout(input.loadout);
    } catch (error) {
      fail(400, error.message);
    }
  }
  if (input.pinned !== undefined && typeof input.pinned !== 'boolean')
    fail(400, '상단 고정 여부를 확인해주세요.');
  if (input.pinned === true && board !== 'notice')
    fail(400, '공지사항만 상단에 고정할 수 있습니다.');
  const title = typeof input.title === 'string' ? input.title.trim() : '';
  if (!title || title.length > 100) fail(400, '제목은 1~100자로 입력해주세요.');
  if (!boards[board].categories.includes(input.category)) fail(400, '게시글 분류를 확인해주세요.');
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (content.length > 50000) fail(400, '본문은 50,000자 이하로 작성해주세요.');
  const imageLimit = board === 'helstagram' ? 10 : 5;
  if (Array.isArray(input.images) && input.images.length > imageLimit)
    fail(400, `이미지는 최대 ${imageLimit}장까지 넣을 수 있습니다.`);
  const images = Array.isArray(input.images)
    ? input.images.map((image) => validImage(image, true, 7000000, true))
    : [];
  const youtubeInput = board === 'helstagram' ? (input.youtubeUrl ?? '') : '';
  if (typeof youtubeInput !== 'string' || youtubeInput.length > 2048)
    fail(400, '유효한 유튜브 주소를 입력해주세요.');
  const youtubeUrl = youtubeInput.trim() ? youtubeEmbedUrl(youtubeInput) : '';
  let maps;
  try {
    maps = normalizeMaps(input.maps ?? []);
  } catch (error) {
    fail(400, error.message);
  }
  if (youtubeInput.trim() && !youtubeUrl) fail(400, '유효한 유튜브 주소를 입력해주세요.');
  if (board === 'helstagram' && !images.length && !youtubeUrl && !maps.length)
    fail(400, '사진, 유튜브 영상 또는 지도를 첨부해주세요.');
  if (board === 'helstagram' && images.reduce((size, image) => size + image.length, 0) > 10000000)
    fail(400, '사진 전체 크기를 줄여주세요.');
  const raw = typeof input.bodyHtml === 'string' ? input.bodyHtml : '';
  if (raw.length > 12000000) fail(400, '본문 크기가 너무 큽니다.');
  const bodyHtml = sanitizePostHtml(raw, images);
  if (
    !loadout &&
    !content &&
    !images.length &&
    !youtubeUrl &&
    !maps.length &&
    !bodyHtml.includes('<iframe ') &&
    !bodyHtml.includes('data-emoticon=') &&
    !bodyHtml.includes('data-equipment=')
  )
    fail(400, '본문을 입력해주세요.');
  return {
    title,
    ...(loadout ? { loadout } : {}),
    category: input.category,
    content,
    bodyHtml,
    images,
    ...(input.maps !== undefined ? { maps } : {}),
    ...(board === 'helstagram' ? { youtubeUrl } : {}),
    ...(board === 'notice' && input.pinned !== undefined ? { pinned: input.pinned } : {}),
  };
}
