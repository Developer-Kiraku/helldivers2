'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Dices, Timer } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import Modal from './Modal';
import { Button } from './ui';

const DiceContext = createContext(null);
export const useDiceGame = () => useContext(DiceContext);
export default function DiceGameProvider({ children, enabled = true }) {
  const { user, role, actualRole, api, syncPoints } = useCommunity();
  const pathname = usePathname(),
    router = useRouter();
  const onGame = pathname === '/games/dice';
  const [data, setData] = useState(null),
    [error, setError] = useState(''),
    [connectionError, setConnectionError] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now);
  const tabId = useRef(null),
    epoch = useRef(0),
    offset = useRef(0),
    alive = useRef(false);
  const apply = useCallback(
    (result) => {
      offset.current = result.serverTime - Date.now();
      setNow(result.serverTime);
      setData(result);
      syncPoints(user.id, result.points);
    },
    [syncPoints, user?.id],
  );
  useEffect(() => {
    if (!enabled || !user?.id || actualRole !== role) {
      setData(null);
      return;
    }
    tabId.current ||= crypto.randomUUID();
    alive.current = true;
    setBusy(false);
    let active = true,
      timer,
      running = false;
    const update = async () => {
      if (!active || running) return;
      running = true;
      const requestEpoch = epoch.current;
      try {
        const result = await api('games/dice/presence', {
          method: 'POST',
          body: {
            tabId: tabId.current,
            page: onGame ? 'dice' : 'site',
            visible: document.visibilityState !== 'hidden',
          },
        });
        if (active && requestEpoch === epoch.current) {
          apply(result);
          setConnectionError('');
        }
      } catch (err) {
        if (active && onGame) setConnectionError(err.message);
      } finally {
        running = false;
        if (active) timer = setTimeout(update, document.visibilityState === 'hidden' ? 5000 : 1000);
      }
    };
    const returnToPage = () => {
      if (document.visibilityState !== 'hidden') {
        clearTimeout(timer);
        void update();
      }
    };
    void update();
    document.addEventListener('visibilitychange', returnToPage);
    return () => {
      active = false;
      alive.current = false;
      ++epoch.current;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', returnToPage);
    };
  }, [enabled, user?.id, role, actualRole, onGame, api, apply]);
  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now() + offset.current), 100);
    return () => clearInterval(timer);
  }, []);
  const act = async (action, body = {}) => {
    if (busy || !enabled || role !== actualRole) return;
    const requestEpoch = ++epoch.current;
    setBusy(true);
    setError('');
    try {
      const result = await api('games/dice/' + action, {
        method: 'POST',
        body: { ...body, tabId: tabId.current },
      });
      if (!alive.current || requestEpoch !== epoch.current) return;
      apply(result);
      if (action === 'accept' && !onGame) router.push('/games/dice');
    } catch (err) {
      if (alive.current) setError(err.message);
    } finally {
      if (alive.current) setBusy(false);
    }
  };
  const invite =
    data?.game?.status === 'invited' && data.game.hostId !== user?.id && now < data.game.expiresAt
      ? data.game
      : null;
  const host = invite?.players.find((player) => player.id === invite.hostId);
  return (
    <DiceContext.Provider
      value={{ data, error: error || connectionError, busy, now, act, tabId: tabId.current }}
    >
      {children}
      {enabled && invite && (
        <Modal
          title="민주주의 주사위 초대"
          className="dice-invite-modal"
          onClose={() => act('decline', { gameId: invite.id })}
          footer={
            <>
              <Button
                type="button"
                disabled={busy}
                onClick={() => act('decline', { gameId: invite.id })}
              >
                거절
              </Button>
              <Button
                type="button"
                disabled={busy}
                onClick={() => act('accept', { gameId: invite.id })}
              >
                초대 수락
              </Button>
            </>
          }
        >
          <div className="dice-invite-symbol">
            <Dices size={40} />
          </div>
          <p>
            <strong>{host?.nickname}</strong>님이 민주주의 주사위에 초대했습니다.
          </p>
          <div className="dice-invite-stake">
            최소 베팅 <strong>{invite.stake.toLocaleString()} P</strong>
          </div>
          <p className="dice-invite-count">
            <Timer size={15} /> {Math.max(0, (invite.expiresAt - now) / 1000).toFixed(1)}초 후
            자동으로 닫힙니다.
          </p>
          <div className="dice-invite-progress">
            <span style={{ width: Math.max(0, (invite.expiresAt - now) / 50) + '%' }} />
          </div>
          {error && (
            <p role="alert" className="form-error">
              {error}
            </p>
          )}
        </Modal>
      )}
    </DiceContext.Provider>
  );
}
