'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Popover } from '@radix-ui/themes';
import { Button } from './ui';
import Icon from './Icon';
import Avatar from './Avatar';

export default function MobileBottomNav({ boards }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const active = (href) => pathname === href || pathname.startsWith(`${href}/`);
  const communityActive = boards.some((item) => active(item.href));
  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const query = window.matchMedia('(max-width: 760px)');
    const close = () => {
      if (!query.matches) setOpen(false);
    };
    query.addEventListener('change', close);
    return () => query.removeEventListener('change', close);
  }, []);
  return (
    <nav className="mobile-nav" aria-label="모바일 메뉴">
      <Link
        href="/boards/notice"
        className={active('/boards/notice') ? 'active' : ''}
        aria-current={active('/boards/notice') ? 'page' : undefined}
      >
        <Icon name="flag" />
        <span>공지사항</span>
      </Link>
      <Popover.Root open={open} onOpenChange={setOpen}>
        <Popover.Trigger>
          <Button
            type="button"
            className={`mobile-community-trigger ${communityActive || open ? 'active' : ''}`}
          >
            <Icon name="talk" />
            <span>커뮤니티</span>
          </Button>
        </Popover.Trigger>
        <Popover.Content
          side="top"
          align="center"
          sideOffset={14}
          collisionPadding={14}
          className="mobile-board-popover"
          aria-label="커뮤니티 게시판"
        >
          <header>
            <strong>커뮤니티</strong>
            <Popover.Close>
              <Button type="button" className="icon-button" aria-label="커뮤니티 메뉴 닫기">
                <Icon name="close" size={18} />
              </Button>
            </Popover.Close>
          </header>
          <nav aria-label="커뮤니티 게시판">
            {boards.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                aria-current={active(item.href) ? 'page' : undefined}
                onClick={() => setOpen(false)}
              >
                <Icon name={item.icon} />
                <span>{item.label}</span>
                <Icon name="arrow" size={16} />
              </Link>
            ))}
          </nav>
        </Popover.Content>
      </Popover.Root>
      <Link
        href="/profile"
        className={active('/profile') ? 'active' : ''}
        aria-current={active('/profile') ? 'page' : undefined}
      >
        <Avatar own />
        <span>내 정보</span>
      </Link>
    </nav>
  );
}
