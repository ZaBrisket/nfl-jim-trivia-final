import { Player, Position, SeasonRow, DataStatus } from '../types';
import { fetchWithRetry } from '../utils/retry';
import { normalizeSeasonRow } from '../utils/normalize';
import * as fallback from '../data/fallbackPlayers';

// LRU Cache implementation for efficient data caching
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize: number;

  constructor(maxSize: number = 50) {
    this.maxSize = maxSize;
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Remove least recently used (first item)
      const firstKey = this.cache.keys().next().value;
      if (firstKey !== undefined) {
        this.cache.delete(firstKey);
      }
    }
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  clear(): void {
    this.cache.clear();
  }
}

// Data indexing for O(1) lookups
export class DataIndex {
  private playerById = new Map<string, Player>();
  private playersByPosition = new Map<Position, Player[]>();
  private searchTerms = new Map<string, Set<string>>(); // normalized search terms -> player IDs

  constructor(players: Player[]) {
    this.buildIndex(players);
  }

  private buildIndex(players: Player[]): void {
    // Build player indices
    for (const player of players) {
      this.playerById.set(player.id, player);
      
      const positionPlayers = this.playersByPosition.get(player.position) || [];
      positionPlayers.push(player);
      this.playersByPosition.set(player.position, positionPlayers);

      // Build search term index
      this.indexPlayerSearchTerms(player);
    }
  }

  private indexPlayerSearchTerms(player: Player): void {
    const terms = new Set<string>();
    
    // Add normalized names
    const addTerm = (term: string | null | undefined) => {
      if (typeof term === 'string' && term.length > 0) {
        const normalized = this.normalizeSearchTerm(term);
        if (normalized && normalized.length > 0) {
          terms.add(normalized);
          if (!this.searchTerms.has(normalized)) {
            this.searchTerms.set(normalized, new Set());
          }
          this.searchTerms.get(normalized)!.add(player.id);
        }
      }
    };

    addTerm(player.displayName);
    addTerm(player.firstName);
    addTerm(player.lastName);
    addTerm(`${player.firstName} ${player.lastName}`);
    addTerm(`${player.lastName}, ${player.firstName}`);

    // Add aliases
    if (Array.isArray(player.aliases)) {
      for (const alias of player.aliases) {
        addTerm(alias);
      }
    }

    // Add tokens for partial matching
    const tokens = this.tokenize(player.displayName);
    for (const token of tokens) {
      addTerm(token);
    }
  }

  private normalizeSearchTerm(term: string): string {
    if (typeof term !== 'string') {
      return '';
    }
    
    try {
      return term
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s]/gi, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .toLowerCase();
    } catch (err) {
      console.warn('Failed to normalize search term:', term, err);
      return '';
    }
  }

  private tokenize(text: string): string[] {
    return this.normalizeSearchTerm(text).split(' ').filter(Boolean);
  }

  findPlayer(id: string): Player | undefined {
    return this.playerById.get(id);
  }

  getPlayersByPosition(position: Position): Player[] {
    return this.playersByPosition.get(position) || [];
  }

  searchPlayers(query: string): Player[] {
    if (typeof query !== 'string' || query.length === 0) {
      return [];
    }
    
    const normalized = this.normalizeSearchTerm(query);
    if (normalized.length === 0) {
      return [];
    }
    
    const playerIds = this.searchTerms.get(normalized);
    
    if (!playerIds) return [];
    
    return Array.from(playerIds)
      .map(id => this.playerById.get(id))
      .filter((player): player is Player => player !== undefined);
  }

  getAllPlayers(): Player[] {
    return Array.from(this.playerById.values());
  }
}

// Optimized data service with lazy loading and caching
export class OptimizedDataService {
  private playerIndex?: DataIndex;
  private seasonCache = new LRUCache<Position, SeasonRow[]>(4); // Cache all 4 positions
  private loadingPromises = new Map<Position, Promise<SeasonRow[]>>();
  private status: DataStatus = { ready: false };

