import React, { createContext, useContext, useEffect, useMemo, useState, useCallback } from 'react';
import { DataStatus, Player, Position, SeasonRow } from '../types';
import { dataService, DataIndex } from '../services/dataService';
import { initializeFuzzyMatcher } from '../utils/optimizedFuzzy';

type Data = {
  players: Player[];
  index: DataIndex;
  loadSeasonsForPosition: (position: Position) => Promise<SeasonRow[]>;
};

type Ctx = {
  status: DataStatus;
  data?: Data;
  reload(): void;
};

const DataContext = createContext<Ctx | undefined>(undefined);

export const DataProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [status, setStatus] = useState<DataStatus>({ ready: false });
  const [data, setData] = useState<Data | undefined>(undefined);
  const [nonce, setNonce] = useState(0);

  const loadSeasonsForPosition = useCallback(async (position: Position) => {
    return await dataService.loadSeasonsForPosition(position);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { index, status } = await dataService.initialize();
      if (!cancelled) {
        setStatus(status);
        if (index) {
          const players = index.getAllPlayers();
          // Initialize fuzzy matcher with player data
          initializeFuzzyMatcher(players);
          setData({
            players,
            index,
            loadSeasonsForPosition
          });
        }
      }
    })();
    return () => { cancelled = true; };
  }, [nonce, loadSeasonsForPosition]);

  const reload = useCallback(() => {
    dataService.clearCaches();
    setNonce((n) => n + 1);
  }, []);

  const ctx = useMemo<Ctx>(() => ({
    status, 
    data, 
    reload
  }), [status, data, reload]);

  return <DataContext.Provider value={ctx}>{children}</DataContext.Provider>;
};

export function useData(): Ctx {
  const ctx = useContext(DataContext);
  if (!ctx) throw new Error('useData must be used within DataProvider');
  return ctx;
}
