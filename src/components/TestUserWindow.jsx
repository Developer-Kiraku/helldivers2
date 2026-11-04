'use client';
import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { CommunityProvider } from './CommunityProvider';
import DiceGameProvider from './DiceGameProvider';
import DiceGame from './DiceGame';
import { Button } from './ui';
export default function TestUserWindow() {
  const [player, setPlayer] = useState(null),
    [error, setError] = useState(''),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    fetch('/api/admin/test-player/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: '{}',
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) throw Error(data.error);
        if (alive) setPlayer(data.user);
      })
      .catch((err) => {
        if (alive) setError(err.message);
      });
    return () => {
      alive = false;
    };
  }, []);
  return (
    <main className="test-user-window" id="main-content">
      <header className="test-user-toolbar">
        <div>
          <FlaskConical size={21} />
          <span>
            <strong>{player?.nickname || '테스트 유저'}</strong>
            <small>일반회원 · 원래 창의 총관리자와 대결할 수 있습니다.</small>
          </span>
        </div>
        <Button
          type="button"
          role="switch"
          aria-checked="true"
          aria-label="테스트 유저"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            try {
              const response = await fetch('/api/admin/test-player/stop', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: '{}',
              });
              const data = await response.json();
              if (!response.ok) throw Error(data.error);
              window.location.replace('/games/dice');
            } catch (err) {
              setError(err.message);
              setBusy(false);
            }
          }}
        >
          테스트 유저 ON · 종료
        </Button>
      </header>
      {error && (
        <p role="alert" className="form-error">
          {error}
        </p>
      )}
      {!player && !error && <p role="status">일반회원 테스트 유저로 전환하고 있습니다…</p>}
      {player && (
        <CommunityProvider initialUser={player} apiPrefix="test-player/">
          <DiceGameProvider>
            <DiceGame />
          </DiceGameProvider>
        </CommunityProvider>
      )}
    </main>
  );
}
