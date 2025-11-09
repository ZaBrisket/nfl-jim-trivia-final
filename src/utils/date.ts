// Single source of truth for 'Chicago' (America/Chicago) day keys
export function chicagoDateString(d = new Date()): string {
  // Convert to America/Chicago without relying on Intl (deterministic w/o TZ db)
  // Strategy: compute offset from UTC using known rules? Instead, use locale if available.
  // For robustness, we approximate via Intl when available and fall back to UTC.
  try {
    const fmt = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/Chicago',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = fmt.formatToParts(d);
    const y = parts.find((p) => p.type === 'year')?.value ?? String(d.getUTCFullYear());
    const m = parts.find((p) => p.type === 'month')?.value ?? String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = parts.find((p) => p.type === 'day')?.value ?? String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  } catch {
    // Fallback: UTC date (documented) if Intl TZ not present
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }
}

export const TIMER_PRESETS = {
  challenge: { label: 'Blitz', seconds: 45, description: 'Short timer for die-hards' },
  standard: { label: 'Standard', seconds: 60, description: 'Balanced default pace' },
  relaxed: { label: 'Relaxed', seconds: 90, description: 'Extra time to think' }
} as const;

export type TimerMode = keyof typeof TIMER_PRESETS;

export const ROUND_SECONDS = TIMER_PRESETS.standard.seconds;

export function getTimerSeconds(mode: TimerMode = 'standard'): number {
  const preset = TIMER_PRESETS[mode] ?? TIMER_PRESETS.standard;
  return preset.seconds;
}

export function describeTimerMode(mode: TimerMode = 'standard'): { mode: TimerMode; label: string; seconds: number; description: string } {
  const preset = TIMER_PRESETS[mode] ?? TIMER_PRESETS.standard;
  return { mode, ...preset };
}

function keyToDate(key: string): Date | null {
  const parts = key.split('-').map(part => Number.parseInt(part, 10));
  if (parts.length !== 3 || parts.some(part => Number.isNaN(part))) {
    return null;
  }
  const [year, month, day] = parts;
  return new Date(Date.UTC(year, month - 1, day));
}

export function isSameChicagoDay(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  return a === b;
}

export function isNextChicagoDay(previousKey: string | undefined, currentKey: string): boolean {
  if (!previousKey) return false;
  const prevDate = keyToDate(previousKey);
  const currentDate = keyToDate(currentKey);
  if (!prevDate || !currentDate) return false;
  const diffDays = Math.round((currentDate.getTime() - prevDate.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays === 1;
}

export function dailySeedFor(date: Date = new Date()): string {
  return chicagoDateString(date); // stable seed "YYYY-MM-DD"
}
