import React from 'react';
import { TimerMode } from '../utils/date';
import { getTimerPreference, setTimerPreference } from '../utils/optimizedStorage';

export function useTimerPreference(): [TimerMode, (mode: TimerMode) => void] {
  const [mode, setMode] = React.useState<TimerMode>(() => getTimerPreference());

  const update = React.useCallback((next: TimerMode) => {
    setMode(next);
    setTimerPreference(next);
  }, []);

  return [mode, update];
}
