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

const TARGET_HINTS = 2;

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
    `First name starts with "${player.firstName[0]}" and has ${player.firstName.length} letters.`,
  (player: Player) =>
    `Initials are "${player.firstName[0]}.${player.lastName[0]}."`,
  (player: Player) =>
    `Last name ends with "${player.lastName[player.lastName.length - 1]}".`,
  (player: Player) =>
    `Both names together are ${player.firstName.length + player.lastName.length} letters long.`
];

const MAX_ACCOLADE_BADGES = 8;

type AwardBadgeDefinition = {
  code: string;
  id: string;
  label: string;
  description: string;
  priority: number;
};

const AWARD_BADGE_DEFINITIONS: AwardBadgeDefinition[] = [
  {
    code: 'AP MVP',
    id: 'apMvp',
    label: 'AP MVP',
    description: 'Associated Press Most Valuable Player awards',
    priority: 1
  },
  {
    code: 'AP OPoY',
    id: 'apOpy',
    label: 'AP Off. PoY',
    description: 'Associated Press Offensive Player of the Year awards',
    priority: 2
  },
  {
    code: 'AP DPoY',
    id: 'apDpy',
    label: 'AP Def. PoY',
    description: 'Associated Press Defensive Player of the Year awards',
    priority: 3
  },
  {
    code: 'AP ORoY',
    id: 'apOroy',
    label: 'AP Off. RoY',
    description: 'Associated Press Offensive Rookie of the Year awards',
    priority: 4
  },
  {
    code: 'AP DRoY',
    id: 'apDroy',
    label: 'AP Def. RoY',
    description: 'Associated Press Defensive Rookie of the Year awards',
    priority: 5
  },
  {
    code: 'AP CPoY',
    id: 'apCpy',
    label: 'AP Comeback',
    description: 'Associated Press Comeback Player of the Year awards',
    priority: 6
  }
];

const AWARD_CONFIG_BY_CODE = AWARD_BADGE_DEFINITIONS.reduce<Record<string, AwardBadgeDefinition>>(
  (acc, def) => {
    acc[def.code] = def;
    return acc;
  },
  {}
);

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

  const dp: number[][] = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i++) {
    dp[i]![0] = i;
  }
  for (let j = 0; j <= b.length; j++) {
    dp[0]![j] = j;
  }

  for (let i = 1; i <= a.length; i++) {
    const row = dp[i]!;
    const prevRow = dp[i - 1]!;
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      row[j] = Math.min(
        prevRow[j]! + 1,
        row[j - 1]! + 1,
        prevRow[j - 1]! + cost
      );
    }
  }
  return dp[a.length]![b.length]!;
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

export interface AccoladeBadge {
  id: string;
  label: string;
  description: string;
  count: number;
  years: number[];
}

export interface PlayerAccolades {
  proBowls: number;
  allProFirstTeam: number;
  allProSecondTeam: number;
  badges: AccoladeBadge[];
}

export type PlayerHint =
  | { kind: 'text'; text: string }
  | { kind: 'accolades'; data: PlayerAccolades };

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

type ParsedAwardToken =
  | { type: 'proBowl'; year: number }
  | { type: 'allProFirst'; year: number }
  | { type: 'allProSecond'; year: number }
  | { type: 'named'; code: string; rank?: number; year: number };

type BadgeAccumulator = {
  config: AwardBadgeDefinition;
  years: Set<number>;
  count: number;
};

const splitAwardTokens = (value: unknown): string[] => {
  if (typeof value !== 'string') return [];
  return value
    .split(',')
    .map(token => token.trim())
    .filter(Boolean);
};

