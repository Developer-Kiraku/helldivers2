'use client';
import { ActionLink } from './ui';

import Link from 'next/link';
import { useCommunity } from './CommunityProvider';
import Icon from './Icon';
import PageSkeleton from './PageSkeleton';
export default function AccessGate({ children, operator = false }) {
  const { signedIn, canWriteNotice, ready } = useCommunity();
  if (!ready) return <PageSkeleton />;
  if (!signedIn)
    return (
      <section className="access-panel">
        <h1>로그인이 필요합니다.</h1>
        <ActionLink href="/login" className="button primary">
          로그인
        </ActionLink>
      </section>
    );
  if (operator && !canWriteNotice)
    return (
      <section className="access-panel">
        <Icon name="lock" size={40} />
        <h1>운영진 전용입니다.</h1>
        <p>공지사항은 운영자와 부운영자만 작성할 수 있습니다.</p>
        <ActionLink className="button secondary" href="/boards/notice">
          목록으로
        </ActionLink>
      </section>
    );
  return children;
}
