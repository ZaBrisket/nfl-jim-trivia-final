import { Player, SeasonRow } from '../types';

const TEAM_NAME_BY_CODE: Record<string, string> = {
  ARI: 'Arizona Cardinals',
  ATL: 'Atlanta Falcons',
  BAL: 'Baltimore Ravens',
  BUF: 'Buffalo Bills',
  CAR: 'Carolina Panthers',
  CHI: 'Chicago Bears',
  CIN: 'Cincinnati Bengals',
  CLE: 'Cleveland Browns',
  DAL: 'Dallas Cowboys',
  DEN: 'Denver Broncos',
  DET: 'Detroit Lions',
  GNB: 'Green Bay Packers',
  HOU: 'Houston Texans',
  IND: 'Indianapolis Colts',
  JAX: 'Jacksonville Jaguars',
  JAC: 'Jacksonville Jaguars',
  KAN: 'Kansas City Chiefs',
  LVR: 'Las Vegas Raiders',
  LAC: 'Los Angeles Chargers',
  SDG: 'San Diego Chargers',
  LAR: 'Los Angeles Rams',
  STL: 'St. Louis Rams',
  RAM: 'Los Angeles Rams',
  MIA: 'Miami Dolphins',
  MIN: 'Minnesota Vikings',
  NWE: 'New England Patriots',
  NOR: 'New Orleans Saints',
  NO: 'New Orleans Saints',
  NYG: 'New York Giants',
  NYJ: 'New York Jets',
  PHI: 'Philadelphia Eagles',
  PHO: 'Phoenix Cardinals',
  PIT: 'Pittsburgh Steelers',
  SEA: 'Seattle Seahawks',
  SFO: 'San Francisco 49ers',
  TAM: 'Tampa Bay Buccaneers',
  TEN: 'Tennessee Titans',
  WAS: 'Washington Commanders',
  WFT: 'Washington Football Team',
  OAK: 'Oakland Raiders',
  SD: 'San Diego Chargers',
  '2TM': 'Multiple Teams',
  '3TM': 'Multiple Teams',
  TOT: 'Multiple Teams'
};

const numberFormatter = new Intl.NumberFormat('en-US');
const TARGET_HINTS = 5;

const NAME_SANITIZE = /[^a-z]/g;

const STAT_FIELDS = {
  passYds: 'passing yards',
  passTd: 'passing touchdowns',
  rushYds: 'rushing yards',
  rushTd: 'rushing touchdowns',
  rec: 'receptions',
  recYds: 'receiving yards',
  recTd: 'receiving touchdowns',
  scrimmageYds: 'yards from scrimmage'
} as const;

const NAME_HINT_TEMPLATES = [
  (player: Player) =>
    `Last name starts with "${player.lastName[0]}" and has ${player.lastName.length} letters.`,
  (player: Player) =>
    `First name has ${player.firstName.length} letters and starts with "${player.firstName[0]}".`,
  (player: Player) =>
    `Both names together are ${player.firstName.length + player.lastName.length} letters long.`
];

type NumericRow = Record<string, number>;

const toNumber = (value: number | string | undefined): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
};

const sumField = (rows: SeasonRow[], field: string): number =>
  rows.reduce((total, row) => total + toNumber(row[field]), 0);

const formatNumber = (value: number, options?: { decimals?: number }): string => {
  const rounded = options?.decimals ? Number(value.toFixed(options.decimals)) : Math.round(value);
  return numberFormatter.format(rounded);
};

const normalizeTeamCode = (team?: string): string | undefined => {
  if (!team) return undefined;
  const trimmed = team.trim().toUpperCase();
  if (!trimmed) return undefined;
  return trimmed;
};

const formatTeamName = (team?: string): string | undefined => {
  if (!team) return undefined;
  const code = normalizeTeamCode(team);
  if (!code) return undefined;
  return TEAM_NAME_BY_CODE[code] ?? code;
};

