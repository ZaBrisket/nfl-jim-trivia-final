import { Player, SeasonRow } from '../types';

export const players: Player[] = [
  { id: 'p1', firstName: 'Tom', lastName: 'Brady', displayName: 'Tom Brady', aliases: ['T. Brady'], position: 'QB', rookieYear: 2000, team: 'NE' },
  { id: 'p2', firstName: 'Barry', lastName: 'Sanders', displayName: 'Barry Sanders', aliases: ['B. Sanders'], position: 'RB', rookieYear: 1989, team: 'DET' },
  { id: 'p3', firstName: 'Jerry', lastName: 'Rice', displayName: 'Jerry Rice', aliases: ['J. Rice'], position: 'WR', rookieYear: 1985, team: 'SF' },
  { id: 'p4', firstName: 'Tony', lastName: 'Gonzalez', displayName: 'Tony Gonzalez', aliases: ['T. Gonzalez'], position: 'TE', rookieYear: 1997, team: 'KC' }
];

export const seasonsQB: SeasonRow[] = [
  { playerId: 'p1', year: 2007, team: 'NE', games: 16, passYds: 4806, passTD: 50, int: 8 }
];
export const seasonsRB: SeasonRow[] = [
  { playerId: 'p2', year: 1997, team: 'DET', games: 16, rushYds: 2053, rushTD: 11, recYds: 305 }
];
export const seasonsWR: SeasonRow[] = [
  { playerId: 'p3', year: 1995, team: 'SF', games: 16, recYds: 1848, recTD: 15 }
];
export const seasonsTE: SeasonRow[] = [
  { playerId: 'p4', year: 2004, team: 'KC', games: 16, recYds: 1258, recTD: 7 }
];
