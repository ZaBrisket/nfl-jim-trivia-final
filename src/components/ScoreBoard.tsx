import React from 'react';
import { formatScore } from '../utils/score';

type Props = {
  totalScore: number;
  playersSolved: number;
  playersSeen: number;
  currentStreak: number;
  bestStreak: number;
};

const ScoreBoard: React.FC<Props> = ({
  totalScore,
  playersSolved,
  playersSeen,
  currentStreak,
  bestStreak
}) => {
  const accuracy = playersSeen > 0 ? Math.round((playersSolved / playersSeen) * 100) : 0;
  return (
    <div className="scoreboard" aria-live="polite">
      <div className="scoreboard__cell">
        <span className="label">Solved</span>
        <strong>{playersSolved}/{playersSeen}</strong>
        <span className="subtext">{accuracy}% accuracy</span>
      </div>
      <div className="scoreboard__cell">
        <span className="label">Session Score</span>
        <strong>{formatScore(totalScore)}</strong>
        <span className="subtext">5 pts max per player · 0.5 pt penalty per hint</span>
      </div>
      <div className="scoreboard__cell">
        <span className="label">Streak</span>
        <strong>{currentStreak}</strong>
        <span className="subtext">Best {bestStreak}</span>
      </div>
    </div>
  );
};

export { ScoreBoard };
