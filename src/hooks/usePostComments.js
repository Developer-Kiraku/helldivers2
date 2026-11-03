'use client';
import { useEffect, useRef, useState } from 'react';
import useRefreshOnReturn from './useRefreshOnReturn';

// Ignore responses after closing the panel, changing posts, or unmounting.
export default function usePostComments({ postId, api, enabled = true, initialCount = 0 }) {
  const [comments, setComments] = useState([]);
  const [count, setCount] = useState(initialCount);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const loadedPost = useRef(null);
  useRefreshOnReturn(() => setAttempt((value) => value + 1), enabled && Boolean(postId));
  useEffect(() => setCount(initialCount), [initialCount]);
  useEffect(() => {
    if (!enabled || !postId) {
      setLoading(false);
      return;
    }
    let active = true;
    setLoading(loadedPost.current !== postId);
    setError('');
    api(`posts/${postId}`)
      .then((data) => {
        if (active) {
          loadedPost.current = postId;
          setComments(data.comments);
          setCount(data.comments.length);
        }
      })
      .catch((error) => {
        if (active) setError(error.message);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [enabled, postId, api, attempt]);
  return {
    comments,
    setComments,
    count,
    setCount,
    loading,
    error,
    setError,
    reload: () => setAttempt((value) => value + 1),
  };
}
