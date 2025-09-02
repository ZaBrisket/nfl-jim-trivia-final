import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { DataStatus, Player, Position, SeasonRow } from '../types';
import { fetchWithRetry } from '../utils/retry';
import { normalizeSeasonRow } from '../utils/normalize';
import * as fallback from '../data/fallbackPlayers';

type Data = {
  players: Player[];
  seasons: Record<Position, SeasonRow[]>;
};

type Ctx = {
  status: DataStatus;
  data?: Data;
  reload(): void;
};

const DataContext = createContext<Ctx | undefined>(undefined);

async function loadJson<T>(path: string): Promise<T> {
  const res = await fetchWithRetry(path, {}, 2, 300);
  return (await res.json()) as T;
}

async function loadData(): Promise<{ data?: Data; status: DataStatus }> {
  const details: string[] = [];
  const useFallback: string[] = [];

  let players: Player[] | undefined;
  try {
    players = await loadJson<Player[]>('/data/players.json');
    details.push('players:network');
  } catch {
    players = fallback.players;
    details.push('players:fallback');
    useFallback.push('players');
  }

  const seasons: Record<Position, SeasonRow[]> = { QB: [], RB: [], WR: [], TE: [] };

  async function loadSeason(pos: Position, file: string, fb: SeasonRow[]) {
    try {
      const raw = await loadJson<Record<string, unknown>[]>(file);
      const norm: SeasonRow[] = [];
      for (const r of raw) {
        const row = normalizeSeasonRow(r);
        if (row) norm.push(row);
      }
      seasons[pos] = norm;
      details.push(`${pos}:network`);
    } catch {
      seasons[pos] = fb;
      details.push(`${pos}:fallback`);
      useFallback.push(pos);
    }
  }

  await Promise.all([
    loadSeason('QB', '/data/seasons_qb.json', fallback.seasonsQB),
    loadSeason('RB', '/data/seasons_rb.json', fallback.seasonsRB),
    loadSeason('WR', '/data/seasons_wr.json', fallback.seasonsWR),
    loadSeason('TE', '/data/seasons_te.json', fallback.seasonsTE)
  ]);

  const partial = useFallback.length > 0;
  const ready = !!players && Object.values(seasons).every((s) => s.length > 0);
  const status: DataStatus = { ready, partial, details: details };
  if (!ready) status.error = 'Data failed to fully load.';
  return { data: ready ? { players: players!, seasons } : undefined, status };
}

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<DataStatus>({ ready: false });
  const [data, setData] = useState<Data | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data, status } = await loadData();
      if (!cancelled) {
        setStatus(status);
        setData(data);
      }
    })();
    return () => { cancelled = true; };
  }, [nonce]);

  const ctx = useMemo<Ctx>(() => ({
    status, data, reload: () => setNonce((n) => n + 1)
  }), [status, data]);

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
};

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
