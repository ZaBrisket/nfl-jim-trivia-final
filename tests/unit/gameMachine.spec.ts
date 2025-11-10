import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  reducer,
  initialState,
  Action,
  GameStateError,
  TimeProvider,
  setTimeProvider,
  resetTimeProvider
} from '../../src/state/gameMachine';
import { RoundState } from '../../src/types';

// Mock time provider for deterministic testing
class MockTimeProvider implements TimeProvider {
  private currentTime = 1000000; // Start at a known time

  now(): number {
    return this.currentTime;
  }

  setTime(time: number): void {
    this.currentTime = time;
  }

  advance(ms: number): void {
    this.currentTime += ms;
  }
}

describe('Game Machine', () => {
  let mockTime: MockTimeProvider;

  beforeEach(() => {
    mockTime = new MockTimeProvider();
    setTimeProvider(mockTime);
  });

  afterEach(() => {
    resetTimeProvider();
  });

  describe('initialState', () => {
    it('should return idle state', () => {
      const state = initialState();
      expect(state).toEqual({ tag: 'idle' });
    });
  });

  describe('reducer - idle state', () => {
    let idleState: RoundState;

    beforeEach(() => {
      idleState = initialState();
    });

    it('should start game on start action', () => {
      const action: Action = { type: 'start' };
      const newState = reducer(idleState, action);

      expect(newState).toEqual({
        tag: 'active',
        startedAtMs: 1000000,
        deadlineMs: 1000000 + 60000, // 60 seconds
        guesses: [],
        hintsUsed: 0,
        score: 5
      });
    });

    it('should honor custom duration when provided', () => {
      const action: Action = { type: 'start', durationSeconds: 90 };
      const newState = reducer(idleState, action);
      expect(newState.tag).toBe('active');
      if (newState.tag === 'active') {
        expect(newState.deadlineMs).toBe(1000000 + 90000);
      }
    });

    it('should clamp unreasonable custom durations', () => {
      const shortAction: Action = { type: 'start', durationSeconds: 10 };
      let newState = reducer(idleState, shortAction);
      if (newState.tag === 'active') {
        expect(newState.deadlineMs).toBe(1000000 + 30000); // min 30 seconds
      }

      const longAction: Action = { type: 'start', durationSeconds: 999 };
      newState = reducer(idleState, longAction);
      if (newState.tag === 'active') {
        expect(newState.deadlineMs).toBe(1000000 + 180000); // max 180 seconds
      }
    });

    it('should remain idle on reset action', () => {
      const action: Action = { type: 'reset' };
      const newState = reducer(idleState, action);

      expect(newState).toEqual(idleState);
    });

    it('should throw error on invalid actions from idle', () => {
      const invalidActions: Action[] = [
        { type: 'tick', nowMs: 1000000 },
        { type: 'guess', text: 'test' },
        { type: 'hint' },
        { type: 'reveal', reason: 'giveup' }
      ];

      invalidActions.forEach(action => {
        expect(() => reducer(idleState, action)).toThrow(GameStateError);
        expect(() => reducer(idleState, action)).toThrow(/Invalid action.*for idle state/);
      });
    });
  });

  describe('reducer - active state', () => {
    let activeState: RoundState;

    beforeEach(() => {
      const idleState = initialState();
      activeState = reducer(idleState, { type: 'start' });
    });

    describe('tick actions', () => {
      it('should remain active if time is before deadline', () => {
        mockTime.advance(30000); // 30 seconds
        const action: Action = { type: 'tick', nowMs: mockTime.now() };
        const newState = reducer(activeState, action);

        expect(newState).toEqual(activeState);
      });

      it('should timeout if time is at or after deadline', () => {
        mockTime.advance(60000); // Exactly at deadline
        const action: Action = { type: 'tick', nowMs: mockTime.now() };
        const newState = reducer(activeState, action);

        expect(newState).toEqual({
          tag: 'revealed',
          endedAtMs: mockTime.now(),
          reason: 'timeout',
          finalScore: 4, // score - 1
          guesses: [],
          hintsUsed: 0
        });
      });

      it('should throw error if tick time is before game start', () => {
        const startTime = activeState.tag === 'active' ? activeState.startedAtMs : 1000000;
        const action: Action = { type: 'tick', nowMs: startTime - 1000 };
        
        expect(() => reducer(activeState, action)).toThrow(GameStateError);
        expect(() => reducer(activeState, action)).toThrow(/Tick time cannot be before game start/);
      });
    });

    describe('guess actions', () => {
      it('should add guess to state', () => {
        const action: Action = { type: 'guess', text: 'Tom Brady' };
        const newState = reducer(activeState, action);

        expect(newState.tag).toBe('active');
        if (newState.tag === 'active') {
          expect(newState.guesses).toEqual(['Tom Brady']);
          expect(newState.score).toBe(5); // Score unchanged for regular guess
        }
      });

      it('should sanitize guess text', () => {
        const action: Action = { type: 'guess', text: '  Tom   Brady  ' };
        const newState = reducer(activeState, action);

        expect(newState.tag).toBe('active');
        if (newState.tag === 'active') {
          expect(newState.guesses).toEqual(['Tom Brady']); // Normalized
        }
      });

      it('should ignore duplicate guesses', () => {
        let state = reducer(activeState, { type: 'guess', text: 'Tom Brady' });
        state = reducer(state, { type: 'guess', text: 'Tom Brady' }); // Duplicate

        expect(state.tag).toBe('active');
        if (state.tag === 'active') {
          expect(state.guesses).toEqual(['Tom Brady']); // Only one instance
        }
      });

      it('should reveal game when max guesses reached', () => {
        let state = activeState;
        
        // Make 3 guesses
        state = reducer(state, { type: 'guess', text: 'Guess 1' });
        state = reducer(state, { type: 'guess', text: 'Guess 2' });
        
        mockTime.advance(1000); // Advance time for endedAtMs
        state = reducer(state, { type: 'guess', text: 'Guess 3' });

        expect(state).toEqual({
          tag: 'revealed',
          endedAtMs: mockTime.now(),
          reason: 'maxGuesses',
          finalScore: 4, // score - 1
          guesses: ['Guess 1', 'Guess 2', 'Guess 3'],
          hintsUsed: 0
        });
      });

      it('should handle very long guess text', () => {
        const longText = 'x'.repeat(200); // Exceeds MAX_GUESS_LENGTH
        const action: Action = { type: 'guess', text: longText };
        const newState = reducer(activeState, action);

        expect(newState.tag).toBe('active');
        if (newState.tag === 'active') {
          expect(newState.guesses[0]).toHaveLength(100); // Truncated to MAX_GUESS_LENGTH
        }
      });
    });

    describe('hint actions', () => {
      it('should increment hints and decrease score', () => {
        const action: Action = { type: 'hint' };
        const newState = reducer(activeState, action);

        expect(newState.tag).toBe('active');
        if (newState.tag === 'active') {
          expect(newState.hintsUsed).toBe(1);
          expect(newState.score).toBe(4);
        }
      });

      it('should ignore excessive hints', () => {
        let state = activeState;
        
        // Use maximum hints
        for (let i = 0; i < 5; i++) {
          state = reducer(state, { type: 'hint' });
        }
        
        expect(state.tag).toBe('active');
        if (state.tag === 'active') {
          expect(state.hintsUsed).toBe(5);
          expect(state.score).toBe(0); // 5 - 5 = 0
        }
        
        // Try to use another hint - should be ignored
        const extraHintState = reducer(state, { type: 'hint' });
        expect(extraHintState).toEqual(state); // Unchanged
      });

      it('should clamp score at minimum', () => {
        let state = activeState;
        
        // Use many hints to drive score negative
        for (let i = 0; i < 10; i++) {
          state = reducer(state, { type: 'hint' });
        }
        
        expect(state.tag).toBe('active');
        if (state.tag === 'active') {
          expect(state.score).toBe(0); // Clamped at minimum
        }
      });
    });

    describe('reveal actions', () => {
      it('should reveal game with given reason', () => {
        mockTime.advance(1000);
        const action: Action = { type: 'reveal', reason: 'giveup' };
        const newState = reducer(activeState, action);

        expect(newState).toEqual({
          tag: 'revealed',
          endedAtMs: mockTime.now(),
          reason: 'giveup',
          finalScore: 5, // Score unchanged for manual reveal
          guesses: [],
          hintsUsed: 0
        });
      });

      it('should handle all reveal reasons', () => {
        const reasons: Array<'giveup' | 'maxGuesses' | 'timeout' | 'solved'> = [
          'giveup', 'maxGuesses', 'timeout', 'solved'
        ];

        reasons.forEach(reason => {
          mockTime.advance(1000);
          const action: Action = { type: 'reveal', reason };
          const newState = reducer(activeState, action);

          expect(newState.tag).toBe('revealed');
          if (newState.tag === 'revealed') {
            expect(newState.reason).toBe(reason);
          }
        });
      });
    });
  });

  describe('reducer - revealed state', () => {
    let revealedState: RoundState;

    beforeEach(() => {
      const idleState = initialState();
      const activeState = reducer(idleState, { type: 'start' });
      revealedState = reducer(activeState, { type: 'reveal', reason: 'giveup' });
    });

    it('should reset to idle on reset action', () => {
      const action: Action = { type: 'reset' };
      const newState = reducer(revealedState, action);

      expect(newState).toEqual({ tag: 'idle' });
    });

    it('should throw error on invalid actions from revealed', () => {
      const invalidActions: Action[] = [
        { type: 'start' },
        { type: 'tick', nowMs: 1000000 },
        { type: 'guess', text: 'test' },
        { type: 'hint' },
        { type: 'reveal', reason: 'giveup' }
      ];

      invalidActions.forEach(action => {
        expect(() => reducer(revealedState, action)).toThrow(GameStateError);
        expect(() => reducer(revealedState, action)).toThrow(/Invalid action.*for revealed state/);
      });
    });
  });

  describe('input validation', () => {
    it('should throw error for invalid state', () => {
      const invalidState = { tag: 'invalid' } as unknown as RoundState;
      const action: Action = { type: 'start' };

      expect(() => reducer(invalidState, action)).toThrow(GameStateError);
      expect(() => reducer(invalidState, action)).toThrow(/Invalid state provided/);
    });

    it('should throw error for invalid action', () => {
      const state = initialState();
      const invalidAction = { type: 'invalid' } as unknown as Action;

      expect(() => reducer(state, invalidAction)).toThrow(GameStateError);
      expect(() => reducer(state, invalidAction)).toThrow(/Invalid action provided/);
    });

    it('should validate tick action parameters', () => {
      const state = initialState();
      const invalidActions: unknown[] = [
        { type: 'tick', nowMs: 'invalid' },
        { type: 'tick', nowMs: -1 },
        { type: 'tick', nowMs: Infinity },
        { type: 'tick', nowMs: NaN }
      ];

      invalidActions.forEach(action => {
        expect(() => reducer(state, action as Action)).toThrow(GameStateError);
      });
    });

    it('should validate guess action parameters', () => {
      const state = initialState();
      const invalidActions: unknown[] = [
        { type: 'guess', text: '' },
        { type: 'guess', text: 123 },
        { type: 'guess' }, // Missing text
        { type: 'guess', text: 'x'.repeat(101) } // Too long
      ];

      invalidActions.forEach(action => {
        expect(() => reducer(state, action as Action)).toThrow(GameStateError);
      });
    });

    it('should validate reveal action parameters', () => {
      const state = initialState();
      const invalidActions: unknown[] = [
        { type: 'reveal', reason: 'invalid' },
        { type: 'reveal', reason: 123 },
        { type: 'reveal' } // Missing reason
      ];

      invalidActions.forEach(action => {
        expect(() => reducer(state, action as Action)).toThrow(GameStateError);
      });
    });
  });

  describe('GameStateError', () => {
    it('should create proper error instances', () => {
      const state = initialState();
      const action: Action = { type: 'start' };
      const error = new GameStateError('Test error', 'INVALID_ACTION', state, action);

      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(GameStateError);
      expect(error.name).toBe('GameStateError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INVALID_ACTION');
      expect(error.currentState).toBe(state);
      expect(error.action).toBe(action);
    });
  });

  describe('time provider integration', () => {
    it('should use custom time provider', () => {
      const customTime = new MockTimeProvider();
      customTime.setTime(5000000);
      setTimeProvider(customTime);

      const idleState = initialState();
      const activeState = reducer(idleState, { type: 'start' });

      expect(activeState.tag).toBe('active');
      if (activeState.tag === 'active') {
        expect(activeState.startedAtMs).toBe(5000000);
        expect(activeState.deadlineMs).toBe(5000000 + 60000);
      }
    });

    it('should reset to real time provider', () => {
      resetTimeProvider();
      
      const idleState = initialState();
      const activeState = reducer(idleState, { type: 'start' });

      expect(activeState.tag).toBe('active');
      if (activeState.tag === 'active') {
        expect(activeState.startedAtMs).toBeGreaterThan(0);
        expect(activeState.deadlineMs).toBeGreaterThan(activeState.startedAtMs);
      }
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle state with corrupted data gracefully', () => {
      const corruptedState = {
        tag: 'active',
        startedAtMs: 'invalid',
        deadlineMs: 1000000,
        guesses: ['test'],
        hintsUsed: 0,
        score: 5
      } as unknown as RoundState;

      expect(() => reducer(corruptedState, { type: 'hint' })).toThrow(GameStateError);
    });

    it('should maintain state immutability', () => {
      const idleState = initialState();
      const activeState = reducer(idleState, { type: 'start' });
      const originalActiveState = { ...activeState };

      // Perform actions
      reducer(activeState, { type: 'guess', text: 'test' });
      reducer(activeState, { type: 'hint' });

      // Original state should be unchanged
      expect(activeState).toEqual(originalActiveState);
    });

    it('should handle rapid sequential actions', () => {
      let state = initialState();
      state = reducer(state, { type: 'start' });

      // Rapid guesses
      for (let i = 0; i < 10; i++) {
        try {
          state = reducer(state, { type: 'guess', text: `guess${i}` });
        } catch {
          // Expected after max guesses reached
          break;
        }
      }

      // Should have stopped at max guesses or be in revealed state
      expect(state.tag === 'revealed' || 
             (state.tag === 'active' && state.guesses.length <= 3)).toBe(true);
    });

    it('should handle extreme score values', () => {
      const extremeActiveState: RoundState = {
        tag: 'active',
        startedAtMs: 1000000,
        deadlineMs: 1060000,
        guesses: [],
        hintsUsed: 0,
        score: 1000 // Extreme score
      };

      // Score should be clamped
      expect(() => reducer(extremeActiveState, { type: 'hint' })).toThrow(GameStateError);
    });
  });
});
