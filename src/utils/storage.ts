const STORAGE_VERSION = 2;
const PREFIX = `njt_v${STORAGE_VERSION}_`;

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

export function loadState(): Schema {
  try {
    // Try current version
    const raw = localStorage.getItem(PREFIX + 'state');
    if (raw) return { ...DEFAULTS, ...JSON.parse(raw) };
    // Migrate v1 -> v2 if present
    for (let v = STORAGE_VERSION - 1; v >= 1; v--) {
      const old = localStorage.getItem(`njt_v${v}_state`);
      if (old) {
        const parsed = JSON.parse(old);
        const migrated: Schema = {
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
  } catch {
    // fallthrough to defaults
  }
  return { ...DEFAULTS };
}

export function saveState(s: Partial<Schema>): void {
  try {
    const cur = loadState();
    const next = { ...cur, ...s };
    localStorage.setItem(PREFIX + 'state', JSON.stringify(next));
  } catch {
    // ignore; storage might be unavailable
  }
}
