import { ROUND_SECONDS } from '../utils/date';
import { RoundState } from '../types';

// Configuration constants
const MAX_GUESSES = 3;
const MAX_HINTS = 5;
const MAX_SCORE = 10;
const MIN_SCORE = 0;
const MAX_GUESS_LENGTH = 100;

// Time provider for deterministic testing
export interface TimeProvider {
  now(): number;
}

class RealTimeProvider implements TimeProvider {
  now(): number {
    return Date.now();
  }
}

// Global time provider - can be overridden for testing
let timeProvider: TimeProvider = new RealTimeProvider();

export function setTimeProvider(provider: TimeProvider): void {
  timeProvider = provider;
}

export function resetTimeProvider(): void {
  timeProvider = new RealTimeProvider();
}

// Error types for better error handling
export class GameStateError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_ACTION' | 'INVALID_STATE' | 'INVALID_TRANSITION',
    public readonly currentState?: RoundState,
    public readonly action?: Action
  ) {
    super(message);
    this.name = 'GameStateError';
  }
}

export type Action =
  | { type: 'start' }
  | { type: 'tick'; nowMs: number }
  | { type: 'guess'; text: string }
  | { type: 'hint' }
  | { type: 'reveal'; reason: 'giveup' | 'maxGuesses' | 'timeout' | 'solved' }
  | { type: 'reset' };

// Validation functions
function isValidAction(action: unknown): action is Action {
  if (!action || typeof action !== 'object') return false;
  
  const a = action as Record<string, unknown>;
  
  switch (a.type) {
    case 'start':
    case 'hint':
    case 'reset':
      return true;
    case 'tick':
      return typeof a.nowMs === 'number' && Number.isFinite(a.nowMs) && a.nowMs > 0;
    case 'guess':
      return typeof a.text === 'string' && 
             a.text.trim().length > 0; // Allow long text, will be sanitized
    case 'reveal':
      return typeof a.reason === 'string' && 
             ['giveup', 'maxGuesses', 'timeout', 'solved'].includes(a.reason);
    default:
      return false;
  }
}

function isValidRoundState(state: unknown): state is RoundState {
  if (!state || typeof state !== 'object') return false;
  
  const s = state as Record<string, unknown>;
  
  if (typeof s.tag !== 'string') return false;
  
  switch (s.tag) {
    case 'idle':
      return true;
    case 'active':
      return typeof s.startedAtMs === 'number' &&
             typeof s.deadlineMs === 'number' &&
             Array.isArray(s.guesses) &&
             s.guesses.every(g => typeof g === 'string') &&
             s.guesses.length <= MAX_GUESSES &&
             typeof s.hintsUsed === 'number' &&
             s.hintsUsed >= 0 &&
             s.hintsUsed <= MAX_HINTS &&
             typeof s.score === 'number' &&
             s.score >= MIN_SCORE &&
             s.score <= MAX_SCORE &&
             s.startedAtMs > 0 &&
             s.deadlineMs > s.startedAtMs;
    case 'revealed':
      return typeof s.endedAtMs === 'number' &&
             typeof s.reason === 'string' &&
             ['giveup', 'maxGuesses', 'timeout', 'solved'].includes(s.reason) &&
             typeof s.finalScore === 'number' &&
             s.finalScore >= MIN_SCORE &&
             s.finalScore <= MAX_SCORE &&
             Array.isArray(s.guesses) &&
             s.guesses.every(g => typeof g === 'string') &&
             typeof s.hintsUsed === 'number' &&
             s.hintsUsed >= 0 &&
             s.endedAtMs > 0;
    default:
      return false;
  }
}

function sanitizeGuess(text: string): string {
  return text
    .trim()
    .slice(0, MAX_GUESS_LENGTH)
    .replace(/\s+/g, ' '); // Normalize whitespace
}

function clampScore(score: number): number {
  return Math.max(MIN_SCORE, Math.min(MAX_SCORE, Math.floor(score)));
}

export function initialState(): RoundState {
  return { tag: 'idle' };
}

