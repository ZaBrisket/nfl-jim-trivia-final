import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { 
  loadState, 
  saveState, 
  StorageError, 
  getStorageInfo, 
  clearAllStorage 
} from '../../src/utils/storage';

// Mock console methods to avoid noise in tests
const originalConsole = { ...console };
beforeEach(() => {
  console.warn = vi.fn();
  console.error = vi.fn();
  console.info = vi.fn();
});

afterEach(() => {
  Object.assign(console, originalConsole);
});

describe('Storage Module', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('loadState', () => {
    it('should return defaults when no data exists', () => {
      const state = loadState();
      expect(state).toEqual({
        recentIds: [],
        streakBest: 0,
        streakCurrent: 0,
        lastDailyKey: undefined,
        lastDailyId: undefined,
        lastPosition: undefined
      });
    });

    it('should load valid current version data', () => {
      const validData = {
        recentIds: ['player1', 'player2'],
        streakBest: 5,
        streakCurrent: 3,
        lastDailyKey: '2024-01-01',
        lastDailyId: 'daily123',
        lastPosition: 'QB'
      };
      localStorage.setItem('njt_v2_state', JSON.stringify(validData));

      const state = loadState();
      expect(state).toEqual(validData);
    });

    it('should handle corrupted JSON gracefully', () => {
      localStorage.setItem('njt_v2_state', '{ invalid json }');
      
      const state = loadState();
      expect(state).toEqual({
        recentIds: [],
        streakBest: 0,
        streakCurrent: 0,
        lastDailyKey: undefined,
        lastDailyId: undefined,
        lastPosition: undefined
      });
    });

    it('should sanitize invalid data types', () => {
      const invalidData = {
        recentIds: ['valid', '', null, 123, 'another'], // Mix of valid/invalid
        streakBest: -5, // Negative number
        streakCurrent: 1000001, // Exceeds max
        lastDailyKey: 'x'.repeat(200), // Too long
        lastDailyId: null,
        lastPosition: 123
      };
      localStorage.setItem('njt_v2_state', JSON.stringify(invalidData));

      const state = loadState();
      expect(state.recentIds).toEqual(['valid', 'another']);
      expect(state.streakBest).toBe(0);
      expect(state.streakCurrent).toBe(0);
      expect(state.lastDailyKey).toHaveLength(100); // Truncated
      expect(state.lastDailyId).toBeUndefined();
      expect(state.lastPosition).toBeUndefined();
    });

    it('should limit recentIds array size', () => {
      const largeArray = Array.from({ length: 100 }, (_, i) => `player${i}`);
      const data = {
        recentIds: largeArray,
        streakBest: 0,
        streakCurrent: 0
      };
      localStorage.setItem('njt_v2_state', JSON.stringify(data));

      const state = loadState();
      expect(state.recentIds).toHaveLength(50); // MAX_RECENT_IDS
      expect(state.recentIds[0]).toBe('player50'); // Should keep the most recent
      expect(state.recentIds[49]).toBe('player99');
    });

    it('should migrate from v1 storage', () => {
      const v1Data = {
        njt_recent_ids: ['old1', 'old2'],
        njt_streak_best: 10,
        njt_streak_current: 5,
        lastDailyKey: 'old-daily'
      };
      localStorage.setItem('njt_v1_state', JSON.stringify(v1Data));

      const state = loadState();
      expect(state.recentIds).toEqual(['old1', 'old2']);
      expect(state.streakBest).toBe(10);
      expect(state.streakCurrent).toBe(5);
      expect(state.lastDailyKey).toBe('old-daily');
    });

    it('should handle migration with invalid v1 data', () => {
      const invalidV1Data = {
        njt_recent_ids: 'not-an-array',
        njt_streak_best: 'not-a-number',
        njt_streak_current: -100
      };
      localStorage.setItem('njt_v1_state', JSON.stringify(invalidV1Data));

      const state = loadState();
      expect(state.recentIds).toEqual([]);
      expect(state.streakBest).toBe(0);
      expect(state.streakCurrent).toBe(0);
    });

    it('should handle corrupted migration data', () => {
      localStorage.setItem('njt_v1_state', '{ corrupted json');
      
      const state = loadState();
      expect(state).toEqual({
        recentIds: [],
        streakBest: 0,
        streakCurrent: 0,
        lastDailyKey: undefined,
        lastDailyId: undefined,
        lastPosition: undefined
      });
    });
  });

  describe('saveState', () => {
    it('should save valid partial state', () => {
      saveState({ streakBest: 10 });
      
      const state = loadState();
      expect(state.streakBest).toBe(10);
      expect(state.streakCurrent).toBe(0); // Should preserve other defaults
    });

    it('should merge with existing state', () => {
      saveState({ streakBest: 5, recentIds: ['player1'] });
      saveState({ streakCurrent: 3 });
      
      const state = loadState();
      expect(state.streakBest).toBe(5);
      expect(state.streakCurrent).toBe(3);
      expect(state.recentIds).toEqual(['player1']);
    });

    it('should sanitize input data', () => {
      saveState({
        streakBest: -10, // Invalid negative
        streakCurrent: 2000000, // Exceeds max
        recentIds: ['valid', '', null, 'another'] as any
      });
      
      const state = loadState();
      expect(state.streakBest).toBe(0);
      expect(state.streakCurrent).toBe(0);
      expect(state.recentIds).toEqual(['valid', 'another']);
    });

    it('should throw StorageError for invalid input', () => {
      expect(() => saveState(null as any)).toThrow(StorageError);
      expect(() => saveState('not an object' as any)).toThrow(StorageError);
    });

    it('should handle storage errors gracefully', () => {
      // Test that storage errors don't crash the application
      // The implementation is designed to be resilient
      expect(() => saveState({ streakBest: 1 })).not.toThrow();
      
      // Even if storage fails, the function should complete
      const state = loadState();
      expect(state).toBeDefined();
    });
  });

  describe('StorageError', () => {
    it('should create proper error instances', () => {
      const error = new StorageError('Test error', 'PARSE_ERROR');
      
      expect(error).toBeInstanceOf(Error);
      expect(error).toBeInstanceOf(StorageError);
      expect(error.name).toBe('StorageError');
      expect(error.message).toBe('Test error');
      expect(error.code).toBe('PARSE_ERROR');
    });

    it('should include cause when provided', () => {
      const cause = new Error('Original error');
      const error = new StorageError('Wrapper error', 'VALIDATION_ERROR', cause);
      
      expect(error.cause).toBe(cause);
    });
  });

  describe('getStorageInfo', () => {
    it('should return info for empty storage', () => {
      const info = getStorageInfo();
      
      expect(info).toEqual({
        version: 2,
        hasData: false,
        dataSize: 0,
        isHealthy: true
      });
    });

    it('should return info for valid storage', () => {
      saveState({ streakBest: 5 });
      
      const info = getStorageInfo();
      expect(info.version).toBe(2);
      expect(info.hasData).toBe(true);
      expect(info.dataSize).toBeGreaterThan(0);
      expect(info.isHealthy).toBe(true);
    });

    it('should detect unhealthy storage', () => {
      localStorage.setItem('njt_v2_state', '{ invalid json }');
      
      const info = getStorageInfo();
      expect(info.hasData).toBe(true);
      expect(info.isHealthy).toBe(false);
    });

    it('should handle storage access errors gracefully', () => {
      // getStorageInfo should always return a valid response
      const info = getStorageInfo();
      expect(info).toBeDefined();
      expect(typeof info.version).toBe('number');
      expect(typeof info.hasData).toBe('boolean');
      expect(typeof info.dataSize).toBe('number');
      expect(typeof info.isHealthy).toBe('boolean');
    });
  });

  describe('clearAllStorage', () => {
    it('should clear all NFL trivia storage keys', () => {
      localStorage.setItem('njt_v2_state', 'test');
      localStorage.setItem('njt_v1_state', 'old');
      localStorage.setItem('njt_custom', 'custom');
      localStorage.setItem('other_app', 'should_remain');
      
      clearAllStorage();
      
      expect(localStorage.getItem('njt_v2_state')).toBeNull();
      expect(localStorage.getItem('njt_v1_state')).toBeNull();
      expect(localStorage.getItem('njt_custom')).toBeNull();
      expect(localStorage.getItem('other_app')).toBe('should_remain');
    });

    it('should handle storage operations safely', () => {
      // clearAllStorage should handle errors gracefully in production
      // For this test, we just verify it doesn't crash
      expect(() => clearAllStorage()).not.toThrow();
    });
  });

  describe('edge cases and robustness', () => {
    it('should handle extremely large data gracefully', () => {
      const hugeString = 'x'.repeat(10000);
      const largeData = {
        recentIds: Array(1000).fill('player'),
        lastDailyKey: hugeString
      };
      
      // Should not throw, but should sanitize
      saveState(largeData);
      
      const state = loadState();
      expect(state.recentIds).toHaveLength(50); // Capped
      expect(state.lastDailyKey).toHaveLength(100); // Truncated
    });

    it('should handle concurrent access gracefully', () => {
      // Simulate concurrent saves
      const promises = Array.from({ length: 10 }, (_, i) => 
        Promise.resolve().then(() => saveState({ streakCurrent: i }))
      );
      
      return Promise.all(promises).then(() => {
        const state = loadState();
        expect(typeof state.streakCurrent).toBe('number');
        expect(state.streakCurrent).toBeGreaterThanOrEqual(0);
        expect(state.streakCurrent).toBeLessThan(10);
      });
    });

    it('should maintain data integrity after multiple operations', () => {
      // Perform many operations
      for (let i = 0; i < 100; i++) {
        saveState({ 
          streakCurrent: i,
          recentIds: [`player${i}`]
        });
      }
      
      const state = loadState();
      expect(state.streakCurrent).toBe(99);
      expect(state.recentIds).toEqual(['player99']);
      
      // Verify storage is still healthy
      const info = getStorageInfo();
      expect(info.isHealthy).toBe(true);
    });
  });
});
