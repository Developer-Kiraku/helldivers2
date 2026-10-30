const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
import { emoticonParts } from './emoticons.mjs';
import { equipmentParts, equipmentForId } from './equipment.mjs';
export function postText(post) {
  const plain = typeof post.content === 'string' ? post.content : '';
  if (plain.trim())
    return emoticonParts(plain)
      .map((part) =>
        part.emoticon
          ? `[${part.emoticon.label}]`
          : equipmentParts(part.text)
              .map((piece) => (piece.equipment ? `[${piece.equipment.label}]` : piece.text))
              .join(''),
      )
      .join('');
  return String(post.bodyHtml || '')
    .replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&(#x[\da-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (match, entity) => {
      if (!entity.startsWith('#')) return entities[entity.toLowerCase()] || match;
      const value =
        entity[1].toLowerCase() === 'x' ? parseInt(entity.slice(2), 16) : Number(entity.slice(1));
      return value > 0 && value <= 0x10ffff ? String.fromCodePoint(value) : '';
    });
}
export function postSummary(post, limit = 120) {
  if (post.tierList) {
    return `${post.category} · ${post.tierList.faction} · ${post.tierList.rows
      .filter((row) => row.items.length)
      .map(
        (row) =>
          `${row.name}: ${row.items
            .map((id) => equipmentForId(id)?.label)
            .filter(Boolean)
            .join(', ')}`,
      )
      .join(' / ')}`.slice(0, limit);
  }
  if (post.loadout) {
    const value = post.loadout;
    return `${post.category} · ${[
      value.primary,
      value.secondary,
      value.throwable,
      ...(value.stratagems || []),
      value.armor,
    ]
      .map((id) => equipmentForId(id)?.label)
      .filter(Boolean)
      .join(' · ')} · ${value.armorClass}`.slice(0, limit);
  }
  const characters = Array.from(postText(post).replace(/\s+/g, ' ').trim());
  if (!characters.length)
    return post.maps?.length
      ? `지도: ${post.maps[0].address}`.slice(0, limit)
      : post.youtubeUrl
        ? '영상이 첨부된 게시글입니다.'
        : '사진이 첨부된 게시글입니다.';
  return characters.length > limit
    ? characters.slice(0, limit - 1).join('') + '…'
    : characters.join('');
}
