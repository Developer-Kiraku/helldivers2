import { mapSearchUrl } from '../post-maps.mjs';
const escape = (value) =>
  String(value)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
export function mapDocument(map, settings) {
  const link = mapSearchUrl(map);
  const fallback = `<div id="fallback" role="status"><p>지도를 불러오지 못했습니다. 지도 서비스에서 위치를 확인해주세요.</p><a href="${escape(link)}" target="_blank" rel="noopener noreferrer">${escape(map.address)} 지도에서 보기 ↗</a></div>`;
  let body;
  if (map.provider === 'kakao' && map.url) {
    body = `<div id="fallback"><p>첨부한 위치를 카카오맵에서 확인하세요.</p><a href="${escape(link)}" target="_blank" rel="noopener noreferrer">${escape(map.address)} ↗</a></div>`;
  } else if (map.provider === 'google') {
    const src =
      map.embedUrl ||
      (settings.googleEmbedKey
        ? `https://www.google.com/maps/embed/v1/place?${new URLSearchParams({ key: settings.googleEmbedKey, q: map.address, language: 'ko' })}`
        : '');
    body = src
      ? `<iframe src="${escape(src)}" title="${escape(map.address)} 지도" loading="lazy" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe>`
      : '<p>구글맵 삽입 키 또는 지도 퍼가기 주소가 필요합니다.</p>' + fallback;
  } else if (!settings.kakaoJavaScriptKey) {
    body = '<p>카카오맵 키가 등록되지 않았습니다.</p>' + fallback;
  } else {
    const sdk = `https://dapi.kakao.com/v2/maps/sdk.js?${new URLSearchParams({ appkey: settings.kakaoJavaScriptKey, autoload: 'false' })}`;
    body = `<div id="map"></div>${fallback}<script src="${escape(sdk)}" referrerpolicy="strict-origin-when-cross-origin"></script><script>
      const fallback = document.getElementById('fallback');
      function fail() { document.getElementById('map').style.display = 'none'; fallback.style.display = 'grid'; }
      try {
        if (!window.kakao?.maps) fail();
        else { fallback.style.display = 'none'; const timeout = setTimeout(fail, 15000);
          kakao.maps.load(function() { try { clearTimeout(timeout); const center = new kakao.maps.LatLng(${map.lat},${map.lng});
            const canvas = document.getElementById('map'); const map = new kakao.maps.Map(canvas, {center, level:3});
            new kakao.maps.Marker({position:center, map}); map.addControl(new kakao.maps.ZoomControl(), kakao.maps.ControlPosition.RIGHT);
            new ResizeObserver(function(){ map.relayout(); map.setCenter(center); }).observe(canvas);
          } catch(error) { fail(); } });
        }
      } catch(error) { fail(); }
    </script>`;
  }
  return `<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escape(map.address)} 지도</title><style>html,body,#map{height:100%;margin:0}body{font-family:system-ui}iframe{width:100%;height:100%;border:0}#fallback{padding:1em;box-sizing:border-box;align-content:center;height:100%}</style></head><body>${body}</body></html>`;
}
