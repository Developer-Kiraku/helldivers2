import assert from 'node:assert/strict';
import {
  normalizeMaps,
  googleEmbedUrl,
  mapSearchUrl,
  mapFrameUrl,
  kakaoMapUrl,
} from '../src/lib/post-maps.mjs';
import { mapDocument } from '../src/lib/server/map-document.mjs';
import { searchMapAddress } from '../src/lib/server/map-search.mjs';
const kakao = {
  provider: 'kakao',
  address: '서울특별시 중구 세종대로 110',
  lat: 37.5665,
  lng: 126.978,
};
const google = { provider: 'google', address: '서울시청' };
for (const url of [
  'https://kko.to/example',
  'https://place.map.kakao.com/18577297',
  'https://map.kakao.com/link/map/37.5,127',
]) {
  const link = { provider: 'kakao', address: '공유 위치', url };
  assert.deepEqual(normalizeMaps([link]), [link]);
  assert.equal(mapSearchUrl(link), url);
  assert.ok(
    !mapDocument(link, { kakaoJavaScriptKey: 'a'.repeat(32) }).includes('new kakao.maps.LatLng'),
  );
}
for (const url of [
  'javascript:alert(1)',
  'https://map.kakao.com.evil.example/place',
  'https://evil@map.kakao.com/place',
  'https://map.kakao.com:444/place',
  'https://evil.example/',
  'https://kko.to/',
]) {
  assert.equal(kakaoMapUrl(url), '');
  assert.throws(() => normalizeMaps([{ provider: 'kakao', address: '공유 위치', url }]));
}
assert.deepEqual(normalizeMaps([kakao, google]), [kakao, google]);
for (const maps of [
  null,
  Array(4).fill(kakao),
  [{ ...kakao, lat: '37' }],
  [{ ...kakao, lat: Infinity }],
  [{ ...kakao, lng: 181 }],
  [{ ...google, provider: '__proto__' }],
  [{ ...google, address: 'x' }],
  [{ ...google, embedUrl: 'https://evil.example/maps/embed?pb=!test' }],
])
  assert.throws(() => normalizeMaps(maps));
assert.equal(googleEmbedUrl('https://www.google.com.evil.example/maps/embed?pb=!1'), '');
assert.equal(googleEmbedUrl('https://evil@www.google.com/maps/embed?pb=!1'), '');
assert.equal(googleEmbedUrl('https://www.google.com/maps/embed/v1/place?key=secret&q=test'), '');
assert.equal(googleEmbedUrl('https://www.google.com/maps/embed?pb=' + '!'.repeat(5000)), '');
const embed = googleEmbedUrl(
  '<iframe src="https://www.google.com/maps/embed?pb=!1m2!2m1&amp;evil=ignored" onload="alert(1)"></iframe>',
);
assert.ok(embed.startsWith('https://www.google.com/maps/embed?pb='));
assert.ok(!embed.includes('evil'));
assert.deepEqual(normalizeMaps([{ ...google, embedUrl: embed, injected: '<script>' }]), [
  { ...google, embedUrl: embed },
]);
assert.equal(new URL(mapSearchUrl(google)).searchParams.get('query'), '서울시청');
assert.ok(mapSearchUrl(kakao).startsWith('https://map.kakao.com/link/map/'));
assert.equal(new URL(mapFrameUrl(kakao), 'https://example.com').searchParams.get('lat'), '37.5665');
const hostile = { provider: 'google', address: '</title><script>alert(1)</script>' };
const html = mapDocument(hostile, { googleEmbedKey: 'a'.repeat(32) });
assert.ok(!html.includes('</title><script>'));
assert.ok(html.includes('https://www.google.com/maps/embed/v1/place?'));
assert.ok(html.includes('strict-origin-when-cross-origin'));
assert.ok(
  mapDocument(kakao, { kakaoJavaScriptKey: 'a'.repeat(32) }).includes(
    'new kakao.maps.LatLng(37.5665,126.978)',
  ),
);
assert.ok(mapDocument({ ...google, embedUrl: embed }, {}).includes(embed.replaceAll('&', '&amp;')));
assert.ok(mapDocument(google, {}).includes('삽입 키 또는 지도 퍼가기 주소'));
let calls = 0;
const results = await searchMapAddress('서울시청', 'server-private-key', async (url, options) => {
  assert.equal(url.origin, 'https://dapi.kakao.com');
  assert.ok(!url.href.includes('server-private-key'));
  assert.equal(options.headers.Authorization, 'KakaoAK server-private-key');
  calls++;
  return {
    ok: true,
    json: async () => ({
      documents:
        calls === 1
          ? []
          : [
              {
                place_name: '서울시청',
                road_address_name: kakao.address,
                x: '126.978',
                y: '37.5665',
              },
            ],
    }),
  };
});
assert.equal(calls, 2);
assert.equal(results[0].address, kakao.address);
assert.equal(results[0].lat, 37.5665);
await assert.rejects(searchMapAddress('서울시청', ''), /키가 등록/);
await assert.rejects(
  searchMapAddress('서울시청', 'key', async () => ({ ok: false })),
  /활성화/,
);
console.log(
  'PASS: map provider/coordinate limits, Google embed allowlist, credential-free links, iframe escaping and bounded Kakao address/keyword lookup',
);
