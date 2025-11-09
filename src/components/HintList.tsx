import React from 'react';

type Props = {
  hints: string[];
};

const HintList: React.FC<Props> = ({ hints }) => {
  if (hints.length === 0) {
    return (
      <div className="hint-list hint-list--empty" aria-live="polite">
        No hints used yet.
      </div>
    );
  }

  return (
    <ol className="hint-list" aria-live="polite">
      {hints.map((hint, index) => (
        <li key={`${hint}-${index}`}>
          <span className="hint-index">Hint {index + 1}:</span> {hint}
        </li>
      ))}
    </ol>
  );
};

export { HintList };
