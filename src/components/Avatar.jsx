'use client';

import { useCommunity } from './CommunityProvider';

export default function Avatar({ name, own = false, size = 'small', photo = '' }) {
  const { profile } = useCommunity();
  const label = own ? profile.nickname : name || '회원';
  const image = own ? profile.photo : photo;
  return image ? (
    <img className={`avatar avatar-${size}`} src={image} alt={`${label} 프로필 사진`} />
  ) : (
    <span className={`avatar avatar-${size} avatar-fallback`} aria-label={`${label} 기본 프로필`}>
      {label.slice(0, 1)}
    </span>
  );
}
