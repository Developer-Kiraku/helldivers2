'use client';
import { useEffect, useRef, useState } from 'react';
import { useCommunity } from '../components/CommunityProvider';

export default function usePostLike(post) {
  const { api, refresh, notify } = useCommunity();
  const [state, setState] = useState({ liked: post.myVote === 1, count: post.likes });
  const [busy, setBusy] = useState(false);
  const pending = useRef(false);
  useEffect(
    () => setState({ liked: post.myVote === 1, count: post.likes }),
    [post.id, post.myVote, post.likes],
  );
  async function change(onlyLike = false) {
    if (pending.current || (onlyLike && state.liked)) return;
    pending.current = true;
    setBusy(true);
    const previous = state,
      liked = onlyLike || !state.liked;
    setState({ liked, count: Math.max(0, state.count + (liked ? 1 : -1)) });
    try {
      const { post: result } = await api(`posts/${post.id}/vote`, {
        method: 'POST',
        body: { value: liked ? 1 : 0 },
      });
      setState({ liked: result.myVote === 1, count: result.likes });
      await refresh();
    } catch (error) {
      setState(previous);
      notify(error.message);
    } finally {
      pending.current = false;
      setBusy(false);
    }
  }
  return { ...state, busy, change };
}
