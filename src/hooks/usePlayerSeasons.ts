import React from 'react';
import { Player, SeasonRow } from '../types';
import { useData } from '../context/DataContext';

export type SeasonState =
  | { status: 'idle'; seasons: SeasonRow[]; error?: undefined }
  | { status: 'loading'; seasons: SeasonRow[]; error?: undefined }
  | { status: 'ready'; seasons: SeasonRow[]; error?: undefined }
  | { status: 'error'; seasons: SeasonRow[]; error: string };

export function usePlayerSeasons(player: Player | null): SeasonState {
  const { data } = useData();
  const [state, setState] = React.useState<SeasonState>({ status: 'idle', seasons: [] });

  React.useEffect(() => {
    let cancelled = false;

    if (!player || !data) {
      setState({ status: 'idle', seasons: [] });
      return () => { cancelled = true; };
    }

    setState(prev => ({
      status: 'loading',
      seasons: prev.seasons.length > 0 && prev.status === 'ready' ? prev.seasons : []
    }));

    data.loadSeasonsForPosition(player.position)
      .then(rows => {
        if (cancelled) return;
        const seasons = rows.filter(row => row.playerId === player.id).sort((a, b) => a.year - b.year);
        setState({ status: 'ready', seasons });
      })
      .catch(error => {
        if (cancelled) return;
        const message = error instanceof Error ? error.message : 'Failed to load player stats';
        setState({ status: 'error', error: message, seasons: [] });
      });

    return () => {
      cancelled = true;
    };
  }, [player?.id, player?.position, data]);

  return state;
}
