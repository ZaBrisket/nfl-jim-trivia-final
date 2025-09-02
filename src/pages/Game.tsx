import React from 'react';
import { useData } from '../context/DataContext';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { GuessInput } from '../components/GuessInput';
import { HintButtons } from '../components/HintButtons';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { Timer } from '../components/Timer';
import { useNavigate } from 'react-router-dom';
import { isNameMatch } from '../utils/fuzzy';
import { initialState, reducer } from '../state/gameMachine';
import { saveState, loadState } from '../utils/storage';
import { randomInt, rotatePositions } from '../utils/random';
import { Player } from '../types';

function pickPlayer(players: Player[]): Player {
  const state = loadState();
  const ordered = rotatePositions(players, state.lastPosition ? [state.lastPosition] : []);
  const idx = randomInt(ordered.length);
  const p = ordered[idx];
  saveState({ lastPosition: p.position });
  return p;
}

export const Game: React.FC = () => {
  const nav = useNavigate();
  const { status, data } = useData();
  const [target, setTarget] = React.useState<Player | null>(null);
  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);

  React.useEffect(() => {
    if (data?.players?.length && state.tag === 'idle') {
      setTarget(pickPlayer(data.players));
    }
  }, [data, state.tag]);

  const onStart = () => dispatch({ type: 'start' });

  const onSubmitGuess = (text: string) => {
    if (!target || state.tag !== 'active') return;
    const match = isNameMatch(text, target);
    dispatch({ type: 'guess', text });
    if (match) dispatch({ type: 'reveal', reason: 'solved' });
  };

  const onHint = () => { if (state.tag === 'active') dispatch({ type: 'hint' }); };
  const onGiveUp = () => { if (state.tag === 'active') dispatch({ type: 'reveal', reason: 'giveup' }); };
  const onTimeout = () => { if (state.tag === 'active') dispatch({ type: 'reveal', reason: 'timeout' }); };

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
                <GuessInput disabled={false} onSubmitGuess={onSubmitGuess} />
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
                </div>
                <div>Final Score: <strong>{state.finalScore}</strong>/5</div>
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={() => { setTarget(pickPlayer(data.players)); dispatch({ type: 'reset' }); }}>Next Round</button>
                <button onClick={() => window.location.reload()}>Reset</button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
