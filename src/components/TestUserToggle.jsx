'use client';
import { useEffect, useState } from 'react';
import { FlaskConical } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import { Button } from './ui';
export default function TestUserToggle() {
  const { api, notify } = useCommunity();
  const [active, setActive] = useState(false),
    [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    const update = () => {
      if (document.visibilityState !== 'hidden')
        api('admin/test-player/status')
          .then((result) => {
            if (alive) setActive(result.active);
          })
          .catch(() => {});
    };
    update();
    const timer = setInterval(update, 3000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [api]);
  return (
    <Button
      type="button"
      className={'test-user-toggle' + (active ? ' is-active' : '')}
      role="switch"
      aria-checked={active}
      aria-label="테스트 유저"
      disabled={busy}
      onClick={async () => {
        if (!active) {
          const child = window.open('/test-user', 'helldivers-test-user');
          if (child) child.opener = null;
          else notify('테스트 창을 열 수 없습니다. 브라우저 팝업을 허용해주세요.');
        } else {
          setBusy(true);
          try {
            await api('admin/test-player/stop', { method: 'POST' });
            setActive(false);
          } catch (err) {
            notify(err.message);
          } finally {
            setBusy(false);
          }
        }
      }}
    >
      <FlaskConical size={16} />
      <span>테스트 유저</span>
      <i aria-hidden="true" />
    </Button>
  );
}
