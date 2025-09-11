const STORAGE_VERSION = 2;
const PREFIX = `njt_v${STORAGE_VERSION}_`;
const MAX_RECENT_IDS = 50; // Prevent unbounded growth
const MAX_STREAK = 1000000; // Reasonable upper bound

type Schema = {
  recentIds: string[];
  streakBest: number;
  streakCurrent: number;
  lastDailyKey?: string;
  lastDailyId?: string;
  lastPosition?: string;
};

const DEFAULTS: Schema = {
  recentIds: [],
  streakBest: 0,
  streakCurrent: 0,
  lastDailyKey: undefined,
  lastDailyId: undefined,
  lastPosition: undefined
};

// Storage error types for better error handling
export class StorageError extends Error {
  constructor(
    message: string,
    public readonly code: 'QUOTA_EXCEEDED' | 'PARSE_ERROR' | 'VALIDATION_ERROR' | 'ACCESS_DENIED',
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'StorageError';
  }
}

// Validation functions
function isValidSchema(obj: unknown): obj is Schema {
  if (!obj || typeof obj !== 'object') return false;
  
  const candidate = obj as Record<string, unknown>;
  
  return (
    Array.isArray(candidate.recentIds) &&
    candidate.recentIds.every(id => typeof id === 'string' && id.length > 0) &&
    typeof candidate.streakBest === 'number' &&
    typeof candidate.streakCurrent === 'number' &&
    candidate.streakBest >= 0 &&
    candidate.streakCurrent >= 0 &&
    candidate.streakBest <= MAX_STREAK &&
    candidate.streakCurrent <= MAX_STREAK &&
    (candidate.lastDailyKey === undefined || typeof candidate.lastDailyKey === 'string') &&
    (candidate.lastDailyId === undefined || typeof candidate.lastDailyId === 'string') &&
    (candidate.lastPosition === undefined || typeof candidate.lastPosition === 'string')
  );
}

function sanitizeSchema(obj: unknown): Schema {
  if (!obj || typeof obj !== 'object') {
    return { ...DEFAULTS };
  }
  
  const candidate = obj as Record<string, unknown>;
  
  // Sanitize recentIds
  let recentIds: string[] = [];
  if (Array.isArray(candidate.recentIds)) {
    recentIds = candidate.recentIds
      .filter(id => typeof id === 'string' && id.length > 0)
      .slice(-MAX_RECENT_IDS); // Keep only the most recent entries
  }
  
  // Sanitize numeric values
  const sanitizeNumber = (value: unknown, defaultValue: number, max: number): number => {
    if (typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= max) {
      return Math.floor(value);
    }
    return defaultValue;
  };
  
  // Sanitize string values
  const sanitizeString = (value: unknown): string | undefined => {
    if (typeof value === 'string' && value.length > 0) {
      return value.slice(0, 100); // Prevent excessively long strings
    }
    return undefined;
  };
  
  return {
    recentIds,
    streakBest: sanitizeNumber(candidate.streakBest, DEFAULTS.streakBest, MAX_STREAK),
    streakCurrent: sanitizeNumber(candidate.streakCurrent, DEFAULTS.streakCurrent, MAX_STREAK),
    lastDailyKey: sanitizeString(candidate.lastDailyKey),
    lastDailyId: sanitizeString(candidate.lastDailyId),
    lastPosition: sanitizeString(candidate.lastPosition)
  };
}

