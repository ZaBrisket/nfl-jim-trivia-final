import React from 'react';
import { Player } from '../types';
import { SeasonState, usePlayerSeasons } from './usePlayerSeasons';
import { PlayerSummary, generatePlayerHints, summarizePlayer } from '../utils/playerInsights';

export type PlayerProfile = {
  seasonState: SeasonState;
  summary?: PlayerSummary;
  hints: string[];
};

export function usePlayerProfile(player: Player | null): PlayerProfile {
  const seasonState = usePlayerSeasons(player);

  const summary = React.useMemo<PlayerSummary | undefined>(() => {
    if (!player) return undefined;
    if (seasonState.seasons.length === 0) return undefined;
    return summarizePlayer(player, seasonState.seasons);
  }, [player, seasonState.seasons]);

  const hints = React.useMemo(() => {
    if (!player) return [];
    return generatePlayerHints(player, summary, seasonState.seasons);
  }, [player, summary, seasonState.seasons]);

  return { seasonState, summary, hints };
}
