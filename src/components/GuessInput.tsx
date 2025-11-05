import React, { useRef, useState } from 'react';
import { Player } from '../types';
import { usePlayerSuggestions } from '../hooks/usePlayerSuggestions';
import { PlayerSuggestions } from './PlayerSuggestions';

type Props = {
  disabled?: boolean;
  onSubmitGuess(text: string): void;
  players?: Player[]; // Optional: provide for autocomplete
};

const GuessInput: React.FC<Props> = ({ disabled, onSubmitGuess, players = [] }) => {
  const [text, setText] = React.useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    suggestions,
    selectedIndex,
    selectNext,
    selectPrevious,
    getSelectedPlayer,
    reset,
    hasSuggestions
  } = usePlayerSuggestions(players, text);

  const submitGuess = React.useCallback((guessText: string) => {
    if (!guessText.trim()) return;
    onSubmitGuess(guessText);
    setText('');
    reset();
    setShowSuggestions(false);
  }, [onSubmitGuess, reset]);

  const onSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();

    // If a suggestion is selected, use that
    const selectedPlayer = getSelectedPlayer();
    if (selectedPlayer) {
      submitGuess(selectedPlayer.displayName);
    } else {
      submitGuess(text);
    }
  }, [text, getSelectedPlayer, submitGuess]);

  const handleKeyDown = React.useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!hasSuggestions || !showSuggestions) {
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        selectNext();
        break;
      case 'ArrowUp':
        e.preventDefault();
        selectPrevious();
        break;
      case 'Escape':
        e.preventDefault();
        setShowSuggestions(false);
        reset();
        break;
      case 'Tab':
        // Allow tab to select highlighted suggestion
        if (selectedIndex >= 0) {
          e.preventDefault();
          const selectedPlayer = getSelectedPlayer();
          if (selectedPlayer) {
            setText(selectedPlayer.displayName);
            setShowSuggestions(false);
            reset();
          }
        }
        break;
    }
  }, [hasSuggestions, showSuggestions, selectNext, selectPrevious, selectedIndex, getSelectedPlayer, reset]);

  const handleInputChange = React.useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setText(value);

    // Show suggestions when typing
    if (value.length >= 2 && players.length > 0) {
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [players.length]);

  const handleFocus = React.useCallback(() => {
    if (text.length >= 2 && hasSuggestions) {
      setShowSuggestions(true);
    }
  }, [text.length, hasSuggestions]);

  const handleBlur = React.useCallback(() => {
    // Delay hiding to allow clicking on suggestions
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  }, []);

  const handleSuggestionSelect = React.useCallback((player: Player) => {
    setText(player.displayName);
    setShowSuggestions(false);
    reset();

    // Focus back on input
    inputRef.current?.focus();

    // Auto-submit the selection
    submitGuess(player.displayName);
  }, [reset, submitGuess]);

  return (
    <div
      ref={containerRef}
      style={{ position: 'relative', flex: 1 }}
    >
      <form onSubmit={onSubmit} className="row" aria-label="Guess form">
        <input
          ref={inputRef}
          id="guess-input"
          type="text"
          aria-label="Enter your guess"
          aria-autocomplete="list"
          aria-controls="player-suggestions"
          aria-expanded={showSuggestions && hasSuggestions}
          placeholder="Type a player name…"
          value={text}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onBlur={handleBlur}
          disabled={disabled}
          autoComplete="off"
        />
        <button type="submit" disabled={disabled}>Guess</button>
      </form>

      <PlayerSuggestions
        suggestions={suggestions}
        selectedIndex={selectedIndex}
        onSelect={handleSuggestionSelect}
        visible={showSuggestions}
      />
    </div>
  );
};

export { GuessInput };
