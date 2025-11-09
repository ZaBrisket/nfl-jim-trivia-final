import React from 'react';
import { TIMER_PRESETS, TimerMode } from '../utils/date';

type Props = {
  value: TimerMode;
  onChange(mode: TimerMode): void;
  label?: string;
};

const TimerModeSelector: React.FC<Props> = ({ value, onChange, label = 'Timer' }) => {
  return (
    <div className="timer-mode-selector">
      <span className="label">{label}</span>
      <div className="timer-mode-selector__options" role="radiogroup" aria-label="Timer speed">
        {(Object.keys(TIMER_PRESETS) as TimerMode[]).map(mode => {
          const preset = TIMER_PRESETS[mode];
          const active = value === mode;
          return (
            <button
              key={mode}
              type="button"
              className={active ? 'active' : ''}
              aria-pressed={active}
              onClick={() => onChange(mode)}
            >
              <span>{preset.label}</span>
              <small>{preset.seconds}s</small>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export { TimerModeSelector };
