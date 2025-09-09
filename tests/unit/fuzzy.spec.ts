import { describe, it, expect, beforeAll } from 'vitest';
import { isNameMatch, initializeFuzzyMatcher } from '../../src/utils/optimizedFuzzy';
import type { Player } from '../../src/types';

const player: Player = { 
  id: 'p', 
  firstName: 'LeBron', 
  lastName: 'James', 
  displayName: 'LeBron James', 
  position: 'WR',
  aliases: ["Le'Bron James"]
};

describe('isNameMatch', () => {
  beforeAll(() => {
    // Initialize the fuzzy matcher with test data
    initializeFuzzyMatcher([player]);
  });

  it('matches exact', () => {
    expect(isNameMatch('LeBron James', player)).toBe(true);
  });
  it('matches last name + first initial', () => {
    expect(isNameMatch('L James', player)).toBe(true);
  });
  it('ignores punctuation/diacritics', () => {
    expect(isNameMatch("Le'Bron  James", player)).toBe(true);
  });
});
