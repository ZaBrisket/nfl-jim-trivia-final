import { ROUND_SECONDS } from '../utils/date';
import { RoundState } from '../types';

export type Action =
  | { type: 'start' }
  | { type: 'tick'; nowMs: number }
  | { type: 'guess'; text: string }
  | { type: 'hint' }
  | { type: 'reveal'; reason: 'giveup' | 'maxGuesses' | 'timeout' | 'solved' }
  | { type: 'reset' };

export function initialState(): RoundState {
  return { tag: 'idle' };
}

export function reducer(state: RoundState, action: Action): RoundState {
  switch (state.tag) {
    case 'idle': {
      if (action.type === 'start') {
        const now = Date.now();
        return {
          tag: 'active',
          startedAtMs: now,
          deadlineMs: now + ROUND_SECONDS * 1000,
          guesses: [],
          hintsUsed: 0,
          score: 5
        };
      }
      return state;
    }
    case 'active': {
      if (action.type === 'tick') {
        if (action.nowMs >= state.deadlineMs) {
          return {
            tag: 'revealed',
            endedAtMs: action.nowMs,
            reason: 'timeout',
            finalScore: Math.max(0, state.score - 1),
            guesses: state.guesses,
            hintsUsed: state.hintsUsed
          };
        }
        return state;
      }
      if (action.type === 'guess') {
        const guesses = [...state.guesses, action.text];
        if (guesses.length >= 3) {
          return {
            tag: 'revealed',
            endedAtMs: Date.now(),
            reason: 'maxGuesses',
            finalScore: Math.max(0, state.score - 1),
            guesses,
            hintsUsed: state.hintsUsed
          };
        }
        return { ...state, guesses };
      }
      if (action.type === 'hint') {
        return { ...state, hintsUsed: state.hintsUsed + 1, score: Math.max(0, state.score - 1) };
      }
      if (action.type === 'reveal') {
        return {
          tag: 'revealed',
          endedAtMs: Date.now(),
          reason: action.reason,
          finalScore: state.score,
          guesses: state.guesses,
          hintsUsed: state.hintsUsed
        };
      }
      return state;
    }
    case 'revealed': {
      if (action.type === 'reset') return { tag: 'idle' };
      return state;
    }
  }
}
