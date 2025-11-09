import { Position } from '../types';
import { TimerMode, isNextChicagoDay, isSameChicagoDay } from './date';

// Enhanced storage with caching, compression, and performance optimizations
const STORAGE_VERSION = 3;
const PREFIX = `njt_v${STORAGE_VERSION}_`;

// In-memory cache for frequently accessed data
const memoryCache = new Map<string, { data: unknown; timestamp: number; ttl: number }>();
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes default TTL

type Schema = {
  recentIds: string[];
  streakBest: number;
  streakCurrent: number;
  lastDailyKey?: string;
  lastDailyId?: string;
  lastPosition?: Position;
  daily: {
    current: number;
    best: number;
    lastWinKey?: string;
    lastPlayedKey?: string;
  };
  gameStats?: {
    totalGames: number;
    totalCorrect: number;
    averageScore: number;
    bestStreak: number;
    positionStats: Record<Position, { games: number; correct: number }>;
  };
  preferences?: {
    soundEnabled: boolean;
    animationsEnabled: boolean;
    theme: 'light' | 'dark' | 'auto';
    timerMode: TimerMode;
  };
  performanceMetrics?: {
    averageGuessTime: number;
    fastestGuess: number;
    totalGuesses: number;
  };
};

const DEFAULTS: Schema = {
  recentIds: [],
  streakBest: 0,
  streakCurrent: 0,
  lastDailyKey: undefined,
  lastDailyId: undefined,
  lastPosition: undefined,
  daily: {
    current: 0,
    best: 0,
    lastWinKey: undefined,
    lastPlayedKey: undefined
  },
  gameStats: {
    totalGames: 0,
    totalCorrect: 0,
    averageScore: 0,
    bestStreak: 0,
    positionStats: {
      QB: { games: 0, correct: 0 },
      RB: { games: 0, correct: 0 },
      WR: { games: 0, correct: 0 },
      TE: { games: 0, correct: 0 }
    }
  },
  preferences: {
    soundEnabled: true,
    animationsEnabled: true,
    theme: 'auto',
    timerMode: 'standard'
  },
  performanceMetrics: {
    averageGuessTime: 0,
    fastestGuess: Infinity,
    totalGuesses: 0
  }
};

// Cache management
function getCacheKey(key: string): string {
  return `${PREFIX}${key}`;
}

function getFromCache<T>(key: string): T | null {
  const cacheKey = getCacheKey(key);
  const cached = memoryCache.get(cacheKey);

  if (!cached) return null;

  const now = Date.now();
  if (now > cached.timestamp + cached.ttl) {
    memoryCache.delete(cacheKey);
    return null;
  }

  return cached.data as T;
}

function setToCache<T>(key: string, data: T, ttl: number = CACHE_TTL): void {
  const cacheKey = getCacheKey(key);
  memoryCache.set(cacheKey, {
    data,
    timestamp: Date.now(),
    ttl
  });
  
  // Cleanup old cache entries if cache gets too large
  if (memoryCache.size > 100) {
    const now = Date.now();
    for (const [k, v] of memoryCache.entries()) {
      if (now > v.timestamp + v.ttl) {
        memoryCache.delete(k);
      }
    }
  }
}

// Compression utilities for large data
function compress(data: unknown): string {
  // Simple compression: remove unnecessary whitespace from JSON
  return JSON.stringify(data);
}

function decompress(compressed: string): unknown {
  return JSON.parse(compressed);
}

// Storage operations with caching
export function loadState(): Schema {
  // Check memory cache first
  const cached = getFromCache<Schema>('state');
  if (cached) {
    return cached;
  }
  
  try {
    // Try current version
    const raw = localStorage.getItem(PREFIX + 'state');
    if (raw) {
      const decompressed = decompress(raw);
      const parsed = { ...DEFAULTS, ...(typeof decompressed === 'object' && decompressed !== null ? decompressed : {}) };
      setToCache('state', parsed);
      return parsed;
    }
    
    // Migration from older versions
    for (let v = STORAGE_VERSION - 1; v >= 1; v--) {
      const old = localStorage.getItem(`njt_v${v}_state`);
      if (old) {
        const parsed = JSON.parse(old);
        const migrated: Schema = {
          ...DEFAULTS,
          recentIds: parsed.recentIds ?? parsed.njt_recent_ids ?? [],
          streakBest: parsed.streakBest ?? parsed.njt_streak_best ?? 0,
          streakCurrent: parsed.streakCurrent ?? parsed.njt_streak_current ?? 0,
          lastDailyKey: parsed.lastDailyKey,
          lastDailyId: parsed.lastDailyId,
          lastPosition: parsed.lastPosition
        };
        saveState(migrated);
        return migrated;
      }
    }
  } catch (error) {
    console.warn('Failed to load state from storage:', error);
  }
  
  const defaultState = { ...DEFAULTS };
  setToCache('state', defaultState);
  return defaultState;
}

