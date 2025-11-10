import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  isNameMatch, 
  initializeFuzzyMatcher, 
  clearFuzzyCache,
  getFuzzyCacheStats,
  getFuzzyMatcherStats,
  FuzzyMatchError,
  OptimizedFuzzyMatcher
} from '../../src/utils/optimizedFuzzy';
import type { Player } from '../../src/types';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
  clearFuzzyCache(); // Clear cache between tests
});

const testPlayers: Player[] = [
  { 
    id: 'p1', 
    firstName: 'LeBron', 
    lastName: 'James', 
    displayName: 'LeBron James', 
    position: 'WR',
    aliases: ["Le'Bron James", "King James"]
  },
  {
    id: 'p2',
    firstName: 'Tom',
    lastName: 'Brady',
    displayName: 'Tom Brady',
    position: 'QB',
    aliases: ['TB12', 'The GOAT']
  },
  {
    id: 'p3',
    firstName: 'Aaron',
    lastName: 'Rodgers',
    displayName: 'Aaron Rodgers',
    position: 'QB'
  }
];

describe('Fuzzy Matching Module', () => {
  describe('initializeFuzzyMatcher', () => {
    it('should initialize with valid player data', () => {
      expect(() => initializeFuzzyMatcher(testPlayers)).not.toThrow();
      
      const stats = getFuzzyMatcherStats();
      expect(stats?.initialized).toBe(true);
      expect(stats?.playersIndexed).toBe(3);
    });

    it('should throw error for invalid input', () => {
      expect(() => initializeFuzzyMatcher(null as unknown as Player[])).toThrow(FuzzyMatchError);
      expect(() => initializeFuzzyMatcher('not array' as unknown as Player[])).toThrow(FuzzyMatchError);
    });

    it('should handle empty player array', () => {
      expect(() => initializeFuzzyMatcher([])).not.toThrow();
      
      const stats = getFuzzyMatcherStats();
      expect(stats?.initialized).toBe(true);
      expect(stats?.playersIndexed).toBe(0);
    });

    it('should throw error for too many players', () => {
      const manyPlayers = Array.from({ length: 10001 }, (_, i) => ({
        id: `p${i}`,
        firstName: 'Player',
        lastName: `${i}`,
        displayName: `Player ${i}`,
        position: 'QB' as const
      }));

      expect(() => initializeFuzzyMatcher(manyPlayers)).toThrow(FuzzyMatchError);
    });

    it('should handle players with invalid data gracefully', () => {
      const invalidPlayers = [
        testPlayers[0]!, // Valid
        { id: 'p2', displayName: '', position: 'QB' }, // Invalid displayName
        null, // Invalid player
        { id: 'p3', firstName: 'Valid', lastName: 'Player', displayName: 'Valid Player', position: 'QB' } // Valid
      ] as unknown as Player[];

      expect(() => initializeFuzzyMatcher(invalidPlayers)).not.toThrow();
      
      const stats = getFuzzyMatcherStats();
      expect(stats?.playersIndexed).toBe(2); // Only valid players indexed
    });
  });

  describe('isNameMatch', () => {
    beforeEach(() => {
      initializeFuzzyMatcher(testPlayers);
    });

    describe('exact matches', () => {
      it('should match exact display name', () => {
        expect(isNameMatch('LeBron James', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('Tom Brady', testPlayers[1]!)).toBe(true);
      });

      it('should match normalized names', () => {
        expect(isNameMatch('lebron james', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('LEBRON JAMES', testPlayers[0]!)).toBe(true);
      });

      it('should handle whitespace variations', () => {
        expect(isNameMatch('  LeBron   James  ', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('LeBron\tJames', testPlayers[0]!)).toBe(true);
      });
    });

    describe('alias matching', () => {
      it('should match player aliases', () => {
        expect(isNameMatch("Le'Bron James", testPlayers[0]!)).toBe(true);
        expect(isNameMatch('King James', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('TB12', testPlayers[1]!)).toBe(true);
        expect(isNameMatch('The GOAT', testPlayers[1]!)).toBe(true);
      });

      it('should handle normalized aliases', () => {
        expect(isNameMatch('lebron james', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('king james', testPlayers[0]!)).toBe(true);
      });
    });

    describe('partial matching', () => {
      it('should match last name + first initial', () => {
        expect(isNameMatch('L James', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('T Brady', testPlayers[1]!)).toBe(true);
      });

      it('should match token similarity', () => {
        expect(isNameMatch('James LeBron', testPlayers[0]!)).toBe(true); // Reversed order
      });
    });

    describe('input validation', () => {
      it('should handle empty input', () => {
        expect(isNameMatch('', testPlayers[0]!)).toBe(false);
      });

      it('should handle null/undefined input gracefully', () => {
        expect(isNameMatch(null as unknown as string, testPlayers[0]!)).toBe(false);
        expect(isNameMatch(undefined as unknown as string, testPlayers[0]!)).toBe(false);
      });

      it('should handle invalid player gracefully', () => {
        expect(isNameMatch('LeBron James', null as unknown as Player)).toBe(false);
        expect(isNameMatch('LeBron James', {} as unknown as Player)).toBe(false);
      });

      it('should handle very long input', () => {
        const longInput = 'x'.repeat(300);
        expect(isNameMatch(longInput, testPlayers[0]!)).toBe(false);
      });

      it('should truncate excessively long input', () => {
        const longInput = 'LeBron James ' + 'x'.repeat(200);
        // Should not throw, but should handle gracefully
        expect(() => isNameMatch(longInput, testPlayers[0]!)).not.toThrow();
      });
    });

    describe('special characters and unicode', () => {
      it('should handle diacritics and special characters', () => {
        expect(isNameMatch('Lébrön Jämés', testPlayers[0]!)).toBe(true);
        expect(isNameMatch("Le'Bron  James", testPlayers[0]!)).toBe(true);
      });

      it('should handle punctuation', () => {
        expect(isNameMatch('LeBron, James', testPlayers[0]!)).toBe(true);
        expect(isNameMatch('LeBron-James', testPlayers[0]!)).toBe(true);
      });

      it('should handle invalid Unicode gracefully', () => {
        // Test with potentially problematic Unicode
        const problematicInput = 'LeBron\uFFFE\uFFFFJames';
        expect(() => isNameMatch(problematicInput, testPlayers[0]!)).not.toThrow();
      });
    });

    describe('non-matches', () => {
      it('should not match different players', () => {
        expect(isNameMatch('Tom Brady', testPlayers[0]!)).toBe(false);
        expect(isNameMatch('LeBron James', testPlayers[1]!)).toBe(false);
      });

      it('should not match partial names below threshold', () => {
        expect(isNameMatch('Lebr', testPlayers[0]!)).toBe(false);
        expect(isNameMatch('Jam', testPlayers[0]!)).toBe(false);
      });

      it('should not match unrelated text', () => {
        expect(isNameMatch('Random Text', testPlayers[0]!)).toBe(false);
        expect(isNameMatch('12345', testPlayers[0]!)).toBe(false);
      });
    });
  });

  describe('cache management', () => {
    beforeEach(() => {
      initializeFuzzyMatcher(testPlayers);
    });

    it('should cache match results', () => {
      // First call
      const result1 = isNameMatch('LeBron James', testPlayers[0]!);

      // Second call (should use cache)
      const result2 = isNameMatch('LeBron James', testPlayers[0]!);
      const stats2 = getFuzzyCacheStats();
      
      expect(result1).toBe(result2);
      expect(stats2?.size).toBeGreaterThan(0);
    });

    it('should clear cache when requested', () => {
      // Add some cache entries
      isNameMatch('LeBron James', testPlayers[0]!);
      isNameMatch('Tom Brady', testPlayers[1]!);
      
      const statsBefore = getFuzzyCacheStats();
      expect(statsBefore?.size).toBeGreaterThan(0);
      
      clearFuzzyCache();
      
      const statsAfter = getFuzzyCacheStats();
      expect(statsAfter?.size).toBe(0);
    });

    it('should respect cache size limits', () => {
      // Fill cache beyond limit
      for (let i = 0; i < 1100; i++) {
        isNameMatch(`test${i}`, testPlayers[0]!);
      }
      
      const stats = getFuzzyCacheStats();
      expect(stats?.size).toBeLessThanOrEqual(stats?.maxSize || 1000);
    });
  });

  describe('OptimizedFuzzyMatcher class', () => {
    it('should create instance with valid data', () => {
      clearFuzzyCache(); // Ensure clean cache
      const matcher = new OptimizedFuzzyMatcher(testPlayers);
      const stats = matcher.getStats();
      
      expect(stats.playersIndexed).toBe(3);
      expect(stats.cacheSize).toBeGreaterThanOrEqual(0); // May have cache entries
    });

    it('should throw error for invalid constructor input', () => {
      expect(() => new OptimizedFuzzyMatcher(null as unknown as Player[])).toThrow(FuzzyMatchError);
      expect(() => new OptimizedFuzzyMatcher('invalid' as unknown as Player[])).toThrow(FuzzyMatchError);
    });

    it('should handle corrupted player data during precomputation', () => {
      const corruptedPlayers = [
        testPlayers[0]!, // Valid
        { id: 'corrupt', displayName: null }, // Invalid
        testPlayers[1]! // Valid
      ] as unknown as Player[];

      const matcher = new OptimizedFuzzyMatcher(corruptedPlayers);
      const stats = matcher.getStats();
      
      // Should only index valid players
      expect(stats.playersIndexed).toBe(2);
    });
  });

  describe('fallback behavior', () => {
    it('should work without initialization', () => {
      // Don't initialize fuzzy matcher
      clearFuzzyCache();
      
      // Should fall back to simple matching
      expect(isNameMatch('LeBron James', testPlayers[0]!)).toBe(true);
      expect(isNameMatch('Tom Brady', testPlayers[0]!)).toBe(false);
    });

    it('should handle errors gracefully', () => {
      initializeFuzzyMatcher(testPlayers);
      
      // Test with invalid inputs that should not crash
      expect(isNameMatch(null as unknown as string, testPlayers[0]!)).toBe(false);
      expect(isNameMatch('valid', null as unknown as Player)).toBe(false);
    });
  });

  describe('FuzzyMatchError', () => {
    it('should create proper error instances', () => {
      const error = new FuzzyMatchError('Test error', 'INVALID_INPUT');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(FuzzyMatchError);
      expect(error.name).toBe('FuzzyMatchError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('INVALID_INPUT');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new FuzzyMatchError('Wrapper error', 'INITIALIZATION_ERROR', cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('memory and performance bounds', () => {
    it('should limit alias count per player', () => {
      const playerWithManyAliases = {
        id: 'p1',
        firstName: 'Test',
        lastName: 'Player',
        displayName: 'Test Player',
        position: 'QB' as const,
        aliases: Array.from({ length: 20 }, (_, i) => `alias${i}`)
      };

      expect(() => new OptimizedFuzzyMatcher([playerWithManyAliases])).not.toThrow();
    });

    it('should handle extremely long normalized strings', () => {
      const playerWithLongName = {
        id: 'p1',
        firstName: 'x'.repeat(1000),
        lastName: 'y'.repeat(1000),
        displayName: 'z'.repeat(1000),
        position: 'QB' as const
      };

      expect(() => new OptimizedFuzzyMatcher([playerWithLongName])).not.toThrow();
    });

    it('should limit token count', () => {
      const longTokenString = Array.from({ length: 50 }, (_, i) => `token${i}`).join(' ');
      const player = {
        id: 'p1',
        firstName: 'Test',
        lastName: 'Player',
        displayName: longTokenString,
        position: 'QB' as const
      };

      expect(() => new OptimizedFuzzyMatcher([player])).not.toThrow();
    });
  });

  describe('stats and monitoring', () => {
    beforeEach(() => {
      initializeFuzzyMatcher(testPlayers);
    });

    it('should provide accurate statistics', () => {
      clearFuzzyCache(); // Ensure clean cache for this test
      const stats = getFuzzyMatcherStats();
      
      expect(stats).toBeDefined();
      expect(stats?.initialized).toBe(true);
      expect(stats?.playersIndexed).toBe(3);
      expect(stats?.cacheSize).toBe(0);
      expect(stats?.maxCacheSize).toBeGreaterThan(0);
    });

    it('should update cache statistics', () => {
      const statsBefore = getFuzzyMatcherStats();
      
      // Perform some matches
      isNameMatch('LeBron James', testPlayers[0]!);
      isNameMatch('Tom Brady', testPlayers[1]!);
      
      const statsAfter = getFuzzyMatcherStats();
      
      expect(statsAfter?.cacheSize).toBeGreaterThan(statsBefore?.cacheSize || 0);
    });

    it('should handle stats errors gracefully', () => {
      // getFuzzyMatcherStats should always return a valid object
      const stats = getFuzzyMatcherStats();
      expect(stats).toBeDefined();
      expect(typeof stats?.initialized).toBe('boolean');
      expect(typeof stats?.playersIndexed).toBe('number');
    });
  });
});
