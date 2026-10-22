const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
export function postText(post) {
  const plain = typeof post.content === 'string' ? post.content : '';
  if (plain.trim()) return plain;
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
  const characters = Array.from(postText(post).replace(/\s+/g, ' ').trim());
  if (!characters.length)
    return post.youtubeUrl ? '영상이 첨부된 게시글입니다.' : '사진이 첨부된 게시글입니다.';
  return characters.length > limit
    ? characters.slice(0, limit - 1).join('') + '…'
    : characters.join('');
}
