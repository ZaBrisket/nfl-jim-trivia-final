import React from 'react';
import { useOptimizedTimer } from '../utils/optimizedTimer';
import { useVisibilityPause } from '../hooks/useVisibilityPause';

type Props = {
  deadlineMs: number;
  onTimeout(): void;
  modeLabel?: string;
};

const Timer: React.FC<Props> = ({ deadlineMs, onTimeout, modeLabel }) => {
  const [remaining, setRemaining] = React.useState(0);
  const [, isPaused] = useVisibilityPause();
  const onTimeoutRef = React.useRef(onTimeout);
  onTimeoutRef.current = onTimeout;

  useOptimizedTimer(
    React.useCallback((now: number) => {
      if (isPaused) return;

      const newRemaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));
      setRemaining(newRemaining);

      if (newRemaining <= 0) {
        onTimeoutRef.current();
      }
    }, [deadlineMs, isPaused]),
    true
  );

  React.useEffect(() => {
    const now = Date.now();
    const initialRemaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));
    setRemaining(initialRemaining);
  }, [deadlineMs]);

  return (
    <div className="timer" aria-live="polite" aria-atomic="true">
      ⏱ Time left{modeLabel ? ` (${modeLabel})` : ''}: <strong>{remaining}s</strong>
    </div>
  );
};

export { Timer };