const unique = <T,>(arr: T[]): T[] => Array.from(new Set(arr));

const shouldCountTeam = (team?: string): boolean => {
  const code = normalizeTeamCode(team);
  if (!code) return false;
  if (code === 'TOT' || code.endsWith('TM')) return false;
  return true;
};

const editDistance = (a: string, b: string): number => {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) dp[i][0] = i;
  for (let j = 0; j <= b.length; j++) dp[0][j] = j;

  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
};

export interface PlayerSummary {
  position: Player['position'];
  firstSeason?: number;
  lastSeason?: number;
  seasonsPlayed: number;
  teams: string[];
  teamNames: string[];
  primaryTeam?: string;
  primaryTeamName?: string;
  totals: Partial<Record<keyof typeof STAT_FIELDS, number>>;
  notableSeason?: {
    year: number;
    statLabel: string;
    value: number;
  };
}

export function summarizePlayer(player: Player, seasons: SeasonRow[]): PlayerSummary {
  const ordered = [...seasons].sort((a, b) => a.year - b.year);
  const firstSeason = ordered[0]?.year;
  const lastSeason = ordered[ordered.length - 1]?.year;
  const teams = unique(
    ordered
      .map(row => normalizeTeamCode(row.team))
      .filter(team => team && shouldCountTeam(team)) as string[]
  );

  const gamesByTeam = new Map<string, number>();
  for (const row of ordered) {
    const code = normalizeTeamCode(row.team);
    if (!code || !shouldCountTeam(code)) continue;
    const games = toNumber(row.games);
    gamesByTeam.set(code, (gamesByTeam.get(code) ?? 0) + games);
  }

  const [primaryTeam] = Array.from(gamesByTeam.entries()).sort((a, b) => b[1] - a[1]);

  const totals: NumericRow = {
    passYds: sumField(seasons, 'passYds'),
    passTd: sumField(seasons, 'passTd'),
    rushYds: sumField(seasons, 'rushYds'),
    rushTd: sumField(seasons, 'rushTd'),
    rec: sumField(seasons, 'rec'),
    recYds: sumField(seasons, 'recYds'),
    recTd: sumField(seasons, 'recTd'),
    scrimmageYds: sumField(seasons, 'ydsFromScrimmage')
  };

  const statFieldByPosition: Record<Player['position'], keyof typeof STAT_FIELDS> = {
    QB: 'passYds',
    RB: 'rushYds',
    WR: 'recYds',
    TE: 'recYds'
  };

  const focusStatKey = statFieldByPosition[player.position];
  let notableSeason: PlayerSummary['notableSeason'];
  if (focusStatKey) {
    let bestValue = 0;
    let bestYear: number | undefined;
    for (const row of seasons) {
      const value = toNumber(row[focusStatKey]);
      if (value > bestValue) {
        bestValue = value;
        bestYear = row.year;
      }
    }
    if (bestValue > 0 && bestYear) {
      notableSeason = {
        year: bestYear,
        statLabel: STAT_FIELDS[focusStatKey],
        value: bestValue
      };
    }
  }

  const teamNames = teams.map(code => formatTeamName(code) ?? code);

  return {
    position: player.position,
    firstSeason,
    lastSeason,
    seasonsPlayed: ordered.length,
    teams,
    teamNames,
    primaryTeam: primaryTeam?.[0],
    primaryTeamName: primaryTeam ? formatTeamName(primaryTeam[0]) ?? primaryTeam[0] : undefined,
    totals,
    notableSeason
  };
}

const buildTeamHint = (summary?: PlayerSummary): string | null => {
  if (!summary || summary.teamNames.length === 0) return null;
  if (summary.teamNames.length === 1) {
    return `Spent most of the career with the ${summary.teamNames[0]}.`;
  }
  const preview = summary.teamNames.slice(0, 3).join(', ');
  return `Played for ${summary.teamNames.length} teams (${preview}${summary.teamNames.length > 3 ? ', ...' : ''}).`;
};