  async initialize(): Promise<{ index?: DataIndex; status: DataStatus }> {
    const details: string[] = [];
    const useFallback: string[] = [];

    let players: Player[] | undefined;
    try {
      const loadedPlayers = await this.loadJson<Player[]>('/data/players.json');
      // Validate loaded data
      if (Array.isArray(loadedPlayers) && loadedPlayers.length > 0) {
        players = this.validatePlayers(loadedPlayers);
        details.push('players:network');
      } else {
        throw new Error('Invalid or empty player data');
      }
    } catch (err) {
      console.warn('Failed to load network player data:', err);
      players = fallback.players;
      details.push('players:fallback');
      useFallback.push('players');
    }

    if (players && players.length > 0) {
      try {
        this.playerIndex = new DataIndex(players);
      } catch (err) {
        console.error('Failed to create player index:', err);
        // Fall back to basic fallback data
        this.playerIndex = new DataIndex(fallback.players);
        details.push('index:fallback');
        useFallback.push('index');
      }
    }

    const partial = useFallback.length > 0;
    const ready = !!this.playerIndex;
    this.status = { ready, partial, details };
    
    if (!ready) {
      this.status.error = 'Player data failed to load.';
    }

    return { 
      index: this.playerIndex, 
      status: this.status 
    };
  }

  async loadSeasonsForPosition(position: Position): Promise<SeasonRow[]> {
    // Check cache first
    const cached = this.seasonCache.get(position);
    if (cached) {
      return cached;
    }

    // Check if already loading
    const existingPromise = this.loadingPromises.get(position);
    if (existingPromise) {
      return existingPromise;
    }

    // Start loading
    const promise = this.doLoadSeasons(position);
    this.loadingPromises.set(position, promise);

    try {
      const seasons = await promise;
      this.seasonCache.set(position, seasons);
      return seasons;
    } finally {
      this.loadingPromises.delete(position);
    }
  }

  private async doLoadSeasons(position: Position): Promise<SeasonRow[]> {
    const positionLower = position.toLowerCase();
    const fallbackSeasons = this.getFallbackSeasons(position);

    try {
      const raw = await this.loadJson<Record<string, unknown>[]>(`/data/seasons_${positionLower}.json`);
      const normalized: SeasonRow[] = [];
      
      for (const r of raw) {
        const row = normalizeSeasonRow(r);
        if (row) normalized.push(row);
      }
      
      return normalized;
    } catch {
      return fallbackSeasons;
    }
  }

  private getFallbackSeasons(position: Position): SeasonRow[] {
    switch (position) {
      case 'QB': return fallback.seasonsQB;
      case 'RB': return fallback.seasonsRB;
      case 'WR': return fallback.seasonsWR;
      case 'TE': return fallback.seasonsTE;
      default: return [];
    }
  }

  private async loadJson<T>(path: string): Promise<T> {
    // Use shorter timeouts and fewer retries for faster failure in tests
    const isTest = process.env.NODE_ENV === 'test' || process.env.VITEST;
    const retries = isTest ? 1 : 2;
    const backoffMs = isTest ? 100 : 300;
    const timeoutMs = isTest ? 1000 : 5000;
    
    const res = await fetchWithRetry(path, {}, retries, backoffMs, timeoutMs);
    if (!res.ok) {
      throw new Error(`HTTP ${res.status} for ${path}`);
    }
    const data = await res.json();
    if (data === null || data === undefined) {
      throw new Error(`Null or undefined data from ${path}`);
    }
    return data as T;
  }

  private validatePlayers(players: any[]): Player[] {
    const validated: Player[] = [];
    
    for (const player of players) {
      if (this.isValidPlayer(player)) {
        validated.push(player);
      }
    }
    
    if (validated.length === 0) {
      throw new Error('No valid players found in data');
    }
    
    return validated;
  }

  private isValidPlayer(obj: any): obj is Player {
    return obj &&
           typeof obj === 'object' &&
           typeof obj.id === 'string' &&
           obj.id.length > 0 &&
           typeof obj.firstName === 'string' &&
           obj.firstName.length > 0 &&
           typeof obj.lastName === 'string' &&
           obj.lastName.length > 0 &&
           typeof obj.displayName === 'string' &&
           obj.displayName.length > 0 &&
           typeof obj.position === 'string' &&
           ['QB', 'RB', 'WR', 'TE'].includes(obj.position);
  }

  getPlayerIndex(): DataIndex | undefined {
    return this.playerIndex;
  }

  getStatus(): DataStatus {
    return this.status;
  }

  // Preload commonly used positions
  async preloadPositions(positions: Position[]): Promise<void> {
    const promises = positions.map(pos => this.loadSeasonsForPosition(pos));
    await Promise.all(promises);
  }

  // Clear caches for memory management
  clearCaches(): void {
    this.seasonCache.clear();
    this.loadingPromises.clear();
  }
}

// Singleton instance
export const dataService = new OptimizedDataService();