function parseStorageData(raw: string): Schema {
  try {
    const parsed = JSON.parse(raw);
    const sanitized = sanitizeSchema(parsed);
    
    if (!isValidSchema(sanitized)) {
      throw new StorageError(
        'Loaded data failed validation after sanitization',
        'VALIDATION_ERROR'
      );
    }
    
    return sanitized;
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    throw new StorageError(
      'Failed to parse storage data',
      'PARSE_ERROR',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}

export function loadState(): Schema {
  try {
    // Try current version
    const raw = localStorage.getItem(PREFIX + 'state');
    if (raw) {
      try {
        return parseStorageData(raw);
      } catch (error) {
        console.warn('Failed to load current storage version:', error);
        // Continue to migration attempt
      }
    }
    
    // Migrate from older versions
    return migrateFromOlderVersions();
  } catch (error) {
    console.error('Storage loading failed completely:', error);
    return { ...DEFAULTS };
  }
}

function migrateFromOlderVersions(): Schema {
  for (let v = STORAGE_VERSION - 1; v >= 1; v--) {
    try {
      const old = localStorage.getItem(`njt_v${v}_state`);
      if (old) {
        const parsed = JSON.parse(old);
        const migrated: Schema = {
          recentIds: Array.isArray(parsed.recentIds) 
            ? parsed.recentIds.slice(-MAX_RECENT_IDS)
            : (Array.isArray(parsed.njt_recent_ids) 
              ? parsed.njt_recent_ids.slice(-MAX_RECENT_IDS) 
              : []),
          streakBest: Math.max(0, Math.min(MAX_STREAK, 
            Number(parsed.streakBest ?? parsed.njt_streak_best ?? 0) || 0)),
          streakCurrent: Math.max(0, Math.min(MAX_STREAK,
            Number(parsed.streakCurrent ?? parsed.njt_streak_current ?? 0) || 0)),
          lastDailyKey: typeof parsed.lastDailyKey === 'string' ? parsed.lastDailyKey : undefined,
          lastDailyId: typeof parsed.lastDailyId === 'string' ? parsed.lastDailyId : undefined,
          lastPosition: typeof parsed.lastPosition === 'string' ? parsed.lastPosition : undefined
        };
        
        // Validate migrated data
        const sanitized = sanitizeSchema(migrated);
        if (isValidSchema(sanitized)) {
          try {
            saveState(sanitized);
            console.info(`Successfully migrated storage from v${v} to v${STORAGE_VERSION}`);
            return sanitized;
          } catch (saveError) {
            console.warn(`Migration succeeded but save failed for v${v}:`, saveError);
            return sanitized; // Return migrated data even if save failed
          }
        }
      }
    } catch (error) {
      console.warn(`Failed to migrate from storage v${v}:`, error);
      // Continue trying older versions
    }
  }
  
  return { ...DEFAULTS };
}

export function saveState(s: Partial<Schema>): void {
  try {
    // Validate input data
    if (s && typeof s === 'object') {
      // Load current state first
      const cur = loadState();
      
      // Merge the partial update (don't sanitize the partial, merge first)
      const merged = { ...cur, ...s };
      
      // Now sanitize the complete merged object
      const next = sanitizeSchema(merged);
      
      // Final validation before save
      if (!isValidSchema(next)) {
        throw new StorageError(
          'Merged state failed validation',
          'VALIDATION_ERROR'
        );
      }
      
      // Attempt to save
      const serialized = JSON.stringify(next);
      localStorage.setItem(PREFIX + 'state', serialized);
      
    } else {
      throw new StorageError(
        'Invalid input: expected object',
        'VALIDATION_ERROR'
      );
    }
  } catch (error) {
    if (error instanceof Error) {
      // Check for quota exceeded error
      if (error.name === 'QuotaExceededError' || error.message.includes('quota')) {
        console.error('Storage quota exceeded. Attempting cleanup...');
        try {
          cleanupOldStorageVersions();
          // Retry save after cleanup
          const cur = loadState();
          const merged = { ...cur, ...s };
          const next = sanitizeSchema(merged);
          if (isValidSchema(next)) {
            localStorage.setItem(PREFIX + 'state', JSON.stringify(next));
            console.info('Save successful after cleanup');
            return;
          }
        } catch (cleanupError) {
          console.error('Cleanup and retry failed:', cleanupError);
        }
        throw new StorageError(
          'Storage quota exceeded and cleanup failed',
          'QUOTA_EXCEEDED',
          error
        );
      }
      
      // Check for access denied
      if (error.name === 'SecurityError') {
        throw new StorageError(
          'Storage access denied (private browsing mode?)',
          'ACCESS_DENIED',
          error
        );
      }
      
      console.warn('Storage save failed:', error);
      throw error;
    } else {
      console.warn('Unknown storage error:', error);
    }
  }
}

// Cleanup function for storage management
function cleanupOldStorageVersions(): void {
  try {
    // Remove old version storage keys
    for (let v = 1; v < STORAGE_VERSION; v++) {
      const oldKey = `njt_v${v}_state`;
      localStorage.removeItem(oldKey);
    }
    
    // Remove any other old keys that might exist
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && key.startsWith('njt_') && !key.startsWith(PREFIX)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    console.info(`Cleaned up ${keysToRemove.length} old storage keys`);
  } catch (error) {
    console.warn('Storage cleanup failed:', error);
  }
}

// Utility functions for external use
export function getStorageInfo(): {
  version: number;
  hasData: boolean;
  dataSize: number;
  isHealthy: boolean;
} {
  try {
    const key = PREFIX + 'state';
    let raw: string | null;
    let hasData: boolean;
    let dataSize: number;
    
    try {
      raw = localStorage.getItem(key);
      hasData = !!raw;
      dataSize = raw ? raw.length : 0;
    } catch {
      // Storage access failed
      return {
        version: STORAGE_VERSION,
        hasData: false,
        dataSize: 0,
        isHealthy: false
      };
    }
    
    let isHealthy = true;
    if (hasData && raw) {
      try {
        parseStorageData(raw);
      } catch {
        isHealthy = false;
      }
    }
    
    return {
      version: STORAGE_VERSION,
      hasData,
      dataSize,
      isHealthy
    };
  } catch {
    return {
      version: STORAGE_VERSION,
      hasData: false,
      dataSize: 0,
      isHealthy: false
    };
  }
}

export function clearAllStorage(): void {
  try {
    // Remove all NFL trivia related keys
    const keysToRemove: string[] = [];
    
    // Get all keys first
    try {
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('njt_')) {
          keysToRemove.push(key);
        }
      }
    } catch (error) {
      throw new StorageError(
        'Failed to enumerate storage keys',
        'ACCESS_DENIED',
        error instanceof Error ? error : new Error(String(error))
      );
    }
    
    // Remove each key
    for (const key of keysToRemove) {
      try {
        localStorage.removeItem(key);
      } catch (error) {
        throw new StorageError(
          `Failed to remove storage key: ${key}`,
          'ACCESS_DENIED',
          error instanceof Error ? error : new Error(String(error))
        );
      }
    }
    
    console.info(`Cleared ${keysToRemove.length} storage keys`);
  } catch (error) {
    if (error instanceof StorageError) {
      throw error;
    }
    console.error('Failed to clear storage:', error);
    throw new StorageError(
      'Failed to clear storage',
      'ACCESS_DENIED',
      error instanceof Error ? error : new Error(String(error))
    );
  }
}
