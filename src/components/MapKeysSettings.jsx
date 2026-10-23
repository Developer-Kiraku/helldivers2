'use client';
import { useState } from 'react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label } from './ui';
export default function MapKeysSettings({ initial = {}, origin = '' }) {
  const { api, notify } = useCommunity();
  const [kakao, setKakao] = useState(initial.kakaoJavaScriptKey || ''),
    [google, setGoogle] = useState(initial.googleEmbedKey || ''),
    [saved, setSaved] = useState(initial),
    [visible, setVisible] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState('');
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api('admin/api-keys', {
        method: 'PATCH',
        body: { kakaoMapsJavaScriptKey: kakao, googleMapsEmbedKey: google },
      });
      setSaved(result.maps);
      setKakao(result.maps.kakaoJavaScriptKey);
      setGoogle(result.maps.googleEmbedKey);
      notify('지도 키 설정을 저장했습니다.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel api-key-panel" onSubmit={save}>
      <header>
        <h2>지도 첨부</h2>
        <Button type="button" onClick={() => setVisible(!visible)}>
          {visible ? '키 숨기기' : '키 보기'}
        </Button>
      </header>
      <div className="api-key-status">
        <Label htmlFor="kakao-map-key">카카오맵 JavaScript 키</Label>
        <strong>{saved.kakaoJavaScriptKey ? '키 등록됨' : '키 없음'}</strong>
      </div>
      <Input
        id="kakao-map-key"
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        value={kakao}
        onChange={(e) => setKakao(e.target.value)}
        maxLength={32}
      />
      <div className="api-key-status">
        <Label htmlFor="google-map-key">Google Maps Embed API 키</Label>
        <strong>{saved.googleEmbedKey ? '키 등록됨' : '키 없음 · 지도 퍼가기 사용 가능'}</strong>
      </div>
      <Input
        id="google-map-key"
        type={visible ? 'text' : 'password'}
        autoComplete="off"
        spellCheck={false}
        value={google}
        onChange={(e) => setGoogle(e.target.value)}
        maxLength={200}
      />
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      <div className="api-key-actions">
        <Button type="submit" disabled={busy}>
          {busy ? '저장 중…' : '지도 키 저장'}
        </Button>
        <a
          href="https://developers.kakao.com/console/app/1613089/product/kakao-map"
          target="_blank"
          rel="noopener noreferrer"
        >
          카카오맵 활성화 설정 ↗
        </a>
        <a
          href="https://developers.kakao.com/console/app/1613089/config/platform-key"
          target="_blank"
          rel="noopener noreferrer"
        >
          카카오 JavaScript 키·도메인 설정 ↗
        </a>
        <a
          href="https://console.cloud.google.com/google/maps-apis/credentials"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google 지도 키 설정 ↗
        </a>
      </div>
      <details>
        <summary>지도 키 설정 방법</summary>
        <p>
          카카오맵 사용 설정을 ON으로 바꾸고 위 입력란에 JavaScript 키를 저장하세요. 해당 키의
          JavaScript SDK 도메인에는 아래 운영 사이트 주소를 등록하세요.
        </p>
        <code>{origin || 'https://helldivers2.onrender.com'}</code>
        <p>
          주소 검색에는 서버 환경변수 KAKAO_REST_API_KEY를 사용합니다. 지도 표시에는 JavaScript 키가
          필요합니다.
        </p>
        <p>
          Google 키는 Maps Embed API를 활성화하고 웹사이트 제한에 운영 사이트 도메인을 등록하세요.
          키가 없어도 작성 화면에서 Google 지도의 ‘지도 퍼가기’ HTML로 첨부할 수 있습니다.
        </p>
      </details>
    </form>
  );
}
