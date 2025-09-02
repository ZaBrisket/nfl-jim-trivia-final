// Crypto-strong randomness where available.
export function randomInt(maxExclusive: number): number {
  if (maxExclusive <= 0) return 0;
  if (crypto && 'getRandomValues' in crypto) {
    const arr = new Uint32Array(1);
    crypto.getRandomValues(arr);
    return arr[0] % maxExclusive;
  }
  return Math.floor(Math.random() * maxExclusive);
}

// Deterministic PRNG (xorshift32) for seeded daily behavior.
export function seededInt(maxExclusive: number, seedStr: string): number {
  let h = 2166136261 >>> 0;
  for (let i = 0; i < seedStr.length; i++) {
    h ^= seedStr.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  // xorshift
  h ^= h << 13;
  h ^= h >>> 17;
  h ^= h << 5;
  const x = (h >>> 0) / 4294967296;
  return Math.floor(x * maxExclusive);
}

export function rotatePositions<T extends { position: string }>(items: T[], recent: string[]): T[] {
  // Provide a gentle round-robin by position to avoid long streaks of the same role.
  const positions = ['QB', 'RB', 'WR', 'TE'];
  const last = recent[recent.length - 1];
  const startIdx = Math.max(0, positions.indexOf(last ?? 'QB'));
  const ordered = positions.slice(startIdx + 1).concat(positions.slice(0, startIdx + 1));
  const buckets = new Map<string, T[]>();
  for (const p of positions) buckets.set(p, []);
  for (const it of items) buckets.get(it.position)?.push(it);
  const out: T[] = [];
  for (const p of ordered) out.push(...(buckets.get(p) ?? []));
  return out.length ? out : items;
}
