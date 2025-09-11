import React from 'react';

type Props = {
  enabled: boolean;
  onSubmit(): void;
  onHint(): void;
  onGiveUp(): void;
};

const KeyboardShortcuts: React.FC<Props> = ({ enabled, onSubmit, onHint, onGiveUp }) => {
  React.useEffect(() => {
    if (!enabled) return;
    const onKey = React.useCallback((e: KeyboardEvent) => {
      if (e.key === 'Enter') { onSubmit(); }
      if (e.key.toLowerCase() === 'h') { onHint(); }
      if (e.key.toLowerCase() === 'g') { onGiveUp(); }
      if (e.key === '/') {
        const el = document.getElementById('guess-input') as HTMLInputElement | null;
        el?.focus();
        e.preventDefault();
      }
    }, [onSubmit, onHint, onGiveUp]);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [enabled, onSubmit, onHint, onGiveUp]);

  return (
    <div style={{ fontSize: 12, opacity: 0.7 }}>
      Shortcuts: <kbd>/</kbd> focus, <kbd>Enter</kbd> submit, <kbd>H</kbd> hint, <kbd>G</kbd> give up.
    </div>
  );
};

export { KeyboardShortcuts };
