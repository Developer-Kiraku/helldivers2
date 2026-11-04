'use client';
import Nickname from './Nickname';
import { Button, Select } from './ui';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Avatar from './Avatar';
import Icon from './Icon';
import { useCommunity } from './CommunityProvider';
import { DiscordLink, KakaoChatLink } from './CommunityLinks';
import { roleLabels } from '@/lib/roles';
import { LogIn, LogOut, Menu, ShieldCheck, Bell } from 'lucide-react';
import { Popover } from '@radix-ui/themes';
import NotificationInbox from './NotificationInbox';
import Modal from './Modal';
import MobileBottomNav from './MobileBottomNav';
import NavigationGroups from './NavigationGroups';
import { navigationGroups } from '@/lib/navigation.mjs';
import DiceGameProvider from './DiceGameProvider';
import TestUserToggle from './TestUserToggle';

function NotificationBell({ mobile = false }) {
  const { unreadNotifications = 0 } = useCommunity();
  const [open, setOpen] = useState(false);
  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger>
        <button
          type="button"
          className={mobile ? 'mobile-message-link mobile-notification-link' : 'notification-link'}
          aria-label={`최근 알림, 안 읽은 알림 ${unreadNotifications}개`}
        >
          <Bell size={mobile ? 22 : 17} aria-hidden="true" />
          {!mobile && '알림'}
          {unreadNotifications > 0 && (
            <span className="message-nav-count">
              {unreadNotifications > 99 ? '99+' : unreadNotifications}
            </span>
          )}
        </button>
      </Popover.Trigger>
      <Popover.Content
        className="notification-popover"
        aria-label="최근 알림"
        align={mobile ? 'start' : 'end'}
        sideOffset={8}
        collisionPadding={10}
      >
        <h2>최근 알림</h2>
        <NotificationInbox compact onNavigate={() => setOpen(false)} />
        <Link
          className="notification-view-all"
          href="/notifications"
          onNavigate={() => setOpen(false)}
        >
          전체 보기 <Icon name="arrow" size={15} />
        </Link>
      </Popover.Content>
    </Popover.Root>
  );
}

