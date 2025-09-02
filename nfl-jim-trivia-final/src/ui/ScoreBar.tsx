
import React from 'react'
import { Game } from '../state/game'

export function ScoreBar() {
  const g = Game.use()
  return (
    <div className="row" role="status" aria-live="polite">
      <span className="tag">Score: {g.round.score}</span>
      <span className="tag">Guesses: {g.round.guesses}/3</span>
      <span className="tag">Time: {g.timeLeft}s</span>
      <span className="tag">Streak: {g.currentStreak}</span>
      <span className="tag">Best: {g.bestStreak}</span>
    </div>
  )
}