const parseSeasonAwards = (row: SeasonRow): ParsedAwardToken[] => {
  const tokens = splitAwardTokens(row.awards);
  const parsed: ParsedAwardToken[] = [];

  for (const token of tokens) {
    if (token === 'PB') {
      parsed.push({ type: 'proBowl', year: row.year });
      continue;
    }
    if (token === 'AP-1') {
      parsed.push({ type: 'allProFirst', year: row.year });
      continue;
    }
    if (token === 'AP-2') {
      parsed.push({ type: 'allProSecond', year: row.year });
      continue;
    }

    const match = token.match(/^(.*?)(?:-(\d+))?$/);
    if (!match) continue;
    const base = match[1]?.trim();
    if (!base) continue;
    const rank = match[2] ? Number.parseInt(match[2], 10) : undefined;
    parsed.push({ type: 'named', code: base, rank, year: row.year });
  }

  return parsed;
};

const sortNumbers = (a: number, b: number) => a - b;

const buildAccoladeData = (seasons: SeasonRow[]): PlayerAccolades | null => {
  if (seasons.length === 0) return null;

  const proBowlYears = new Set<number>();
  const allProFirstYears = new Set<number>();
  const allProSecondYears = new Set<number>();
  const badgeMap = new Map<string, BadgeAccumulator>();

  for (const season of seasons) {
    for (const award of parseSeasonAwards(season)) {
      switch (award.type) {
        case 'proBowl':
          proBowlYears.add(award.year);
          break;
        case 'allProFirst':
          allProFirstYears.add(award.year);
          break;
        case 'allProSecond':
          allProSecondYears.add(award.year);
          break;
        case 'named': {
          const config = AWARD_CONFIG_BY_CODE[award.code];
          if (!config) break;
          if (award.rank !== undefined && award.rank !== 1) break;
          const entry = badgeMap.get(config.id) ?? {
            config,
            years: new Set<number>(),
            count: 0
          };
          entry.count += 1;
          entry.years.add(award.year);
          badgeMap.set(config.id, entry);
          break;
        }
        default:
          break;
      }
    }
  }

  if (
    proBowlYears.size === 0 &&
    allProFirstYears.size === 0 &&
    allProSecondYears.size === 0 &&
    badgeMap.size === 0
  ) {
    return null;
  }

  const badgeEntries = Array.from(badgeMap.values()).map(entry => ({
    id: entry.config.id,
    label: entry.config.label,
    description: entry.config.description,
    count: entry.count,
    years: Array.from(entry.years).sort(sortNumbers),
    priority: entry.config.priority
  }));

  if (allProSecondYears.size > 0) {
    badgeEntries.push({
      id: 'apSecondTeam',
      label: 'AP 2nd-Team All-Pro',
      description: 'Associated Press 2nd-Team All-Pro selections',
      count: allProSecondYears.size,
      years: Array.from(allProSecondYears).sort(sortNumbers),
      priority: 10
    });
  }

  const badges = badgeEntries
    .sort((a, b) => a.priority - b.priority || b.count - a.count)
    .slice(0, MAX_ACCOLADE_BADGES)
    .map(({ priority, ...rest }) => rest);

  return {
    proBowls: proBowlYears.size,
    allProFirstTeam: allProFirstYears.size,
    allProSecondTeam: allProSecondYears.size,
    badges
  };
};

const buildAccoladeHint = (seasons: SeasonRow[]): PlayerHint | null => {
  if (seasons.length === 0) return null;
  const data = buildAccoladeData(seasons);
  if (!data) return null;
  return { kind: 'accolades', data };
};

const buildNameHints = (player: Player): string[] => {
  const hints = NAME_HINT_TEMPLATES.map(template => template(player));
  return Array.from(new Set(hints));
};

export function generatePlayerHints(
  player: Player,
  _summary?: PlayerSummary,
  seasons: SeasonRow[] = []
): PlayerHint[] {
  const hintEntries: PlayerHint[] = buildNameHints(player).map(text => ({
    kind: 'text',
    text
  }));
  if (hintEntries.length === 0) {
    hintEntries.push({
      kind: 'text',
      text: `Initials are "${player.firstName[0]}.${player.lastName[0]}."`
    });
  }
  const accoladeHint = buildAccoladeHint(seasons);
  if (accoladeHint) {
    hintEntries.push(accoladeHint);
  }
  return hintEntries.slice(0, TARGET_HINTS);
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
