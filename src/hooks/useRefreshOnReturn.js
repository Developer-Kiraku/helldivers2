'use client';
import { useEffect, useRef } from 'react';

// Coalesce visibility/focus events and keep the current screen while revalidating.
export default function useRefreshOnReturn(refresh, enabled = true) {
  const latest = useRef(refresh);
  latest.current = refresh;
  useEffect(() => {
    if (!enabled) return;
    let timer;
    let running = false;
    let lastRun = -Infinity;
    let active = true;
    function schedule(event) {
      if (event.type === 'pageshow' && !event.persisted) return;
      if (document.visibilityState === 'hidden' || navigator.onLine === false) return;
      clearTimeout(timer);
      timer = setTimeout(async () => {
        if (
          !active ||
          document.visibilityState === 'hidden' ||
          running ||
          Date.now() - lastRun < 2000
        )
          return;
        running = true;
        lastRun = Date.now();
        try {
          await latest.current();
        } catch {
          // Query owners retain their data and handle request errors.
        } finally {
          running = false;
        }
      }, 100);
    }
    window.addEventListener('focus', schedule);
    window.addEventListener('online', schedule);
    window.addEventListener('pageshow', schedule);
    document.addEventListener('visibilitychange', schedule);
    return () => {
      active = false;
      clearTimeout(timer);
      window.removeEventListener('focus', schedule);
      window.removeEventListener('online', schedule);
      window.removeEventListener('pageshow', schedule);
      document.removeEventListener('visibilitychange', schedule);
    };
  }, [enabled]);
}
