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

export const ROUND_SECONDS = 60;

export function dailySeedFor(date: Date = new Date()): string {
  return chicagoDateString(date); // stable seed "YYYY-MM-DD"
}
