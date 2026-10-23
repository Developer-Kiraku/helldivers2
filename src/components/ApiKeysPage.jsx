'use client';
import { useEffect, useState } from 'react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label } from './ui';
import MapKeysSettings from './MapKeysSettings';
export default function ApiKeysPage() {
  const { api, role, notify } = useCommunity();
  const [data, setData] = useState(null),
    [key, setKey] = useState(''),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false),
    [visible, setVisible] = useState(false);
  useEffect(() => {
    if (role !== 'operator') return;
    let alive = true;
    api('admin/api-keys')
      .then((result) => {
        if (alive) {
          setData(result);
          setKey(result.kakao.javaScriptKey);
        }
      })
      .catch((e) => {
        if (alive) setError(e.message);
      });
    return () => {
      alive = false;
    };
  }, [api, role]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const result = await api('admin/api-keys', { method: 'PATCH', body: { javaScriptKey: key } });
      setData(result);
      setKey(result.kakao.javaScriptKey);
      notify('API 키 설정을 저장했습니다.');
    } catch (e) {
      setError(e.message);
    } finally {
      setBusy(false);
    }
  }
  if (role !== 'operator')
    return (
      <section className="access-panel">
        <h1>메인 운영자 전용입니다.</h1>
      </section>
    );
  return (
    <section className="admin-page api-keys-page">
      <h1>API 키 관리</h1>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!data ? (
        <p role="status">{error ? '설정을 불러오지 못했습니다.' : '설정 확인 중…'}</p>
      ) : (
        <>
          <form className="panel api-key-panel" onSubmit={save}>
            <header>
              <h2>카카오톡 공유</h2>
              <strong role="status">
                {data.kakao.configured ? '키 등록됨' : '키 없음 · 공유 사용 불가'}
              </strong>
            </header>
            <p>JavaScript 키 · {data.kakao.source}</p>
            <Label htmlFor="kakao-javascript-key">공유용 JavaScript 키</Label>
            <div className="api-key-input">
              <Input
                id="kakao-javascript-key"
                value={key}
                type={visible ? 'text' : 'password'}
                autoComplete="off"
                spellCheck={false}
                maxLength={32}
                onChange={(e) => setKey(e.target.value)}
              />
              <Button type="button" onClick={() => setVisible(!visible)}>
                {visible ? '숨기기' : '보기'}
              </Button>
            </div>
            <p>키 등록 여부이며 실제 공유 성공을 의미하지는 않습니다.</p>
            <div className="api-key-actions">
              <Button type="submit" disabled={busy}>
                {busy ? '저장 중…' : '저장'}
              </Button>
              <a
                href="https://developers.kakao.com/console/app/1613089/config/platform-key"
                target="_blank"
                rel="noopener noreferrer"
              >
                카카오 개발자 설정 ↗
              </a>
            </div>
            <details>
              <summary>공유가 안 될 때 확인</summary>
              <p>
                JavaScript 키의 SDK 도메인과 제품 링크 관리의 웹 도메인에 아래 주소를 등록하세요.
              </p>
              <code>{data.origin || '현재 운영 사이트 주소'}</code>
              <p>
                PC에서는 브라우저 팝업을 허용하고 카카오톡에 연결된 계정으로 로그인하세요. 키를 비워
                저장하면 공유가 비활성화됩니다.
              </p>
            </details>
          </form>
          <MapKeysSettings initial={data.maps} origin={data.origin} />
          <section className="panel api-key-panel">
            <h2>서버 키 상태</h2>
            {data.serverKeys.map((item) => (
              <div className="api-key-status" key={item.name}>
                <span>
                  {item.name}
                  {item.optional ? ' (선택)' : ''}
                </span>
                <strong>{item.configured ? '등록됨' : '없음'}</strong>
              </div>
            ))}
            <p>서버 비밀 키는 Render 환경변수에서 관리합니다.</p>
            <a href="https://dashboard.render.com" target="_blank" rel="noopener noreferrer">
              Render 설정 열기 ↗
            </a>
          </section>
        </>
      )}
    </section>
  );
}
