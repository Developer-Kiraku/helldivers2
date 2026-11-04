'use client';

import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { canManagePosts } from '@/lib/post-access.mjs';
import PageSkeleton from './PageSkeleton';
import useRefreshOnReturn from '../hooks/useRefreshOnReturn';
const CommunityContext = createContext(null);
const emptyPosts = {
  tierlist: [],
  loadout: [],
  notice: [],
  report: [],
  guide: [],
  talk: [],
  qna: [],
  helstagram: [],
};

export function CommunityProvider({ children, initialUser = null, apiPrefix = '' }) {
  const [user, setUser] = useState(initialUser),
    [posts, setPosts] = useState(emptyPosts),
    [stats, setStats] = useState({ totalMembers: 0, onlineMembers: 0 }),
    [ready, setReady] = useState(false),
    [toast, setToast] = useState('');
  const [unreadMessages, setUnreadMessages] = useState(0);
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const router = useRouter(),
    pathname = usePathname(),
    timer = useRef(null),
    refreshSequence = useRef(0);
  const [loadedPath, setLoadedPath] = useState(null);
  const [managementMode, setManagementMode] = useState(false);
  const [desktopMode, setDesktopMode] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);
  const authPage = pathname === '/login' || pathname === '/signup';
  const clearSession = useCallback(() => {
    // Discard any older bootstrap response still in flight when a session ends.
    ++refreshSequence.current;
    setUser(null);
    setPosts(emptyPosts);
    setStats({ totalMembers: 0, onlineMembers: 0 });
    setUnreadMessages(0);
    setUnreadNotifications(0);
    setManagementMode(false);
  }, []);
  useEffect(() => {
    if (ready && !user && !authPage) router.replace('/login');
  }, [ready, user, authPage, router]);
  useEffect(() => {
    setManagementMode(false);
  }, [pathname, user?.role, desktopMode]);
  const notify = useCallback((message) => {
    clearTimeout(timer.current);
    setToast(message);
    timer.current = setTimeout(() => setToast(''), 3500);
  }, []);
  const updatePostViews = useCallback((postId, views) => {
    setPosts((current) =>
      Object.fromEntries(
        Object.entries(current).map(([board, items]) => [
          board,
          items.map((post) =>
            post.id === postId ? { ...post, views: Math.max(post.views || 0, views) } : post,
          ),
        ]),
      ),
    );
  }, []);
  const syncPoints = useCallback((userId, points) => {
    setUser((current) =>
      current?.id === userId &&
      (current.points?.current !== points.current || current.points?.total !== points.total)
        ? { ...current, points }
        : current,
    );
  }, []);
  const api = useCallback(
    async (path, options = {}) => {
      const response = await fetch(`/api/${apiPrefix}${path}`, {
        ...options,
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json', ...options.headers },
        body: options.body === undefined ? undefined : JSON.stringify(options.body),
      });
      const data = await response.json();
      if (!response.ok) {
        if (response.status === 401 && !path.startsWith('auth/')) {
          clearSession();
          router.replace('/login');
          router.refresh();
        }
        throw new Error(data.error || '요청을 처리하지 못했습니다.');
      }
      return data;
    },
    [router, clearSession, apiPrefix],
  );
  const refresh = useCallback(async () => {
    const sequence = ++refreshSequence.current;
    try {
      const response = await fetch('/api/' + apiPrefix + 'bootstrap', { cache: 'no-store' });
      if (sequence !== refreshSequence.current) return;
      if (response.status === 401) {
        clearSession();
        setReady(true);
        setLoadedPath(pathname);
        return;
      }
      const data = await response.json();
      if (sequence !== refreshSequence.current) return;
      if (!response.ok) throw new Error(data.error);
      setUser(data.user);
      setUnreadMessages(data.unreadMessages || 0);
      setUnreadNotifications(data.unreadNotifications || 0);
      setPosts(data.posts);
      setStats(data.stats);
    } catch (error) {
      if (sequence === refreshSequence.current)
        notify(error.message || '데이터를 불러오지 못했습니다.');
    } finally {
      if (sequence === refreshSequence.current) {
        setReady(true);
        setLoadedPath(pathname);
      }
    }
  }, [notify, pathname, clearSession, apiPrefix]);
  useEffect(() => {
    refresh();
  }, [refresh, pathname]);
  useRefreshOnReturn(refresh, Boolean(user?.id));
  useEffect(() => () => clearTimeout(timer.current), []);
  useEffect(() => {
    if (!user?.id) {
      setUnreadMessages(0);
      return;
    }
    let alive = true;
    const update = async () => {
      if (document.visibilityState === 'hidden') return;
      try {
        const response = await fetch('/api/' + apiPrefix + 'activity/unread', {
          cache: 'no-store',
        });
        if (response.status === 401 && alive) {
          await refresh();
          return;
        }
        if (response.ok && alive) {
          const data = await response.json();
          if (alive) {
            setUnreadMessages(data.messages);
            setUnreadNotifications(data.notifications);
          }
        }
      } catch {
        /* A temporary connection failure must not interrupt the current page. */
      }
    };
    const timer = setInterval(update, 30000);
    return () => {
      alive = false;
      clearInterval(timer);
    };
  }, [user?.id, refresh, apiPrefix]);
  useEffect(() => {
    if (!user?.mutedUntil) return;
    let timeout;
    function checkExpiry() {
      const remaining = Date.parse(user.mutedUntil) - Date.now();
      if (remaining <= 0) refresh();
      else timeout = setTimeout(checkExpiry, Math.min(remaining, 86400000));
    }
    checkExpiry();
    return () => clearTimeout(timeout);
  }, [user?.mutedUntil, refresh]);
  async function login(loginId, password) {
    await api('auth/login', { method: 'POST', body: { loginId, password } });
    await refresh();
    router.replace('/');
    router.refresh();
  }
  async function logout() {
    try {
      await api('auth/logout', { method: 'POST' });
      clearSession();
      router.replace('/login');
      router.refresh();
    } catch (error) {
      notify(error.message);
    }
  }
  async function updateProfile(changes) {
    const data = await api('profile', { method: 'PATCH', body: changes });
    setUser(data.user);
    await refresh();
    return data.user;
  }
  async function addPost(board, draft) {
    const data = await api('posts', { method: 'POST', body: { ...draft, board } });
    await refresh();
    return data.post.id;
  }
  async function setViewRole(role) {
    const data = await api('profile/view-role', { method: 'POST', body: { role } });
    setUser(data.user);
    await refresh();
    router.refresh();
  }
  const signedIn = Boolean(user),
    role = user?.role || null,
    profile = user ? { nickname: user.nickname, photo: user.photo } : { nickname: '', photo: '' };
  return (
    <CommunityContext.Provider
      value={{
        user,
        managementMode: managementMode && desktopMode && canManagePosts(user),
        setManagementMode,
        desktopMode,
        setDesktopMode,
        signedIn,
        role,
        actualRole: user?.actualRole || role,
        setViewRole,
        profile,
        posts,
        stats,
        unreadMessages,
        setUnreadMessages,
        unreadNotifications,
        setUnreadNotifications,
        ready: ready && loadedPath === pathname,
        notify,
        api,
        refresh,
        updatePostViews,
        syncPoints,
        login,
        logout,
        updateProfile,
        addPost,
        canWriteNotice: signedIn && ['operator', 'deputy'].includes(role),
      }}
    >
      {/* Let server page guards resolve before hiding stale client-side content. */}
      {!hydrated || user || authPage ? children : <PageSkeleton />}
      {toast && (
        <div className="toast" role="status">
          {toast}
        </div>
      )}
    </CommunityContext.Provider>
  );
}
export function useCommunity() {
  const context = useContext(CommunityContext);
  if (!context) throw Error('CommunityProvider is required');
  return context;
}