const buildEraHint = (player: Player, summary?: PlayerSummary): string | null => {
  const rookie = player.rookieYear;
  if (summary?.firstSeason && summary?.lastSeason) {
    if (summary.firstSeason === summary.lastSeason) {
      return `Career season spotlight: ${summary.firstSeason}.`;
    }
    return `Career ran from ${summary.firstSeason} to ${summary.lastSeason}.`;
  }
  if (rookie) {
    const decade = Math.floor(rookie / 10) * 10;
    return `Entered the league in ${rookie} (the ${decade}s era).`;
  }
  return null;
};

const buildStatHint = (player: Player, summary?: PlayerSummary): string | null => {
  if (!summary) return null;
  const totals = summary.totals;

  if (player.position === 'QB' && totals.passYds) {
    return `Career passing yards: ${formatNumber(totals.passYds)}.`;
  }

  if (player.position === 'RB') {
    if (totals.rushYds && totals.rushYds > 0) {
      return `Rushed for ${formatNumber(totals.rushYds)} yards in his career.`;
    }
    if (totals.scrimmageYds && totals.scrimmageYds > 0) {
      return `Produced ${formatNumber(totals.scrimmageYds)} yards from scrimmage.`;
    }
  }

  if ((player.position === 'WR' || player.position === 'TE') && totals.recYds) {
    return `Career receiving yards: ${formatNumber(totals.recYds)}.`;
  }

  return null;
};

const buildNotableSeasonHint = (summary?: PlayerSummary): string | null => {
  if (!summary?.notableSeason) return null;
  const { year, statLabel, value } = summary.notableSeason;
  return `Best season: ${year} with ${formatNumber(value)} ${statLabel}.`;
};

const buildNameHints = (player: Player): string[] => {
  return NAME_HINT_TEMPLATES.map(template => template(player));
};

export function generatePlayerHints(
  player: Player,
  summary?: PlayerSummary,
  seasons: SeasonRow[] = []
): string[] {
  const hints: string[] = [];

  const addHint = (hint: string | null) => {
    if (!hint) return;
    if (hints.includes(hint)) return;
    hints.push(hint);
  };

  addHint(buildTeamHint(summary));
  addHint(buildEraHint(player, summary));
  addHint(buildStatHint(player, summary));
  addHint(buildNotableSeasonHint(summary));

  if (seasons.length === 0 && player.rookieYear) {
    addHint(`Made his debut in ${player.rookieYear}.`);
  }

  for (const hint of buildNameHints(player)) {
    addHint(hint);
  }

  if (hints.length < TARGET_HINTS) {
    addHint(`Last name ends with "${player.lastName[player.lastName.length - 1]}".`);
  }

  return hints.slice(0, TARGET_HINTS);
}

const normalizeGuess = (guess: string): string[] => {
  return guess
    .toLowerCase()
    .split(/\s+/)
    .map(token => token.replace(NAME_SANITIZE, ''))
    .filter(Boolean);
};

export function getGuessFeedback(guess: string, player: Player): string | null {
  const tokens = normalizeGuess(guess);
  if (tokens.length === 0) return null;

  const first = player.firstName.toLowerCase();
  const last = player.lastName.toLowerCase();

  const hasFirst = tokens.some(token => token === first);
  const hasLast = tokens.some(token => token === last);

  if (hasFirst && !hasLast) {
    return 'First name correct—lock in the last name.';
  }
  if (hasLast && !hasFirst) {
    return 'Last name correct—pair it with the right first name.';
  }

  const closeLast = tokens.some(token => editDistance(token, last) === 1);
  if (closeLast) {
    return 'Very close on the last name—double-check the spelling.';
  }
  const closeFirst = tokens.some(token => editDistance(token, first) === 1);
  if (closeFirst) {
    return 'First name spelling is nearly there.';
  }

  return null;
}
