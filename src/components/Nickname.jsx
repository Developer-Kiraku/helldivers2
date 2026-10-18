'use client';
import { useCommunity } from './CommunityProvider';
import { roleLabels } from '@/lib/roles';

export default function Nickname({ name, role, own = false, className = '' }) {
  const community = useCommunity();
  const grade = own ? community.role : role;
  const staff = grade === 'operator' || grade === 'deputy';
  return <span className={`member-nickname${staff ? ` is-${grade}` : ''}${className ? ` ${className}` : ''}`} title={staff ? roleLabels[grade] : undefined}>{own ? community.profile.nickname : name}</span>;
}