export function reducer(state: RoundState, action: Action): RoundState {
  // Validate inputs
  if (!isValidRoundState(state)) {
    throw new GameStateError(
      'Invalid state provided to reducer',
      'INVALID_STATE',
      state,
      action
    );
  }
  
  if (!isValidAction(action)) {
    throw new GameStateError(
      'Invalid action provided to reducer',
      'INVALID_ACTION',
      state,
      action
    );
  }

  try {
    switch (state.tag) {
      case 'idle': {
        if (action.type === 'start') {
          const now = timeProvider.now();
          const newState: RoundState = {
            tag: 'active',
            startedAtMs: now,
            deadlineMs: now + ROUND_SECONDS * 1000,
            guesses: [],
            hintsUsed: 0,
            score: 5
          };
          
          if (!isValidRoundState(newState)) {
            throw new GameStateError(
              'Generated invalid active state',
              'INVALID_STATE',
              state,
              action
            );
          }
          
          return newState;
        }
        
        // Only allow start action from idle state
        if (action.type !== 'reset') {
          throw new GameStateError(
            `Invalid action '${action.type}' for idle state`,
            'INVALID_TRANSITION',
            state,
            action
          );
        }
        
        return state;
      }
      
      case 'active': {
        if (action.type === 'tick') {
          // Validate tick time is reasonable
          if (action.nowMs < state.startedAtMs) {
            throw new GameStateError(
              'Tick time cannot be before game start',
              'INVALID_ACTION',
              state,
              action
            );
          }
          
          if (action.nowMs >= state.deadlineMs) {
            const newState: RoundState = {
              tag: 'revealed',
              endedAtMs: action.nowMs,
              reason: 'timeout',
              finalScore: clampScore(state.score - 1),
              guesses: [...state.guesses], // Create defensive copy
              hintsUsed: state.hintsUsed
            };
            
            if (!isValidRoundState(newState)) {
              throw new GameStateError(
                'Generated invalid revealed state from timeout',
                'INVALID_STATE',
                state,
                action
              );
            }
            
            return newState;
          }
          return state;
        }
        
        if (action.type === 'guess') {
          // Prevent duplicate guesses
          const sanitizedGuess = sanitizeGuess(action.text);
          if (state.guesses.includes(sanitizedGuess)) {
            return state; // Ignore duplicate guess
          }
          
          const guesses = [...state.guesses, sanitizedGuess];
          
          if (guesses.length >= MAX_GUESSES) {
            const newState: RoundState = {
              tag: 'revealed',
              endedAtMs: timeProvider.now(),
              reason: 'maxGuesses',
              finalScore: clampScore(state.score - 1),
              guesses,
              hintsUsed: state.hintsUsed
            };
            
            if (!isValidRoundState(newState)) {
              throw new GameStateError(
                'Generated invalid revealed state from max guesses',
                'INVALID_STATE',
                state,
                action
              );
            }
            
            return newState;
          }
          
          const newState: RoundState = { ...state, guesses };
          
          if (!isValidRoundState(newState)) {
            throw new GameStateError(
              'Generated invalid active state after guess',
              'INVALID_STATE',
              state,
              action
            );
          }
          
          return newState;
        }
        
        if (action.type === 'hint') {
          // Prevent excessive hints
          if (state.hintsUsed >= MAX_HINTS) {
            return state; // Ignore excessive hints
          }
          
          const newState: RoundState = {
            ...state,
            hintsUsed: state.hintsUsed + 1,
            score: clampScore(state.score - 1)
          };
          
          if (!isValidRoundState(newState)) {
            throw new GameStateError(
              'Generated invalid active state after hint',
              'INVALID_STATE',
              state,
              action
            );
          }
          
          return newState;
        }
        
        if (action.type === 'reveal') {
          const newState: RoundState = {
            tag: 'revealed',
            endedAtMs: timeProvider.now(),
            reason: action.reason,
            finalScore: clampScore(state.score),
            guesses: [...state.guesses], // Defensive copy
            hintsUsed: state.hintsUsed
          };
          
          if (!isValidRoundState(newState)) {
            throw new GameStateError(
              'Generated invalid revealed state from manual reveal',
              'INVALID_STATE',
              state,
              action
            );
          }
          
          return newState;
        }
        
        // Invalid action for active state
        throw new GameStateError(
          `Invalid action '${action.type}' for active state`,
          'INVALID_TRANSITION',
          state,
          action
        );
      }
      
      case 'revealed': {
        if (action.type === 'reset') {
          return initialState();
        }
        
        // Only allow reset action from revealed state
        throw new GameStateError(
          `Invalid action '${action.type}' for revealed state`,
          'INVALID_TRANSITION',
          state,
          action
        );
      }
      
      default: {
        const unknownState = state as { tag?: string };
        throw new GameStateError(
          `Unknown state tag: ${unknownState.tag}`,
          'INVALID_STATE',
          state,
          action
        );
      }
    }
  } catch (error) {
    if (error instanceof GameStateError) {
      throw error;
    }
    
    throw new GameStateError(
      `Unexpected error in reducer: ${error}`,
      'INVALID_STATE',
      state,
      action
    );
  }
}
