export const mapProviders = { kakao: '카카오맵', google: '구글맵' };
export const mapLimit = 3;
export function kakaoMapUrl(value) {
  if (typeof value !== 'string' || value.length > 2048 || /[\u0000-\u0020\\]/.test(value.trim()))
    return '';
  try {
    const url = new URL(value.trim());
    if (
      !['https:', 'http:'].includes(url.protocol) ||
      url.username ||
      url.password ||
      url.port ||
      !['map.kakao.com', 'm.map.kakao.com', 'place.map.kakao.com', 'kko.to'].includes(
        url.hostname,
      ) ||
      url.pathname === '/'
    )
      return '';
    url.protocol = 'https:';
    return url.href;
  } catch {
    return '';
  }
}
export function googleEmbedUrl(value) {
  if (typeof value !== 'string' || value.length > 14000) return '';
  const source = value.match(/\bsrc\s*=\s*["']([^"']+)["']/i)?.[1] || value.trim();
  try {
    const url = new URL(source.replaceAll('&amp;', '&'));
    if (
      url.origin !== 'https://www.google.com' ||
      url.pathname !== '/maps/embed' ||
      url.username ||
      url.password
    )
      return '';
    const pb = url.searchParams.get('pb');
    if (!pb || pb.length > 12000 || !pb.startsWith('!')) return '';
    const result = `https://www.google.com/maps/embed?${new URLSearchParams({ pb })}`;
    return result.length <= 4000 ? result : '';
  } catch {
    return '';
  }
}
export function normalizeMaps(value) {
  if (!Array.isArray(value) || value.length > mapLimit)
    throw Error('지도는 최대 3개까지 첨부할 수 있습니다.');
  return value.map((item) => {
    if (!item || !Object.hasOwn(mapProviders, item.provider))
      throw Error('지도 서비스를 선택해주세요.');
    const address = typeof item.address === 'string' ? item.address.trim() : '';
    if (address.length < 2 || address.length > 300 || /[\u0000-\u001f]/.test(address))
      throw Error('주소를 2~300자로 입력해주세요.');
    const map = { provider: item.provider, address };
    if (item.provider === 'kakao') {
      if (item.url !== undefined) {
        const url = kakaoMapUrl(item.url);
        if (!url) throw Error('카카오맵에서 복사한 공유 URL을 입력해주세요.');
        return { ...map, url };
      }
      if (
        typeof item.lat !== 'number' ||
        typeof item.lng !== 'number' ||
        !Number.isFinite(item.lat) ||
        !Number.isFinite(item.lng) ||
        Math.abs(item.lat) > 90 ||
        Math.abs(item.lng) > 180
      )
        throw Error('주소 검색 결과에서 위치를 선택해주세요.');
      map.lat = item.lat;
      map.lng = item.lng;
    } else if (item.embedUrl) {
      const url = googleEmbedUrl(item.embedUrl);
      if (!url)
        throw Error('Google 지도의 ‘지도 퍼가기’에서 복사한 HTML 또는 삽입 주소를 입력해주세요.');
      map.embedUrl = url;
    }
    return map;
  });
}
export function mapSearchUrl(map) {
  return map.provider === 'kakao'
    ? map.url
      ? kakaoMapUrl(map.url)
      : `https://map.kakao.com/link/map/${encodeURIComponent(map.address)},${map.lat},${map.lng}`
    : `https://www.google.com/maps/search/?${new URLSearchParams({ api: '1', query: map.address })}`;
}
export function mapFrameUrl(map) {
  return `/maps/embed?${new URLSearchParams(Object.entries(map).map(([key, value]) => [key, String(value)]))}`;
}
