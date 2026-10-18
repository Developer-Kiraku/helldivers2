'use client';
import Nickname from './Nickname';

import Link from 'next/link';
import Avatar from './Avatar';
import { useCommunity } from './CommunityProvider';

export default function IdentityStrip() {
  const { profile, signedIn } = useCommunity();
  if (!signedIn) return null;
  return <div className="identity-strip"><Avatar own /><div><strong><Nickname own/></strong><small>로그인한 내 프로필</small></div><Link href="/profile">내 정보 변경 ↗</Link></div>;
}
