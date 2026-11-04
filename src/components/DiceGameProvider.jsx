'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Dices, Timer } from 'lucide-react';
import { useCommunity } from './CommunityProvider';
import Modal from './Modal';
import { Button } from './ui';
import { diceInviteMs, dicePollDelay } from '@/lib/dice-rules.mjs';

const DiceContext = createContext(null);
export const useDiceGame = () => useContext(DiceContext);
export default function DiceGameProvider({ children, enabled = true }) {
  const { user, role, actualRole, api, syncPoints } = useCommunity();
  const pathname = usePathname(),
    router = useRouter();
  const onGame = pathname === '/games/dice' || pathname === '/test-user';
  const [data, setData] = useState(null),
    [pendingInvite, setPendingInvite] = useState(null),
    [error, setError] = useState(''),
    [connectionError, setConnectionError] = useState(''),
    [busy, setBusy] = useState(false),
    [now, setNow] = useState(Date.now);
  const tabId = useRef(null),
    presenceSequence = useRef(0),
    epoch = useRef(0),
    offset = useRef(0),
    alive = useRef(false),
    command = useRef(null),
    latest = useRef(null),
    activeGame = useRef(false);
  const apply = useCallback(
    (result) => {
      if (result.viewerId !== user?.id) return false;
      if (result.game && !result.game.players.some((player) => player.id === user.id)) return false;
      if (
        latest.current &&
        (result.serverTime < latest.current.serverTime ||
          (result.game?.id === latest.current.game?.id &&
            result.game?.revision < latest.current.game?.revision))
      )
        return false;
      latest.current = result;
      activeGame.current =
        ['invited', 'playing', 'revealing'].includes(result.game?.status) ||
        Boolean(result.game?.autoContinue);
      offset.current = result.serverTime - Date.now();
      setNow(result.serverTime);
      setData(result);
      syncPoints(user.id, result.points);
      return true;
    },
    [syncPoints, user?.id],
  );
  useEffect(() => {
    setData(null);
    setPendingInvite(null);
    latest.current = null;
    activeGame.current = false;
    command.current = null;
    if (!enabled || !user?.id || actualRole !== role) {
      setData(null);
      return;
    }
    tabId.current ||= crypto.randomUUID();
    alive.current = true;
    setBusy(false);
    let active = true,
      timer,
      running = false,
      refreshPending = false,
      away = false;
    const update = async () => {
      if (!active || away) return;
      clearTimeout(timer);
      if (running) {
        refreshPending = true;
        return;
      }
      if (command.current) {
        timer = setTimeout(update, 1000);
        return;
      }
      refreshPending = false;
      running = true;
      const requestEpoch = epoch.current;
      try {
        const result = await api('games/dice/presence', {
          method: 'POST',
          keepalive: document.visibilityState === 'hidden' || !document.hasFocus(),
          body: {
            tabId: tabId.current,
            sequence: ++presenceSequence.current,
            page: onGame ? 'dice' : 'site',
            visible: document.visibilityState !== 'hidden',
            focused: document.hasFocus(),
          },
        });
        if (active && requestEpoch === epoch.current && !command.current) {
          apply(result);
          setConnectionError('');
        }
      } catch (err) {
        if (active && onGame) setConnectionError(err.message);
      } finally {
        running = false;
        if (active && !away)
          timer = setTimeout(
            update,
            refreshPending
              ? 0
              : dicePollDelay({
                  onGame,
                  visible: document.visibilityState !== 'hidden',
                  activeGame: activeGame.current,
                }),
          );
      }
    };
    const refreshPresence = () => {
      void update();
    };
    const returnToPage = () => {
      away = false;
      refreshPresence();
    };
    const leaveDocument = () => {
      away = true;
      clearTimeout(timer);
      void api('games/dice/presence', {
        method: 'POST',
        keepalive: true,
        body: {
          tabId: tabId.current,
          sequence: ++presenceSequence.current,
          page: 'away',
          visible: false,
          focused: false,
        },
      }).catch(() => {});
    };
    void update();
    document.addEventListener('visibilitychange', refreshPresence);
    window.addEventListener('focus', refreshPresence);
    window.addEventListener('blur', refreshPresence);
    window.addEventListener('pageshow', returnToPage);
    window.addEventListener('pagehide', leaveDocument);
    return () => {
      active = false;
      alive.current = false;
      ++epoch.current;
      clearTimeout(timer);
      document.removeEventListener('visibilitychange', refreshPresence);
      window.removeEventListener('focus', refreshPresence);
      window.removeEventListener('blur', refreshPresence);
      window.removeEventListener('pageshow', returnToPage);
      window.removeEventListener('pagehide', leaveDocument);
    };
  }, [enabled, user?.id, role, actualRole, onGame, api, apply]);
  useEffect(() => {
    if (
      !enabled ||
      !user?.id ||
      (!onGame && !['invited', 'playing', 'revealing'].includes(data?.game?.status))
    )
      return;
    const timer = setInterval(() => setNow(Date.now() + offset.current), 100);
    return () => clearInterval(timer);
  }, [enabled, user?.id, onGame, data?.game?.status]);
  const act = async (action, body = {}) => {
    if (command.current || !enabled || role !== actualRole) return;
    const requestEpoch = ++epoch.current;
    command.current = requestEpoch;
    if (action === 'invite') {
      const target = data?.online.find((player) => player.id === body.targetId);
      setPendingInvite({ targetId: body.targetId, nickname: target?.nickname || '선택한 대원' });
    }
    setBusy(true);
    setError('');
    try {
      const result = await api('games/dice/' + action, {
        method: 'POST',
        body: { ...body, tabId: tabId.current },
      });
      if (!alive.current || requestEpoch !== epoch.current) return;
      if (apply(result) && action === 'accept' && !onGame) router.push('/games/dice');
    } catch (err) {
      if (alive.current && requestEpoch === epoch.current) setError(err.message);
    } finally {
      if (command.current === requestEpoch) {
        command.current = null;
        if (alive.current && requestEpoch === epoch.current) {
          setBusy(false);
          setPendingInvite(null);
        }
      }
    }
  };
  const visibleData = enabled && role === actualRole && data?.viewerId === user?.id ? data : null;
  const invite =
    visibleData?.game?.status === 'invited' &&
    visibleData.game.receivedAt &&
    visibleData.game.hostId !== user?.id &&
    now < visibleData.game.expiresAt
      ? visibleData.game
      : null;
  const host = invite?.players.find((player) => player.id === invite.hostId);
  return (
    <DiceContext.Provider
      value={{
        data: visibleData,
        pendingInvite: visibleData ? pendingInvite : null,
        error: error || connectionError,
        busy,
        now,
        act,
        tabId: tabId.current,
      }}
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
                disabled={busy || visibleData.points.current < invite.stake}
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
          {visibleData.points.current < invite.stake && (
            <p className="form-error" role="status">
              최소 베팅액보다 보유 포인트가 부족하여 참여할 수 없습니다.
            </p>
          )}
          <p className="dice-invite-count">
            <Timer size={15} /> {Math.max(0, (invite.expiresAt - now) / 1000).toFixed(1)}초 후
            자동으로 닫힙니다.
          </p>
          <div className="dice-invite-progress">
            <span
              style={{
                width:
                  Math.min(100, Math.max(0, ((invite.expiresAt - now) / diceInviteMs) * 100)) + '%',
              }}
            />
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
