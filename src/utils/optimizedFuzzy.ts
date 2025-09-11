import { Player } from '../types';

// Configuration constants
const MAX_CACHE_SIZE = 1000;
const MAX_INPUT_LENGTH = 200;
const MAX_PLAYER_DATA_SIZE = 10000; // Maximum number of players to index
const MAX_NORMALIZATION_LENGTH = 500; // Maximum length after normalization

// Error types for better error handling
export class FuzzyMatchError extends Error {
  constructor(
    message: string,
    public readonly code: 'INVALID_INPUT' | 'MEMORY_LIMIT' | 'INITIALIZATION_ERROR',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'FuzzyMatchError';
  }
}

// Cache for expensive computations with better memory management
class BoundedCache<K, V> {
  private cache = new Map<K, V>();
  private accessOrder: K[] = [];
  private readonly maxSize: number;

  constructor(maxSize: number) {
    this.maxSize = Math.max(1, Math.floor(maxSize));
  }

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      // Move to end (most recently used)
      this.moveToEnd(key);
    }
    return value;
  }

  set(key: K, value: V): void {
    if (this.cache.has(key)) {
      this.cache.set(key, value);
      this.moveToEnd(key);
    } else {
      if (this.cache.size >= this.maxSize) {
        this.evictLRU();
      }
      this.cache.set(key, value);
      this.accessOrder.push(key);
    }
  }

  private moveToEnd(key: K): void {
    const index = this.accessOrder.indexOf(key);
    if (index > -1) {
      this.accessOrder.splice(index, 1);
      this.accessOrder.push(key);
    }
  }

  private evictLRU(): void {
    const lru = this.accessOrder.shift();
    if (lru !== undefined) {
      this.cache.delete(lru);
    }
  }

  clear(): void {
    this.cache.clear();
    this.accessOrder.length = 0;
  }

  size(): number {
    return this.cache.size;
  }

  getMaxSize(): number {
    return this.maxSize;
  }
}

// Global cache instance
const matchCache = new BoundedCache<string, boolean>(MAX_CACHE_SIZE);

// Input validation functions
function validateInput(input: unknown): string {
  if (typeof input !== 'string') {
    throw new FuzzyMatchError(
      'Input must be a string',
      'INVALID_INPUT'
    );
  }
  
  if (input.length === 0) {
    return ''; // Empty string is valid
  }
  
  if (input.length > MAX_INPUT_LENGTH) {
    throw new FuzzyMatchError(
      `Input too long: ${input.length} > ${MAX_INPUT_LENGTH}`,
      'INVALID_INPUT'
    );
  }
  
  return input;
}

function validatePlayer(player: unknown): Player {
  if (!player || typeof player !== 'object') {
    throw new FuzzyMatchError(
      'Player must be an object',
      'INVALID_INPUT'
    );
  }
  
  const p = player as Record<string, unknown>;
  
  if (typeof p.displayName !== 'string' || p.displayName.length === 0) {
    throw new FuzzyMatchError(
      'Player must have a valid displayName',
      'INVALID_INPUT'
    );
  }
  
  return player as Player;
}

function stripDiacritics(s: string): string {
  try {
    return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  } catch (error) {
    // Fallback for invalid Unicode sequences
    console.warn('Unicode normalization failed, using original string:', error);
    return s;
  }
}

