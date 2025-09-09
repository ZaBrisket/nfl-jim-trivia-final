import React from 'react';
import { useOptimizedTimer } from '../utils/optimizedTimer';
import { useVisibilityPause } from '../hooks/useVisibilityPause';

export const Timer: React.FC<{ deadlineMs: number; onTimeout(): void }> = React.memo(({ deadlineMs, onTimeout }) => {
  const [remaining, setRemaining] = React.useState(0);
  const [, isPaused] = useVisibilityPause();
  const onTimeoutRef = React.useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  // Use optimized timer system
  useOptimizedTimer(
    React.useCallback((now: number) => {
      if (isPaused) return; // Pause when tab is not visible
      
      const newRemaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));
      setRemaining(newRemaining);
      
      if (newRemaining <= 0) {
        onTimeoutRef.current();
      }
    }, [deadlineMs, isPaused]),
    true
  );

  // Initialize remaining time
  React.useEffect(() => {
    const now = Date.now();
    const initialRemaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));
    setRemaining(initialRemaining);
  }, [deadlineMs]);

  return (
    <div aria-live="polite" aria-atomic="true">
      ⏱️ Time left: <strong>{remaining}s</strong>
    </div>
  );
});
