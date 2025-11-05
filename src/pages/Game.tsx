import React from 'react';
import { useData } from '../context/DataContext';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { GuessInput } from '../components/GuessInput';
import { HintButtons } from '../components/HintButtons';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { Timer } from '../components/Timer';
import { useNavigate } from 'react-router-dom';
import { isNameMatch } from '../utils/optimizedFuzzy';
import { initialState, reducer } from '../state/gameMachine';
import { saveState, loadState, addRecentPlayer, updateGameStats, updateStreak } from '../utils/optimizedStorage';
import { randomInt, rotatePositions } from '../utils/random';
import { Player } from '../types';

function pickPlayer(players: Player[]): Player {
  const state = loadState();
  const ordered = rotatePositions(players, state.lastPosition ? [state.lastPosition] : []);
  const idx = randomInt(ordered.length);
  const p = ordered[idx];
  if (!p) throw new Error('No player found for game');
  saveState({ lastPosition: p.position });
  return p;
}

const Game: React.FC = () => {
  const nav = useNavigate();
  const { status, data } = useData();
  const [target, setTarget] = React.useState<Player | null>(null);
  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);
  const [streakInfo, setStreakInfo] = React.useState({ current: 0, best: 0 });

  React.useEffect(() => {
    if (data?.players?.length && state.tag === 'idle') {
      setTarget(pickPlayer(data.players));
    }
  }, [data, state.tag]);

  // Track game stats when game ends
  React.useEffect(() => {
    if (state.tag === 'revealed' && target) {
      const correct = state.reason === 'solved';
      const guessTime = state.endedAtMs - (state.tag === 'revealed' && 'guesses' in state ? 0 : Date.now());

      // Update game statistics
      updateGameStats(target.position, correct, state.finalScore, guessTime > 0 ? guessTime / 1000 : undefined);

      // Update streak
      const newStreak = updateStreak(correct);
      setStreakInfo(newStreak);

      // Add to recent players
      addRecentPlayer(target.id);
    }
  }, [state, target]);

  const onStart = React.useCallback(() => dispatch({ type: 'start' }), []);

  const onSubmitGuess = React.useCallback((text: string) => {
    if (!target || state.tag !== 'active') return;
    const match = isNameMatch(text, target);
    dispatch({ type: 'guess', text });
    if (match) dispatch({ type: 'reveal', reason: 'solved' });
  }, [target, state.tag]);

  const onHint = React.useCallback(() => { 
    if (state.tag === 'active') dispatch({ type: 'hint' }); 
  }, [state.tag]);
  
  const onGiveUp = React.useCallback(() => { 
    if (state.tag === 'active') dispatch({ type: 'reveal', reason: 'giveup' }); 
  }, [state.tag]);
  
  const onTimeout = React.useCallback(() => { 
    if (state.tag === 'active') dispatch({ type: 'reveal', reason: 'timeout' }); 
  }, [state.tag]);

  return (
    <div className="container">
      <h1>Endless Mode</h1>
      <DataStatusBanner />
      {!status.ready && <div className="card">Loading data…</div>}
      {status.ready && target && (
        <div className="card">
          {state.tag === 'idle' && (
            <div className="row">
              <button onClick={onStart}>Start Round</button>
              <button onClick={() => nav('/daily')}>Go to Daily</button>
            </div>
          )}

          {state.tag === 'active' && (
            <>
              <div className="row">
                <div className="grow">
                  <strong>Guess the player</strong> — Position: <em>{target.position}</em>
                </div>
                <Timer deadlineMs={state.deadlineMs} onTimeout={onTimeout} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <GuessInput
                  disabled={false}
                  onSubmitGuess={onSubmitGuess}
                  players={data?.players || []}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <HintButtons disabled={false} onHint={onHint} onGiveUp={onGiveUp} />
              </div>
              <div style={{ marginTop: 8 }}>
                <KeyboardShortcuts enabled={true} onSubmit={() => { /* handled by form */ }} onHint={onHint} onGiveUp={onGiveUp} />
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
                      🔥 Current Streak: <strong>{streakInfo.current}</strong> | Best: {streakInfo.best}
                    </div>
                  )}
                </div>
                <div>Final Score: <strong>{state.finalScore}</strong>/5</div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={() => { if (data?.players) { setTarget(pickPlayer(data.players)); dispatch({ type: 'reset' }); } }}>Next Round</button>
                <button onClick={() => window.location.reload()}>Reset</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export { Game };