function MobileBrandHeader({ signedIn, logout, role }) {
  const { unreadMessages } = useCommunity();
  const [busy, setBusy] = useState(false),
    [open, setOpen] = useState(false);
  const pathname = usePathname();
  useEffect(() => setOpen(false), [pathname]);
  async function signOut() {
    if (busy) return;
    setBusy(true);
    try {
      await logout();
      setOpen(false);
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <header className="mobile-brand-header">
        <Link href="/" className="mobile-brand" aria-label="대시보드로 이동">
          <img src="/images/helldivers-logo.png" alt="HELLDIVERS II" />
          <span>HELLDIVERS 2 COMMUNITY</span>
        </Link>
        {signedIn && <NotificationBell key={pathname + role} mobile />}
        {signedIn && (
          <Link
            href="/messages"
            className="mobile-message-link"
            aria-label={`쪽지함${unreadMessages ? `, 안 읽은 쪽지 ${unreadMessages}개` : ''}`}
          >
            <Icon name="mail" size={23} />
            {unreadMessages > 0 && (
              <span className="message-nav-count">
                {unreadMessages > 99 ? '99+' : unreadMessages}
              </span>
            )}
          </Link>
        )}
        <Button
          type="button"
          className="mobile-auth-action"
          onClick={() => setOpen(true)}
          aria-label="전체 메뉴 열기"
          aria-haspopup="dialog"
          aria-expanded={open}
        >
          <Menu size={28} strokeWidth={2} aria-hidden="true" />
        </Button>
      </header>
      {open && (
        <Modal className="full-menu-modal" title="전체 메뉴" onClose={() => setOpen(false)}>
          <nav className="full-menu" aria-label="전체 메뉴">
            <NavigationGroups
              role={signedIn ? role : null}
              mobile
              onNavigate={() => setOpen(false)}
            />
            <div className="full-menu-divider" />
            <div className="sidebar-community-links">
              <KakaoChatLink />
              <DiscordLink />
            </div>
            <div className="full-menu-divider" />
            {signedIn && role === 'operator' && <TestUserToggle />}
            {signedIn ? (
              <>
                <Link href="/profile" onClick={() => setOpen(false)}>
                  <Avatar own />
                  <span>
                    <Nickname own /> · 내 정보
                  </span>
                </Link>
                <Button type="button" onClick={signOut} disabled={busy}>
                  <LogOut size={18} />
                  {busy ? '로그아웃 중' : '로그아웃'}
                </Button>
              </>
            ) : (
              <>
                <Link href="/login" onClick={() => setOpen(false)}>
                  <LogIn size={18} />
                  로그인
                </Link>
                <Link href="/signup" onClick={() => setOpen(false)}>
                  <Icon name="users" />
                  회원가입
                </Link>
              </>
            )}
          </nav>
        </Modal>
      )}
    </>
  );
}
const menu = navigationGroups.flatMap((group) => group.items);
export default function Shell({ children, previewSkeleton = false }) {
  const pathname = usePathname(),
    router = useRouter();
  const {
    signedIn,
    role,
    actualRole,
    setViewRole,
    notify,
    user,
    unreadMessages,
    logout,
    managementMode,
    setManagementMode,
    desktopMode,
    setDesktopMode,
  } = useCommunity();
  const [roleBusy, setRoleBusy] = useState(false);
  const [device, setDevice] = useState('pc'),
    [isFrame, setIsFrame] = useState(false),
    [previewRoute, setPreviewRoute] = useState(pathname);
  const frame = useRef(null);
  useEffect(() => {
    const media = window.matchMedia('(min-width: 761px) and (hover: hover) and (pointer: fine)');
    const update = () =>
      setDesktopMode(media.matches && device === 'pc' && window.parent === window);
    update();
    media.addEventListener('change', update);
    return () => {
      media.removeEventListener('change', update);
      setDesktopMode(false);
    };
  }, [device, setDesktopMode]);
  useEffect(() => {
    setIsFrame(window.parent !== window);
  }, []);
  useEffect(() => {
    setPreviewRoute(pathname);
    if (window.parent !== window)
      window.parent.postMessage(
        { type: 'helldivers-preview-route', path: pathname },
        window.location.origin,
      );
  }, [pathname]);
  useEffect(() => {
    const listener = (event) => {
      if (
        event.origin === window.location.origin &&
        event.source === frame.current?.contentWindow &&
        event.data?.type === 'helldivers-preview-route' &&
        typeof event.data.path === 'string' &&
        event.data.path.startsWith('/') &&
        !event.data.path.startsWith('//')
      )
        setPreviewRoute(event.data.path);
    };
    window.addEventListener('message', listener);
    return () => window.removeEventListener('message', listener);
  }, []);
  if (pathname === '/test-user') return children;
  if (!signedIn)
    return (
      <>
        <MobileBrandHeader signedIn={false} />
        <main id="main-content" className="guest-content">
          {children}
        </main>
      </>
    );
  const mobile = device === 'mobile' && !isFrame;
  return (
    <DiceGameProvider enabled={!mobile}>
      <div className={`site-shell ${mobile ? 'show-mobile-preview' : ''}`}>
        <a className="skip-link" href="#main-content">
          본문 바로가기
        </a>
        <aside className="sidebar">
          <Link href="/" className="site-brand">
            <img src="/images/helldivers-logo.png" alt="HELLDIVERS II" />
            <span>HELLDIVERS 2 COMMUNITY</span>
          </Link>
          <nav className="desktop-nav" aria-label="주 메뉴">
            <NavigationGroups role={role} />
          </nav>
          <div className="sidebar-bottom">
            <div className="sidebar-community-links">
              <KakaoChatLink />
              <DiscordLink />
            </div>
            <div className="sidebar-account">
              <Avatar own />
              <div>
                <Link href="/profile" className="account-name">
                  <Nickname own /> 님
                </Link>
                <small>{roleLabels[role]}</small>
                <Link href="/profile" className="sidebar-points">
                  <span>현재 포인트</span>
                  <strong>{(user?.points?.current || 0).toLocaleString()} P</strong>
                </Link>
                <div className="account-actions">
                  <Link href="/profile">
                    <Icon name="settings" size={14} />내 정보
                  </Link>
                  <Button onClick={logout}>
                    <Icon name="logout" size={14} />
                    로그아웃
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </aside>
        <MobileBrandHeader signedIn={signedIn} logout={logout} role={role} />
        <div className="main-column">
          {!isFrame && (
            <section className="preview-controls">
              <span>
                {roleLabels[role]} · <Nickname own />
                {actualRole === 'operator' && role !== actualRole ? ' · 화면 확인 중' : ''}
              </span>
              <div className="preview-control-groups">
                {actualRole === 'operator' && role === 'operator' && <TestUserToggle />}
                <NotificationBell key={pathname + role} />
                <Link
                  href="/messages"
                  className="notification-link"
                  aria-label={`쪽지함${unreadMessages ? `, 안 읽은 쪽지 ${unreadMessages}개` : ''}`}
                >
                  <Icon name="mail" size={17} />
                  쪽지
                  {unreadMessages > 0 && (
                    <span className="message-nav-count">
                      {unreadMessages > 99 ? '99+' : unreadMessages}
                    </span>
                  )}
                </Link>
                {actualRole === 'operator' &&
                  role === 'operator' &&
                  desktopMode &&
                  /^\/boards\/[^/]+\/?$/.test(pathname) && (
                    <Button
                      type="button"
                      className={`management-toggle ${managementMode ? 'is-active' : ''}`}
                      aria-pressed={managementMode}
                      onClick={() => setManagementMode(!managementMode)}
                    >
                      <ShieldCheck size={17} aria-hidden="true" />
                      관리모드
                      <span className="management-toggle-light" aria-hidden="true" />
                    </Button>
                  )}
                {actualRole === 'operator' && (
                  <label className="view-role-selector">
                    <span>화면 등급</span>
                    <Select
                      aria-label="화면 확인용 회원등급"
                      value={role}
                      disabled={roleBusy}
                      onChange={async (event) => {
                        setRoleBusy(true);
                        try {
                          await setViewRole(event.target.value);
                        } catch (error) {
                          notify(error.message);
                        } finally {
                          setRoleBusy(false);
                        }
                      }}
                    >
                      {Object.entries(roleLabels).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                          {value === 'operator' ? ' (실제 등급)' : ''}
                        </option>
                      ))}
                    </Select>
                  </label>
                )}
                <div className="segmented" aria-label="화면 크기">
                  <Button
                    className={device === 'pc' ? 'selected' : ''}
                    onClick={() => {
                      setDevice('pc');
                      if (previewRoute !== pathname) router.push(previewRoute);
                    }}
                  >
                    <Icon name="desktop" size={16} />
                    PC
                  </Button>
                  <Button
                    className={device === 'mobile' ? 'selected' : ''}
                    onClick={() => setDevice('mobile')}
                  >
                    <Icon name="mobile" size={16} />
                    모바일
                  </Button>
                </div>
              </div>
            </section>
          )}
          {mobile ? (
            <div className="phone-preview">
              <iframe key={role} ref={frame} src={previewRoute} title="전체 사이트 모바일 화면" />
            </div>
          ) : (
            <main id="main-content" className="page-content">
              {children}
            </main>
          )}
        </div>
        <MobileBottomNav
          groups={navigationGroups.map((group) => ({
            ...group,
            items: group.items.filter(
              (item) =>
                (item.href.startsWith('/boards/') && item.href !== '/boards/notice') ||
                item.href.startsWith('/games/'),
            ),
          }))}
          boards={menu.filter(
            (item) =>
              (item.href.startsWith('/boards/') && item.href !== '/boards/notice') ||
              item.href.startsWith('/games/'),
          )}
        />
      </div>
    </DiceGameProvider>
  );
}
