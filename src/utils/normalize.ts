import { SeasonRow } from '../types';

export function toNumber(val: unknown): number | null {
  if (val === null || val === undefined) return null;
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed === '' || trimmed === '—' || trimmed.toLowerCase() === 'pb') return null;
    const n = Number(trimmed.replace(/,/g, ''));
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

export function normalizeSeasonRow(row: Record<string, unknown>): SeasonRow | null {
  const playerId = String(row['playerId'] ?? row['id'] ?? '');
  const year = toNumber(row['year']);
  const team = String(row['team'] ?? '').trim().toUpperCase();
  if (!playerId || year === null || !team) return null;
  const out: SeasonRow = {
    playerId,
    year,
    team,
    games: toNumber(row['games']) ?? 0
  };
  for (const [k, v] of Object.entries(row)) {
    if (k in out) continue;
    const num = toNumber(v);
    out[k] = num ?? String(v ?? '');
  }
  return out;
}
