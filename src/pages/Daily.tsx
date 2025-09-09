import React from 'react';
import { useData } from '../context/DataContext';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { GuessInput } from '../components/GuessInput';
import { HintButtons } from '../components/HintButtons';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { Timer } from '../components/Timer';
import { chicagoDateString, dailySeedFor } from '../utils/date';
import { initialState, reducer } from '../state/gameMachine';
import { isNameMatch } from '../utils/optimizedFuzzy';
import { seededInt } from '../utils/random';
import { Player } from '../types';
import { loadState, saveState, addRecentPlayer, updateGameStats, updateStreak } from '../utils/optimizedStorage';
import { Link } from 'react-router-dom';

function pickDaily(players: Player[]): Player {
  const key = dailySeedFor(new Date());
  const idx = seededInt(players.length, key);
  const p = players[idx];
  if (!p) throw new Error('No player found for daily pick');
  const S = loadState();
  saveState({ lastDailyKey: key, lastDailyId: p.id });
  return p;
}

export const Daily: React.FC = React.memo(() => {
  const { status, data } = useData();
  const [target, setTarget] = React.useState<Player | null>(null);
  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);
  const [key] = React.useState<string>(chicagoDateString());

  React.useEffect(() => {
    if (data?.players?.length && state.tag === 'idle') {
      setTarget(pickDaily(data.players));
    }
  }, [data, state.tag]);

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
      <h1>Daily — {key}</h1>
      <DataStatusBanner />
      {!status.ready && <div className="card">Loading data…</div>}
      {status.ready && target && (
        <div className="card">
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
                  <strong>Guess today’s player</strong> — Position: <em>{target.position}</em>
                </div>
                <Timer deadlineMs={state.deadlineMs} onTimeout={onTimeout} />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <GuessInput disabled={false} onSubmitGuess={onSubmitGuess} />
              </div>
              <div style={{ marginTop: 8 }}>
                <HintButtons disabled={false} onHint={onHint} onGiveUp={onGiveUp} />
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
                </div>
                <div>Final Score: <strong>{state.finalScore}</strong>/5</div>
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
});
