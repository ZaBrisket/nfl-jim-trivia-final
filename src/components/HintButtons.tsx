import React from 'react';
import { HINT_PENALTY } from '../state/gameMachine';

type Props = {
  disabled?: boolean;
  hintsUsed: number;
  maxHints: number;
  onHint(): void;
  onGiveUp(): void;
};

const HintButtons: React.FC<Props> = ({ disabled, hintsUsed, maxHints, onHint, onGiveUp }) => {
  const hintsLeft = Math.max(0, maxHints - hintsUsed);
  const hintDisabled = disabled || hintsLeft === 0;
  const penaltyLabel = Number.isInteger(HINT_PENALTY)
    ? HINT_PENALTY.toFixed(0)
    : HINT_PENALTY.toFixed(1);
  return (
    <div className="row hint-controls" role="group" aria-label="Hint controls">
      <button
        onClick={onHint}
        disabled={hintDisabled}
        aria-disabled={hintDisabled}
      >
        Hint (-{penaltyLabel}) - {hintsLeft} left
      </button>
      <button onClick={onGiveUp} disabled={disabled} aria-disabled={disabled}>Give Up</button>
    </div>
  );
};

export { HintButtons };
