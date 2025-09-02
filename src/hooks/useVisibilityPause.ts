import { useEffect, useRef, useState } from 'react';

/**
 * Provides a monotonic clock that pauses when document is hidden.
 * Returns [nowMs, paused] where nowMs increases only when visible.
 */
export function useVisibilityPause(): [number, boolean] {
  const [now, setNow] = useState<number>(Date.now());
  const pausedRef = useRef<boolean>(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const onVis = () => {
      pausedRef.value = document.hidden;
      if (!document.hidden) tick();
    };
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  function tick() {
    setNow(Date.now());
    rafRef.current = window.setTimeout(tick, 1000) as unknown as number;
  }

  useEffect(() => {
    tick();
    return () => {
      if (rafRef.current) clearTimeout(rafRef.current);
    };
  }, []);

  return [now, document.hidden];
}
