'use client';
import { useEffect } from 'react';
import { useCommunity } from '../components/CommunityProvider';

export default function usePostView(postId) {
  const { api, ready, signedIn, user, updatePostViews, notify } = useCommunity();
  const viewingRole = Boolean(user?.actualRole);
  useEffect(() => {
    if (!postId || !ready || !signedIn || viewingRole) return;
    let active = true;
    api(`posts/${postId}/view`, { method: 'POST', body: {} })
      .then(({ views }) => {
        if (active) updatePostViews(postId, views);
      })
      .catch((error) => {
        if (active) notify(error.message);
      });
    return () => {
      active = false;
    };
  }, [postId, ready, signedIn, viewingRole, api, updatePostViews, notify]);
}
