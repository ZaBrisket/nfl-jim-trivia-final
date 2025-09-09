import { Player } from '../types';

// Cache for expensive computations
const matchCache = new Map<string, boolean>();
const MAX_CACHE_SIZE = 1000;

function clearCacheIfNeeded() {
  if (matchCache.size > MAX_CACHE_SIZE) {
    // Clear half the cache (LRU would be better but this is simpler)
    const entries = Array.from(matchCache.entries());
    matchCache.clear();
    // Keep the most recent half
    for (let i = Math.floor(entries.length / 2); i < entries.length; i++) {
      const entry = entries[i];
      if (entry && entry[0] !== undefined && entry[1] !== undefined) {
        matchCache.set(entry[0], entry[1]);
      }
    }
  }
}

function stripDiacritics(s: string): string {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function normalizeName(s: string): string {
  return stripDiacritics(s)
    .replace(/[^a-z0-9\s]/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

function tokens(s: string): string[] {
  return normalizeName(s).split(' ').filter(Boolean);
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
    this.precomputePlayerData(players);
  }

  private precomputePlayerData(players: Player[]): void {
    for (const player of players) {
      const normalizedDisplayName = normalizeName(player.displayName);
      const normalizedLastFirst = normalizeName(`${player.lastName}, ${player.firstName}`);
      const normalizedAliases = (player.aliases ?? []).map(alias => normalizeName(alias));
      const playerTokens = tokens(player.displayName);
      const firstInitial = (player.firstName[0] || '').toLowerCase();
      const normalizedLastName = normalizeName(player.lastName);

      this.playerData.set(player.id, {
        normalizedDisplayName,
        normalizedLastFirst,
        normalizedAliases,
        tokens: playerTokens,
        firstInitial,
        normalizedLastName
      });
    }
  }

  isNameMatch(input: string, player: Player): boolean {
    const cacheKey = `${input}:${player.id}`;
    const cached = matchCache.get(cacheKey);
    if (cached !== undefined) {
      return cached;
    }

    const result = this.computeMatch(input, player);
    
    clearCacheIfNeeded();
    matchCache.set(cacheKey, result);
    
    return result;
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
    return { size: matchCache.size, maxSize: MAX_CACHE_SIZE };
  }
}

// Singleton instance - will be initialized when data is available
let fuzzyMatcher: OptimizedFuzzyMatcher | null = null;

export function initializeFuzzyMatcher(players: Player[]): void {
  fuzzyMatcher = new OptimizedFuzzyMatcher(players);
}

export function isNameMatch(input: string, player: Player): boolean {
  if (fuzzyMatcher) {
    return fuzzyMatcher.isNameMatch(input, player);
  }
  
  // Fallback to simpler logic if matcher not initialized
  const iNorm = normalizeName(input);
  const full = normalizeName(player.displayName);
  return iNorm === full;
}

export function clearFuzzyCache(): void {
  if (fuzzyMatcher) {
    fuzzyMatcher.clearCache();
  }
}

export function getFuzzyCacheStats(): { size: number; maxSize: number } | null {
  return fuzzyMatcher ? fuzzyMatcher.getCacheStats() : null;
}