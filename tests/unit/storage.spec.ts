import { describe, it, expect, beforeEach } from 'vitest';
import { loadState, saveState } from '../../src/utils/storage';

describe('storage', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('round trips', () => {
    const s = loadState();
    expect(s.streakBest).toBe(0);
    saveState({ streakBest: 3 });
    expect(loadState().streakBest).toBe(3);
  });
});
