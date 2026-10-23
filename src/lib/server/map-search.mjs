export async function searchMapAddress(query, key, fetcher = fetch) {
  if (!key) throw Error('카카오 주소 검색 키가 등록되지 않았습니다. 운영자에게 문의해주세요.');
  for (const kind of ['address', 'keyword']) {
    const url = new URL(`https://dapi.kakao.com/v2/local/search/${kind}.json`);
    url.searchParams.set('query', query);
    url.searchParams.set('size', '8');
    const response = await fetcher(url, {
      headers: { Authorization: `KakaoAK ${key}` },
      signal: AbortSignal.timeout(8000),
      cache: 'no-store',
    });
    if (!response.ok)
      throw Error(
        '주소 검색을 사용할 수 없습니다. 카카오맵 활성화와 로컬 API 설정을 확인해주세요.',
      );
    const data = await response.json();
    const results = (data.documents || [])
      .slice(0, 8)
      .map((item) => ({
        provider: 'kakao',
        address: item.road_address?.address_name || item.road_address_name || item.address_name,
        name: item.place_name || item.address_name,
        lat: Number(item.y),
        lng: Number(item.x),
      }))
      .filter(
        (item) =>
          typeof item.address === 'string' &&
          Number.isFinite(item.lat) &&
          Number.isFinite(item.lng),
      );
    if (results.length) return results;
  }
  return [];
}
