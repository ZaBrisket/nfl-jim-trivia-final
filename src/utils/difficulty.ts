import { Player } from '../types';

const REFERENCE_YEAR = 2025;
const RECENCY_SPAN_YEARS = 20;
const CAREER_SPAN_YEARS = 12;

/**
 * Returns a 0-1 difficulty score where 0 = easiest (recent, short careers)
 * and 1 = hardest (older, long-tenured players).
 */
export function getPlayerDifficulty(player: Player, referenceYear: number = REFERENCE_YEAR): number {
  const rookieYear = player.rookieYear ?? referenceYear;
  const yearsSinceRookie = Math.max(0, referenceYear - rookieYear);

  const recencyScore = Math.min(yearsSinceRookie / RECENCY_SPAN_YEARS, 1);
  const careerScore = Math.min(yearsSinceRookie / CAREER_SPAN_YEARS, 1);

  const combined = (recencyScore * 0.7) + (careerScore * 0.3);
  return Math.min(1, Math.max(0, combined));
}
