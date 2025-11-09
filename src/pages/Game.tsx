import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useData } from '../context/DataContext';
import { DataStatusBanner } from '../components/DataStatusBanner';
import { GuessInput } from '../components/GuessInput';
import { HintButtons } from '../components/HintButtons';
import { KeyboardShortcuts } from '../components/KeyboardShortcuts';
import { Timer } from '../components/Timer';
import { PlayerPortrait } from '../components/PlayerPortrait';
import { isNameMatch } from '../utils/optimizedFuzzy';
import { initialState, reducer } from '../state/gameMachine';
import { addRecentPlayer, updateGameStats, updateStreak } from '../utils/optimizedStorage';
import { randomInt } from '../utils/random';
import { getPlayerDifficulty } from '../utils/difficulty';
import { Player } from '../types';

const PLAYERS_PER_ROUND = 5;
const MAX_DIFFICULTY_LEVEL = 10;
const DIFFICULTY_WINDOW_RATIO = 0.12;

type ScoredPlayer = { player: Player; difficulty: number };

const clamp = (value: number, min: number, max: number) => Math.min(Math.max(value, min), max);

const samplePlayers = (pool: Player[], count: number): Player[] => {
  const available = [...pool];
  const picks: Player[] = [];

  while (available.length > 0 && picks.length < count) {
    const idx = randomInt(available.length);
    const [player] = available.splice(idx, 1);
    if (player) picks.push(player);
  }

  return picks;
};

function selectPlayersForRound(
  scoredPlayers: ScoredPlayer[],
  roundNumber: number,
  usedIds: Set<string>
): Player[] {
  if (scoredPlayers.length === 0) return [];

  const normalizedDifficulty = clamp(
    (roundNumber - 1) / (MAX_DIFFICULTY_LEVEL - 1),
    0,
    1
  );

  const windowSize = Math.max(
    Math.floor(scoredPlayers.length * DIFFICULTY_WINDOW_RATIO),
    PLAYERS_PER_ROUND * 4
  );

  const targetIndex = Math.floor(normalizedDifficulty * (scoredPlayers.length - 1));
  const windowStart = clamp(
    targetIndex - Math.floor(windowSize / 2),
    0,
    Math.max(0, scoredPlayers.length - windowSize)
  );

  const windowEnd = Math.min(scoredPlayers.length, windowStart + windowSize);
  const slice = scoredPlayers.slice(windowStart, windowEnd);

  const unusedPool = slice.filter(entry => !usedIds.has(entry.player.id));
  const source = unusedPool.length >= PLAYERS_PER_ROUND ? unusedPool : slice;

  let selection = samplePlayers(source.map(entry => entry.player), PLAYERS_PER_ROUND);

  if (selection.length < PLAYERS_PER_ROUND) {
    const fallback = scoredPlayers
      .map(entry => entry.player)
      .filter(player => !selection.some(p => p.id === player.id))
      .slice(0, PLAYERS_PER_ROUND - selection.length);
    selection = selection.concat(fallback);
  }

  return selection.slice(0, PLAYERS_PER_ROUND);
}

