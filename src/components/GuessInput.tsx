import React from 'react';

type Props = {
  disabled?: boolean;
  onSubmitGuess(text: string): void;
};

const GuessInput: React.FC<Props> = ({ disabled, onSubmitGuess }) => {
  const [text, setText] = React.useState('');

  const onSubmit = React.useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    onSubmitGuess(text);
    setText('');
  }, [onSubmitGuess, text]);

  return (
    <form onSubmit={onSubmit} className="row" aria-label="Guess form">
      <input
        id="guess-input"
        type="text"
        aria-label="Enter your guess"
        placeholder="Type a player name…"
        value={text}
        onChange={(e) => setText(e.target.value)}
        disabled={disabled}
      />
      <button type="submit" disabled={disabled}>Guess</button>
    </form>
  );
};

export { GuessInput };
