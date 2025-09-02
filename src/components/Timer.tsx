import React from 'react';
import { useVisibilityPause } from '../hooks/useVisibilityPause';

export const Timer: React.FC<{ deadlineMs: number; onTimeout(): void }> = ({ deadlineMs, onTimeout }) => {
  const [now] = useVisibilityPause();
  const remaining = Math.max(0, Math.floor((deadlineMs - now) / 1000));

  React.useEffect(() => {
    if (remaining <= 0) onTimeout();
  }, [remaining, onTimeout]);

  return (
    <div aria-live="polite" aria-atomic="true">
      ⏱️ Time left: <strong>{remaining}s</strong>
    </div>
  );
};
