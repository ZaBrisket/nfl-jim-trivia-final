import React from 'react';
import { Link } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { GuessInput } from '../components/GuessInput';
import { HintButtons } from '../components/HintButtons';
import { HintList } from '../components/HintList';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { Timer } from '../components/Timer';
import { PlayerPortrait } from '../components/PlayerPortrait';
import { PlayerContextPanel } from '../components/PlayerContextPanel';
import { TimerModeSelector } from '../components/TimerModeSelector';
import { chicagoDateString, describeTimerMode, getTimerSeconds } from '../utils/date';
import { initialState, reducer, MAX_HINTS } from '../state/gameMachine';
import { isNameMatch } from '../utils/optimizedFuzzy';
import { seededInt } from '../utils/random';
import { Player } from '../types';
import { saveState, addRecentPlayer, updateGameStats, updateDailyStreak, getDailyStreakSnapshot } from '../utils/optimizedStorage';
import { usePlayerProfile } from '../hooks/usePlayerProfile';
import { useTimerPreference } from '../hooks/useTimerPreference';
import { getGuessFeedback } from '../utils/playerInsights';

function pickDaily(players: Player[]): Player {
  const key = chicagoDateString(new Date());
  const idx = seededInt(players.length, key);
  const p = players[idx];
  if (!p) throw new Error('No player found for daily pick');
  saveState({ lastDailyKey: key, lastDailyId: p.id });
  return p;
}

const Daily: React.FC = () => {
  const { status, data } = useData();
  const [target, setTarget] = React.useState<Player | null>(null);
  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);
  const [key] = React.useState<string>(chicagoDateString());
  const [streakInfo, setStreakInfo] = React.useState(() => getDailyStreakSnapshot());
  const [revealedHints, setRevealedHints] = React.useState<string[]>([]);
  const [guessFeedback, setGuessFeedback] = React.useState<string | null>(null);
  const [timerMode, setTimerMode] = useTimerPreference();
  const timerDescriptor = describeTimerMode(timerMode);
  const profile = usePlayerProfile(target);
  const hintCap = Math.min(MAX_HINTS, profile.hints.length || MAX_HINTS);
  const hintsUsed = state.tag === 'active' || state.tag === 'revealed' ? state.hintsUsed : 0;

  React.useEffect(() => {
    if (data?.players?.length && state.tag === 'idle') {
      setTarget(pickDaily(data.players));
    }
  }, [data, state.tag]);

  React.useEffect(() => {
    setRevealedHints([]);
    setGuessFeedback(null);
  }, [target?.id]);

  React.useEffect(() => {
    if (state.tag !== 'active') {
      setGuessFeedback(null);
    }
  }, [state.tag]);

  React.useEffect(() => {
    if (state.tag === 'revealed' && target) {
      const correct = state.reason === 'solved';
      const guessTime = state.endedAtMs - (state.tag === 'revealed' && 'guesses' in state ? 0 : Date.now());

      updateGameStats(target.position, correct, state.finalScore, guessTime > 0 ? guessTime / 1000 : undefined);
      const newStreak = updateDailyStreak(key, correct);
      setStreakInfo(newStreak);
      addRecentPlayer(target.id);
    }
  }, [state, target, key]);

  const onStart = React.useCallback(() => dispatch({ type: 'start', durationSeconds: getTimerSeconds(timerMode) }), [timerMode]);

  const onSubmitGuess = React.useCallback((text: string) => {
    if (!target || state.tag !== 'active') return;
    const match = isNameMatch(text, target);
    dispatch({ type: 'guess', text });
    if (match) {
      dispatch({ type: 'reveal', reason: 'solved' });
      setGuessFeedback(null);
    } else {
      setGuessFeedback(getGuessFeedback(text, target));
    }
  }, [target, state.tag]);

  const onHint = React.useCallback(() => {
    if (state.tag !== 'active') return;
    if (state.hintsUsed >= hintCap) return;
    dispatch({ type: 'hint' });
    setRevealedHints((prev) => {
      const nextHint = profile.hints[prev.length];
      return nextHint ? [...prev, nextHint] : prev;
    });
  }, [state.tag, state.hintsUsed, hintCap, profile.hints]);

  const onGiveUp = React.useCallback(() => {
    if (state.tag === 'active') dispatch({ type: 'reveal', reason: 'giveup' });
  }, [state.tag]);

  const onTimeout = React.useCallback(() => {
    if (state.tag === 'active') dispatch({ type: 'reveal', reason: 'timeout' });
  }, [state.tag]);

  return (
    <div className="container">
      <h1>Daily - {key}</h1>
      <DataStatusBanner />
      {!status.ready && <div className="card">Loading data.</div>}
      {status.ready && target && (
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <TimerModeSelector value={timerMode} onChange={setTimerMode} />
            <div className="daily-streak-pill" aria-live="polite">
              <span className="label">Daily streak</span>
              <strong>{streakInfo.current}</strong>
              <span className="subtext">Best {streakInfo.best}</span>
            </div>
          </div>
          {state.tag === 'idle' && (
            <div className="row">
              <button onClick={onStart}>Start Daily</button>
              <Link to="/">Switch to Endless</Link>
            </div>
          )}
          {state.tag === 'active' && (
            <>
              <div className="row">
                <div className="grow">
                  <strong>Guess today's player</strong> - Position: <em>{target.position}</em>
                </div>
                <Timer deadlineMs={state.deadlineMs} onTimeout={onTimeout} modeLabel={timerDescriptor.label} />
              </div>
              <div style={{ marginTop: 12 }}>
                <PlayerPortrait player={target} hideIdentity seasonState={profile.seasonState} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <GuessInput
                  disabled={state.tag !== 'active'}
                  onSubmitGuess={onSubmitGuess}
                  players={data?.players || []}
                />
              </div>
              {guessFeedback && (
                <div className="guess-feedback" role="status" aria-live="polite">
                  {guessFeedback}
                </div>
              )}
              <div style={{ marginTop: 8 }}>
                <HintButtons
                  disabled={state.tag !== 'active'}
                  hintsUsed={hintsUsed}
                  maxHints={hintCap}
                  onHint={onHint}
                  onGiveUp={onGiveUp}
                />
                <HintList hints={revealedHints} />
              </div>
              <div style={{ marginTop: 8 }}>
                <KeyboardShortcuts enabled={true} onSubmit={() => {}} onHint={onHint} onGiveUp={onGiveUp} />
              </div>
            </>
          )}
          {state.tag === 'revealed' && (
            <>
              <div className="row">
                <div className="grow">
                  <h2>Answer: {target.displayName}</h2>
                  <div>Reason: {state.reason}</div>
                  {streakInfo.current > 0 && (
                    <div style={{ marginTop: 8 }}>
                      🌤️ Daily Streak: <strong>{streakInfo.current}</strong> | Best: {streakInfo.best}
                    </div>
                  )}
                </div>
                <div>Final Score: <strong>{state.finalScore}</strong>/5</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <PlayerPortrait player={target} seasonState={profile.seasonState} />
              </div>
              <PlayerContextPanel summary={profile.summary} />
              <div style={{ marginTop: 12 }}>
                <HintList hints={revealedHints} />
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={() => window.location.reload()}>Come back tomorrow</button>
                <Link to="/">Play Endless</Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export { Daily };
