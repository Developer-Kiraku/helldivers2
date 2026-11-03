'use client';
import { useEffect, useState } from 'react';
import { useCommunity } from './CommunityProvider';
import { Button, Input, Label } from './ui';
const fields = [
  ['post', '게시글 작성'],
  ['comment', '댓글 작성'],
  ['like', '추천 · 누른 회원과 작성자 각각'],
  ['daily', '하루 첫 접속'],
  ['bonusMultiplier', '공략브리핑 · 로드아웃 · 티어 메이커 배율'],
];
export default function PointSettings() {
  const { api, notify } = useCommunity();
  const [settings, setSettings] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let active = true;
    api('admin/settings/points')
      .then((data) => {
        if (active) setSettings(data.settings);
      })
      .catch((err) => {
        if (active) setError(err.message);
      });
    return () => {
      active = false;
    };
  }, [api]);
  async function save(event) {
    event.preventDefault();
    setBusy(true);
    setError('');
    try {
      const data = await api('admin/settings/points', { method: 'PATCH', body: settings });
      setSettings(data.settings);
      notify('포인트 설정을 저장했습니다.');
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  }
  return (
    <form className="panel api-key-panel point-settings" onSubmit={save}>
      <header>
        <h2>포인트 적립 설정</h2>
        <span className="eyebrow">POINTS</span>
      </header>
      <p>
        변경한 기준은 이후 적립부터 적용됩니다. 삭제·추천 취소 시에는 당시 적립 금액을 회수합니다.
      </p>
      {error && (
        <p className="form-error" role="alert">
          {error}
        </p>
      )}
      {!settings && !error && <p role="status">설정을 불러오는 중…</p>}
      {settings && (
        <>
          <div className="point-settings-grid">
            {fields.map(([field, label]) => (
              <Label key={field}>
                {label}
                <div>
                  <Input
                    type="number"
                    min={field === 'bonusMultiplier' ? 1 : 0}
                    max={field === 'bonusMultiplier' ? 100 : 1000000}
                    step={1}
                    required
                    value={settings[field]}
                    disabled={busy}
                    onChange={(event) =>
                      setSettings({
                        ...settings,
                        [field]: event.target.value === '' ? '' : Number(event.target.value),
                      })
                    }
                  />
                  <span>{field === 'bonusMultiplier' ? '배' : 'P'}</span>
                </div>
              </Label>
            ))}
          </div>
          <p>
            하루 기준은 한국 시간 00시입니다. 본인 글·댓글에 누른 추천은 포인트 적립에서 제외됩니다.
          </p>
          <Button type="submit" disabled={busy}>
            {busy ? '저장 중…' : '포인트 설정 저장'}
          </Button>
        </>
      )}
    </form>
  );
}
