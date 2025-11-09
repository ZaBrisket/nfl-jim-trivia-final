export type Position = 'QB' | 'RB' | 'WR' | 'TE';

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  aliases?: string[];
  position: Position;
  rookieYear?: number;
  team?: string;
}

export interface SeasonRow {
  playerId: string;
  year: number;
  team: string;
  games: number;
  awards?: string;
  [k: string]: number | string | undefined;
}

export interface DataStatus {
  ready: boolean;
  error?: string;
  partial?: boolean;
  details?: string[];
}

export type RoundState =
  | { tag: 'idle' }
  | {
      tag: 'active';
      startedAtMs: number;
      deadlineMs: number;
      guesses: string[];
      hintsUsed: number;
      score: number;
    }
  | {
      tag: 'revealed';
      endedAtMs: number;
      reason: 'solved' | 'timeout' | 'giveup' | 'maxGuesses';
      finalScore: number;
      guesses: string[];
      hintsUsed: number;
    };
