import React from 'react';

type Props = {
  disabled?: boolean;
  onHint(): void;
  onGiveUp(): void;
};

export const HintButtons: React.FC<Props> = React.memo(({ disabled, onHint, onGiveUp }) => {
  return (
    <div className="row">
      <button onClick={onHint} disabled={disabled} aria-disabled={disabled}>Hint (-1)</button>
      <button onClick={onGiveUp} disabled={disabled} aria-disabled={disabled}>Give Up</button>
    </div>
  );
});
