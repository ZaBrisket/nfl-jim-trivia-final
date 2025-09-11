import { describe, it, expect, beforeEach } from 'vitest';
import { DataIndex } from '../../src/services/dataService';
import { Player } from '../../src/types';

describe('DataIndex', () => {
  const mockPlayers: Player[] = [
    {
      id: 'p1',
      firstName: 'Tom',
      lastName: 'Brady',
      displayName: 'Tom Brady',
      position: 'QB',
      aliases: ['TB12', 'The GOAT']
    },
    {
      id: 'p2',
      firstName: 'Aaron',
      lastName: 'Rodgers',
      displayName: 'Aaron Rodgers',
      position: 'QB'
    },
    {
      id: 'p3',
      firstName: 'Derrick',
      lastName: 'Henry',
      displayName: 'Derrick Henry',
      position: 'RB'
    }
  ];

  let index: DataIndex;

  beforeEach(() => {
    index = new DataIndex(mockPlayers);
  });

  describe('findPlayer', () => {
    it('should find player by ID', () => {
      const player = index.findPlayer('p1');
      expect(player?.displayName).toBe('Tom Brady');
    });

    it('should return undefined for non-existent ID', () => {
      const player = index.findPlayer('nonexistent');
      expect(player).toBeUndefined();
    });

    it('should handle empty or invalid IDs gracefully', () => {
      expect(index.findPlayer('')).toBeUndefined();
      expect(index.findPlayer(null as any)).toBeUndefined();
      expect(index.findPlayer(undefined as any)).toBeUndefined();
    });
  });

  describe('getPlayersByPosition', () => {
    it('should return players for valid position', () => {
      const qbs = index.getPlayersByPosition('QB');
      expect(qbs).toHaveLength(2);
      expect(qbs.map(p => p.displayName)).toContain('Tom Brady');
      expect(qbs.map(p => p.displayName)).toContain('Aaron Rodgers');
    });

    it('should return empty array for position with no players', () => {
      const tes = index.getPlayersByPosition('TE');
      expect(tes).toHaveLength(0);
    });

    it('should handle invalid positions gracefully', () => {
      const invalid = index.getPlayersByPosition('INVALID' as any);
      expect(invalid).toHaveLength(0);
    });
  });

  describe('searchPlayers', () => {
    it('should find players by exact display name', () => {
      const results = index.searchPlayers('Tom Brady');
      expect(results).toHaveLength(1);
      expect(results[0]?.displayName).toBe('Tom Brady');
    });

    it('should find players by normalized search terms', () => {
      const results = index.searchPlayers('tom');
      expect(results).toHaveLength(1);
      expect(results[0]?.displayName).toBe('Tom Brady');
    });

    it('should find players by aliases', () => {
      const results = index.searchPlayers('TB12');
      expect(results).toHaveLength(1);
      expect(results[0]?.displayName).toBe('Tom Brady');
    });

    it('should handle empty search query gracefully', () => {
      const results = index.searchPlayers('');
      expect(results).toHaveLength(0);
    });

    it('should handle special characters and diacritics', () => {
      const results = index.searchPlayers('Tóm Bràdy');
      expect(results).toHaveLength(1);
      expect(results[0]?.displayName).toBe('Tom Brady');
    });

    it('should return empty array for no matches', () => {
      const results = index.searchPlayers('nonexistent player');
      expect(results).toHaveLength(0);
    });

    it('should handle null and undefined inputs gracefully', () => {
      expect(index.searchPlayers(null as any)).toHaveLength(0);
      expect(index.searchPlayers(undefined as any)).toHaveLength(0);
    });
  });

  describe('getAllPlayers', () => {
    it('should return all indexed players', () => {
      const allPlayers = index.getAllPlayers();
      expect(allPlayers).toHaveLength(3);
    });

    it('should return immutable reference to player data', () => {
      const allPlayers = index.getAllPlayers();
      const originalLength = allPlayers.length;
      
      // Modifying returned array shouldn't affect internal state
      allPlayers.push({
        id: 'p4',
        firstName: 'New',
        lastName: 'Player',
        displayName: 'New Player',
        position: 'WR'
      });

      const allPlayersAgain = index.getAllPlayers();
      expect(allPlayersAgain).toHaveLength(originalLength);
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle empty player array', () => {
      const emptyIndex = new DataIndex([]);
      expect(emptyIndex.getAllPlayers()).toHaveLength(0);
      expect(emptyIndex.findPlayer('p1')).toBeUndefined();
      expect(emptyIndex.getPlayersByPosition('QB')).toHaveLength(0);
      expect(emptyIndex.searchPlayers('test')).toHaveLength(0);
    });

    it('should handle players with missing optional fields', () => {
      const playersWithMissingFields: Player[] = [
        {
          id: 'p1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          position: 'QB'
          // No aliases, rookieYear, team
        }
      ];

      const index = new DataIndex(playersWithMissingFields);
      const player = index.findPlayer('p1');
      expect(player).toBeDefined();
      expect(player?.aliases).toBeUndefined();
    });

    it('should handle players with invalid alias data gracefully', () => {
      const playersWithInvalidData = [
        {
          id: 'p1',
          firstName: 'John',
          lastName: 'Doe',
          displayName: 'John Doe',
          position: 'QB',
          aliases: ['alias1', null, undefined, '', 'alias2'] // Mixed valid/invalid aliases
        }
      ] as Player[];

      // Should not throw during construction
      expect(() => new DataIndex(playersWithInvalidData)).not.toThrow();
      
      const index = new DataIndex(playersWithInvalidData);
      const player = index.findPlayer('p1');
      expect(player).toBeDefined();
      
      // Should be able to search by valid alias
      const results = index.searchPlayers('alias1');
      expect(results).toHaveLength(1);
    });
  });
});