const Game: React.FC = () => {
  const nav = useNavigate();
  const { status, data } = useData();
  const players = data?.players ?? [];

  const scoredPlayers = React.useMemo<ScoredPlayer[]>(() => {
    if (!players.length) return [];
    return players
      .map((player) => ({
        player,
        difficulty: getPlayerDifficulty(player)
      }))
      .sort((a, b) => a.difficulty - b.difficulty);
  }, [players]);

  const [state, dispatch] = React.useReducer(reducer, undefined, initialState);
  const [streakInfo, setStreakInfo] = React.useState({ current: 0, best: 0 });
  const [roundNumber, setRoundNumber] = React.useState(1);
  const [roundPlayers, setRoundPlayers] = React.useState<Player[]>([]);
  const [playerIndex, setPlayerIndex] = React.useState(0);
  const [target, setTarget] = React.useState<Player | null>(null);
  const [usedPlayerIds, setUsedPlayerIds] = React.useState<string[]>([]);
  const usedIdSet = React.useMemo(() => new Set(usedPlayerIds), [usedPlayerIds]);

  const difficultyLabel = Math.min(roundNumber, MAX_DIFFICULTY_LEVEL);
  const currentPlayerNumber = target ? playerIndex + 1 : 1;

  React.useEffect(() => {
    if (!scoredPlayers.length) return;
    if (roundPlayers.length === PLAYERS_PER_ROUND) return;

    const selection = selectPlayersForRound(scoredPlayers, roundNumber, usedIdSet);
    if (selection.length === PLAYERS_PER_ROUND) {
      setRoundPlayers(selection);
      setPlayerIndex(0);
    }
  }, [scoredPlayers, roundPlayers.length, roundNumber, usedIdSet]);

  React.useEffect(() => {
    if (roundPlayers.length !== PLAYERS_PER_ROUND) return;
    setUsedPlayerIds((prev) => {
      const merged = new Set(prev);
      roundPlayers.forEach((player) => merged.add(player.id));
      return Array.from(merged);
    });
  }, [roundPlayers]);

  React.useEffect(() => {
    const nextTarget = roundPlayers[playerIndex] ?? null;
    setTarget(nextTarget);
  }, [roundPlayers, playerIndex]);

  // Track game stats when each player is revealed
  React.useEffect(() => {
    if (state.tag === 'revealed' && target) {
      const correct = state.reason === 'solved';
      const guessTime = state.endedAtMs - (state.tag === 'revealed' && 'guesses' in state ? 0 : Date.now());

      updateGameStats(target.position, correct, state.finalScore, guessTime > 0 ? guessTime / 1000 : undefined);
      const newStreak = updateStreak(correct);
      setStreakInfo(newStreak);
      addRecentPlayer(target.id);
    }
  }, [state, target]);

  const onStart = React.useCallback(() => {
    if (!target) return;
    dispatch({ type: 'start' });
  }, [target]);

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

  const onNextPlayer = React.useCallback(() => {
    if (state.tag !== 'revealed') return;
    dispatch({ type: 'reset' });
    const nextIndex = playerIndex + 1;
    if (nextIndex < PLAYERS_PER_ROUND) {
      setPlayerIndex(nextIndex);
    } else {
      setRoundPlayers([]);
      setPlayerIndex(0);
      setRoundNumber((prev) => prev + 1);
    }
  }, [state.tag, playerIndex]);

  return (
    <div className="container">
      <h1>Endless Mode</h1>
      <DataStatusBanner />
      {!status.ready && <div className="card">Loading data.</div>}
      {status.ready && (
        <div className="card">
          <div className="row" style={{ marginBottom: 12 }}>
            <div className="grow">
              <div>
                <strong>Round {roundNumber}</strong> · Player {Math.min(currentPlayerNumber, PLAYERS_PER_ROUND)} of {PLAYERS_PER_ROUND}
              </div>
              <div style={{ fontSize: 12, opacity: 0.8 }}>
                Difficulty {difficultyLabel}/10
              </div>
            </div>
            <button onClick={() => nav('/daily')}>Go to Daily</button>
          </div>

          {state.tag === 'idle' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {target ? (
                <>
                  <div>Ready for the next player? Press start when you are!</div>
                  <button onClick={onStart}>
                    Start Player {currentPlayerNumber}
                  </button>
                </>
              ) : (
                <div>Preparing players for the next round…</div>
              )}
            </div>
          )}

          {state.tag === 'active' && target && (
            <>
              <div className="row">
                <div className="grow">
                  <strong>Guess the player</strong> - Position: <em>{target.position}</em>
                </div>
                <Timer deadlineMs={state.deadlineMs} onTimeout={onTimeout} />
              </div>
              <div style={{ marginTop: 12 }}>
                <PlayerPortrait player={target} hideIdentity />
              </div>
              <div className="row" style={{ marginTop: 8 }}>
                <GuessInput
                  disabled={state.tag !== 'active'}
                  onSubmitGuess={onSubmitGuess}
                  players={players}
                />
              </div>
              <div style={{ marginTop: 8 }}>
                <HintButtons disabled={state.tag !== 'active'} onHint={onHint} onGiveUp={onGiveUp} />
              </div>
              <div style={{ marginTop: 8 }}>
                <KeyboardShortcuts enabled={state.tag === 'active'} onSubmit={() => {}} onHint={onHint} onGiveUp={onGiveUp} />
              </div>
            </>
          )}

          {state.tag === 'revealed' && target && (
            <>
              <div className="row">
                <div className="grow">
                  <h2>Answer: {target.displayName}</h2>
                  <div>Reason: {state.reason}</div>
                  {streakInfo.current > 0 && (
                    <div style={{ marginTop: 8 }}>
                      ?? Current Streak: <strong>{streakInfo.current}</strong> | Best: {streakInfo.best}
                    </div>
                  )}
                </div>
                <div>Final Score: <strong>{state.finalScore}</strong>/5</div>
              </div>
              <div style={{ marginTop: 12 }}>
                <PlayerPortrait player={target} />
              </div>
              <div className="row" style={{ marginTop: 12 }}>
                <button onClick={onNextPlayer}>
                  {playerIndex >= PLAYERS_PER_ROUND - 1 ? 'Start Next Round' : 'Next Player'}
                </button>
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
