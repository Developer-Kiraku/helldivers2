'use client';
import { useCommunity } from './CommunityProvider';
import { isMuted, muteNotice } from '@/lib/member-mute.mjs';

export default function MuteNotice() {
  const { user } = useCommunity();
  return isMuted(user) ? (
    <p className="field-hint" role="status">
      {muteNotice(user)}
    </p>
  ) : null;
}