function normalizeName(s: string): string {
  if (typeof s !== 'string') {
    return '';
  }
  
  if (s.length === 0) {
    return '';
  }
  
  try {
    let normalized = stripDiacritics(s)
      .replace(/[^a-z0-9\s]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim()
      .toLowerCase();
      
    // Prevent excessively long normalized strings
    if (normalized.length > MAX_NORMALIZATION_LENGTH) {
      normalized = normalized.slice(0, MAX_NORMALIZATION_LENGTH);
    }
    
    return normalized;
  } catch (error) {
    console.warn('Name normalization failed:', error);
    return '';
  }
}

function tokens(s: string): string[] {
  try {
    const normalized = normalizeName(s);
    if (normalized.length === 0) {
      return [];
    }
    
    const tokenArray = normalized.split(' ').filter(Boolean);
    
    // Limit number of tokens to prevent memory exhaustion
    return tokenArray.slice(0, 20);
  } catch (error) {
    console.warn('Tokenization failed:', error);
    return [];
  }
}

// Pre-computed player data for faster matching
export class OptimizedFuzzyMatcher {
  private playerData = new Map<string, {
    normalizedDisplayName: string;
    normalizedLastFirst: string;
    normalizedAliases: string[];
    tokens: string[];
    firstInitial: string;
    normalizedLastName: string;
  }>();

  constructor(players: Player[]) {
    if (!Array.isArray(players)) {
      throw new FuzzyMatchError(
        'Players must be an array',
        'INVALID_INPUT'
      );
    }
    
    if (players.length > MAX_PLAYER_DATA_SIZE) {
      throw new FuzzyMatchError(
        `Too many players: ${players.length} > ${MAX_PLAYER_DATA_SIZE}`,
        'MEMORY_LIMIT'
      );
    }
    
    try {
      this.precomputePlayerData(players);
    } catch (error) {
      throw new FuzzyMatchError(
        'Failed to precompute player data',
        'INITIALIZATION_ERROR',
        error instanceof Error ? error : new Error(String(error))
      );
    }
  }

  private precomputePlayerData(players: Player[]): void {
    for (const player of players) {
      try {
        // Validate player data
        const validatedPlayer = validatePlayer(player);
        
        const normalizedDisplayName = normalizeName(validatedPlayer.displayName);
        const normalizedLastFirst = normalizeName(`${validatedPlayer.lastName || ''}, ${validatedPlayer.firstName || ''}`);
        
        // Safely handle aliases
        const aliases = Array.isArray(validatedPlayer.aliases) ? validatedPlayer.aliases : [];
        const normalizedAliases = aliases
          .filter(alias => typeof alias === 'string' && alias.length > 0)
          .slice(0, 10) // Limit aliases to prevent memory issues
          .map(alias => normalizeName(alias))
          .filter(alias => alias.length > 0);
        
        const playerTokens = tokens(validatedPlayer.displayName);
        const firstInitial = (validatedPlayer.firstName?.[0] || '').toLowerCase();
        const normalizedLastName = normalizeName(validatedPlayer.lastName || '');

        // Only store if we have valid data
        if (normalizedDisplayName.length > 0) {
          this.playerData.set(validatedPlayer.id, {
            normalizedDisplayName,
            normalizedLastFirst,
            normalizedAliases,
            tokens: playerTokens,
            firstInitial,
            normalizedLastName
          });
        }
      } catch (error) {
        console.warn(`Failed to precompute data for player ${player?.id}:`, error);
        // Continue processing other players
      }
    }
  }

  isNameMatch(input: string, player: Player): boolean {
    try {
      // Validate inputs
      const validInput = validateInput(input);
      const validPlayer = validatePlayer(player);
      
      if (validInput.length === 0) {
        return false; // Empty input never matches
      }
      
      const cacheKey = `${validInput.slice(0, 50)}:${validPlayer.id}`;
      const cached = matchCache.get(cacheKey);
      if (cached !== undefined) {
        return cached;
      }

      const result = this.computeMatch(validInput, validPlayer);
      
      // Cache the result
      matchCache.set(cacheKey, result);
      
      return result;
    } catch (error) {
      console.warn('Name matching failed:', error);
      return false; // Fail safe
    }
  }

  private computeMatch(input: string, player: Player): boolean {
    const iNorm = normalizeName(input);
    const playerData = this.playerData.get(player.id);
    
    if (!playerData) {
      // Fallback to original logic if data not found
      return this.fallbackMatch(input, player);
    }

    const {
      normalizedDisplayName,
      normalizedLastFirst,
      normalizedAliases,
      tokens: playerTokens,
      firstInitial,
      normalizedLastName
    } = playerData;

    // Exact matches
    if (iNorm === normalizedDisplayName) return true;
    if (iNorm === normalizedLastFirst) return true;

    // Alias matches
    for (const alias of normalizedAliases) {
      if (iNorm === alias) return true;
    }

    // Token-set similarity
    const inputTokens = tokens(input);
    const score = this.computeTokenSimilarity(inputTokens, playerTokens);
    if (score >= 0.75) return true;

    // Last name + first initial pattern
    const [maybeFirst, maybeLast] = inputTokens;
    if (maybeLast && maybeFirst && maybeFirst[0] === firstInitial && normalizedLastName === maybeLast) {
      return true;
    }

    return false;
  }

  private computeTokenSimilarity(tokensA: string[], tokensB: string[]): number {
    if (tokensA.length === 0 && tokensB.length === 0) return 1;
    
    const setA = new Set(tokensA);
    const setB = new Set(tokensB);
    
    let intersection = 0;
    for (const token of setA) {
      if (setB.has(token)) intersection++;
    }
    
    const denom = Math.max(setA.size, setB.size, 1);
    return intersection / denom;
  }

  private fallbackMatch(input: string, player: Player): boolean {
    const iNorm = normalizeName(input);
    const full = normalizeName(player.displayName);
    if (iNorm === full) return true;

    const lastFirst = normalizeName(`${player.lastName}, ${player.firstName}`);
    if (iNorm === lastFirst) return true;

    // Alias preference
    for (const alias of player.aliases ?? []) {
      if (normalizeName(alias) === iNorm) return true;
    }

    // Token-set similarity threshold
    const inputTokens = tokens(input);
    const playerTokens = tokens(player.displayName);
    const score = this.computeTokenSimilarity(inputTokens, playerTokens);
    if (score >= 0.75) return true;

    // Last name + first initial
    const fi = (player.firstName[0] || '').toLowerCase();
    const [maybeFirst, maybeLast] = iNorm.split(' ');
    if (maybeLast && maybeFirst && maybeFirst[0] === fi && normalizeName(player.lastName) === maybeLast) {
      return true;
    }

    return false;
  }

  // Clear cache for memory management
  clearCache(): void {
    matchCache.clear();
  }

  // Get cache statistics for monitoring
  getCacheStats(): { size: number; maxSize: number } {
    return { size: matchCache.size(), maxSize: matchCache.getMaxSize() };
  }

  // Get matcher statistics
  getStats(): {
    playersIndexed: number;
    cacheSize: number;
    maxCacheSize: number;
  } {
    return {
      playersIndexed: this.playerData.size,
      cacheSize: matchCache.size(),
      maxCacheSize: matchCache.getMaxSize()
    };
  }
}

// Singleton instance - will be initialized when data is available
let fuzzyMatcher: OptimizedFuzzyMatcher | null = null;

export function initializeFuzzyMatcher(players: Player[]): void {
  try {
    if (!Array.isArray(players)) {
      throw new FuzzyMatchError(
        'Players must be an array',
        'INVALID_INPUT'
      );
    }
    
    fuzzyMatcher = new OptimizedFuzzyMatcher(players);
  } catch (error) {
    console.error('Failed to initialize fuzzy matcher:', error);
    throw error;
  }
}

export function isNameMatch(input: string, player: Player): boolean {
  try {
    if (fuzzyMatcher) {
      return fuzzyMatcher.isNameMatch(input, player);
    }
    
    // Fallback to simpler logic if matcher not initialized
    const validInput = validateInput(input);
    const validPlayer = validatePlayer(player);
    
    if (validInput.length === 0) {
      return false;
    }
    
    const iNorm = normalizeName(validInput);
    const full = normalizeName(validPlayer.displayName);
    return iNorm === full && iNorm.length > 0;
  } catch (error) {
    console.warn('Name matching failed:', error);
    return false; // Fail safe
  }
}

export function clearFuzzyCache(): void {
  try {
    if (fuzzyMatcher) {
      fuzzyMatcher.clearCache();
    }
  } catch (error) {
    console.warn('Failed to clear fuzzy cache:', error);
  }
}

export function getFuzzyCacheStats(): { size: number; maxSize: number } | null {
  try {
    return fuzzyMatcher ? fuzzyMatcher.getCacheStats() : null;
  } catch (error) {
    console.warn('Failed to get cache stats:', error);
    return null;
  }
}

export function getFuzzyMatcherStats(): {
  initialized: boolean;
  playersIndexed: number;
  cacheSize: number;
  maxCacheSize: number;
} | null {
  try {
    if (fuzzyMatcher) {
      const stats = fuzzyMatcher.getStats();
      return {
        initialized: true,
        ...stats
      };
    }
    
    return {
      initialized: false,
      playersIndexed: 0,
      cacheSize: 0,
      maxCacheSize: MAX_CACHE_SIZE
    };
  } catch (error) {
    console.warn('Failed to get matcher stats:', error);
    return null;
  }
}