export function saveState(s: Partial<Schema>): void {
  try {
    const current = loadState();
    const next = { ...current, ...s };
    
    // Save to localStorage with compression
    const compressed = compress(next);
    localStorage.setItem(PREFIX + 'state', compressed);
    
    // Update memory cache
    setToCache('state', next);
  } catch (error) {
    console.warn('Failed to save state to storage:', error);
  }
}

// Specialized storage functions for better performance
export function updateGameStats(
  position: Position,
  correct: boolean,
  score: number,
  guessTime?: number
): void {
  const state = loadState();
  const stats = state.gameStats!;
  
  stats.totalGames++;
  if (correct) {
    stats.totalCorrect++;
    stats.positionStats[position].correct++;
  }
  stats.positionStats[position].games++;
  
  // Update averages
  stats.averageScore = ((stats.averageScore * (stats.totalGames - 1)) + score) / stats.totalGames;
  
  // Update performance metrics
  if (guessTime && guessTime > 0) {
    const perf = state.performanceMetrics!;
    perf.totalGuesses++;
    perf.averageGuessTime = ((perf.averageGuessTime * (perf.totalGuesses - 1)) + guessTime) / perf.totalGuesses;
    perf.fastestGuess = Math.min(perf.fastestGuess, guessTime);
  }
  
  saveState({ gameStats: stats, performanceMetrics: state.performanceMetrics });
}

export function updateStreak(correct: boolean): { current: number; best: number } {
  const state = loadState();
  
  if (correct) {
    state.streakCurrent++;
    state.streakBest = Math.max(state.streakBest, state.streakCurrent);
  } else {
    state.streakCurrent = 0;
  }
  
  saveState({ streakCurrent: state.streakCurrent, streakBest: state.streakBest });
  
  return {
    current: state.streakCurrent,
    best: state.streakBest
  };
}

export function getDailyStreakSnapshot(): { current: number; best: number } {
  const { daily } = loadState();
  return { current: daily.current, best: daily.best };
}

export function updateDailyStreak(dateKey: string, solved: boolean): { current: number; best: number } {
  const state = loadState();
  const daily = { ...state.daily };

  if (solved) {
    if (isSameChicagoDay(daily.lastWinKey, dateKey)) {
      return { current: daily.current, best: daily.best };
    }

    if (daily.lastWinKey && isNextChicagoDay(daily.lastWinKey, dateKey)) {
      daily.current += 1;
    } else {
      daily.current = 1;
    }

    daily.lastWinKey = dateKey;
    daily.lastPlayedKey = dateKey;
    daily.best = Math.max(daily.best, daily.current);
  } else {
    daily.current = 0;
    daily.lastPlayedKey = dateKey;
  }

  state.daily = daily;
  saveState({ daily });
  return { current: daily.current, best: daily.best };
}

export function addRecentPlayer(playerId: string, maxRecent: number = 50): void {
  const state = loadState();
  const recent = [playerId, ...state.recentIds.filter(id => id !== playerId)].slice(0, maxRecent);
  saveState({ recentIds: recent });
}

export function getRecentPlayers(): string[] {
  return loadState().recentIds;
}

export function updatePreferences(prefs: Partial<NonNullable<Schema['preferences']>>): void {
  const state = loadState();
  const updated = { ...state.preferences!, ...prefs };
  saveState({ preferences: updated });
}

export function getPreferences(): Schema['preferences'] {
  return loadState().preferences!;
}

export function getTimerPreference(): TimerMode {
  return loadState().preferences?.timerMode ?? 'standard';
}

export function setTimerPreference(mode: TimerMode): void {
  updatePreferences({ timerMode: mode });
}

// Cache management functions
export function clearCache(): void {
  memoryCache.clear();
}

export function getCacheStats(): { size: number; keys: string[] } {
  return {
    size: memoryCache.size,
    keys: Array.from(memoryCache.keys())
  };
}

// Storage cleanup utilities
export function cleanupOldVersions(): void {
  try {
    for (let v = 1; v < STORAGE_VERSION; v++) {
      const oldKey = `njt_v${v}_state`;
      localStorage.removeItem(oldKey);
    }
  } catch (error) {
    console.warn('Failed to cleanup old storage versions:', error);
  }
}

// Export storage size information
export function getStorageInfo(): {
  used: number;
  available: number;
  percentage: number;
} {
  try {
    let totalSize = 0;
    for (let key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        totalSize += localStorage[key].length + key.length;
      }
    }
    
    // Rough estimate of available storage (5MB typical limit)
    const estimatedLimit = 5 * 1024 * 1024; // 5MB in bytes
    const used = totalSize;
    const available = estimatedLimit - used;
    const percentage = (used / estimatedLimit) * 100;
    
    return { used, available, percentage };
  } catch {
    return { used: 0, available: 0, percentage: 0 };
  }
}

// Initialize cleanup on load
cleanupOldVersions();
