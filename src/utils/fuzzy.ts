import { Player } from '../types';

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

// Jaro-Winkler like bias: quick and sufficient for short strings
function similarity(a: string, b: string): number {
  if (a === b) return 1;
  const ta = tokens(a);
  const tb = tokens(b);
  const setA = new Set(ta);
  const setB = new Set(tb);
  let inter = 0;
  for (const t of setA) if (setB.has(t)) inter++;
  const denom = Math.max(setA.size, setB.size, 1);
  return inter / denom;
}

export function isNameMatch(input: string, player: Player): boolean {
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
  const score = similarity(iNorm, full);
  if (score >= 0.75) return true;

  // Last name + first initial
  const fi = (player.firstName[0] || '').toLowerCase();
  const [maybeFirst, maybeLast] = iNorm.split(' ');
  if (maybeLast && maybeFirst && maybeFirst[0] === fi && normalizeName(player.lastName) === maybeLast) {
    return true;
  }

  return false;
}
