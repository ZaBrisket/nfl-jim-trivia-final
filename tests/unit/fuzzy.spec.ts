import { describe, it, expect } from 'vitest';
import { isNameMatch } from '../../src/utils/fuzzy';

const player = { id: 'p', firstName: 'LeBron', lastName: 'James', displayName: 'LeBron James', position: 'WR' as const };

describe('isNameMatch', () => {
  it('matches exact', () => {
    expect(isNameMatch('LeBron James', player as any)).toBe(true);
  });
  it('matches last name + first initial', () => {
    expect(isNameMatch('L James', player as any)).toBe(true);
  });
  it('ignores punctuation/diacritics', () => {
    expect(isNameMatch("Le'Bron  James", player as any)).toBe(true);
  });
});
