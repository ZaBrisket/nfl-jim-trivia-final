import React from 'react';

export const ScoreBoard: React.FC<{ score: number; hints: number; guesses: number }> = React.memo(({ score, hints, guesses }) => {
  return (
    <div className="row">
      <div>⭐ Score: <strong>{score}</strong>/5</div>
      <div>💡 Hints used: <strong>{hints}</strong></div>
      <div>📝 Guesses: <strong>{guesses}</strong>/3</div>
    </div>
  );
});
