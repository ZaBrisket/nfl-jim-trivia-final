
export type Position = 'QB'|'RB'|'WR'|'TE'

export interface Player {
  player_id: string
  display_name: string
  first_name: string
  last_name: string
  pos: Position
  rookie_year: number
  active_2024: boolean
  accrued_seasons: number
  birthdate?: string
  college?: string
  jersey_number?: string
  draft_year?: number
  draft_round?: number
  draft_pick?: number
  draft_team_abbr?: string
  primary_teams_abbr_concat?: string
  bio_line?: string
  fun_fact?: string
  career_totals_json?: string
  aliases_csv?: string
}

export interface SeasonBase {
  player_id: string
  Season: number
  Age?: number|string
  Team: string // full team name
  Pos: Position
  G?: number|string
  GS?: number|string
  Awards?: string
  // used for team cell suffix when traded
  TeamAbbrs?: string // e.g., "KAN/CHI"
}

export interface QBSeason extends SeasonBase {
  Lg?: string
  QBRec?: string
  Cmp?: number|string
  Att?: number|string
  'Cmp%': number|string|undefined
  Yds?: number|string
  TD?: number|string
  'TD%': number|string|undefined
  Int?: number|string
  'Int%': number|string|undefined
  '1D'?: number|string
  'Succ%': number|string|undefined
  Lng?: number|string
  'Y/A'?: number|string
  'AY/A'?: number|string
  'Y/C'?: number|string
  'Y/G'?: number|string
  Rate?: number|string
  QBR?: number|string
  Sk?: number|string
  SkYds?: number|string
  'Sk%': number|string|undefined
  'NY/A'?: number|string
  'ANY/A'?: number|string
  '4QC'?: number|string
  GWD?: number|string
  AV?: number|string
}

export interface RBSeason extends SeasonBase {
  Att?: number|string
  Yds?: number|string
  TD?: number|string
  'Y/A'?: number|string
  'Y/G'?: number|string
  'A/G'?: number|string
  Tgt?: number|string
  Rec?: number|string
  RecYds?: number|string
  'Y/R'?: number|string
  RecTD?: number|string
  'R/G'?: number|string
  'RecY/G'?: number|string
  Touch?: number|string
  'Y/Tch'?: number|string
  YScm?: number|string
  RRTD?: number|string
  Fmb?: number|string
}

export interface WRSeason extends SeasonBase {
  Tgt?: number|string
  Rec?: number|string
  RecYds?: number|string
  'Y/R'?: number|string
  RecTD?: number|string
  'R/G'?: number|string
  'RecY/G'?: number|string
  Att?: number|string
  Yds?: number|string
  TD?: number|string
  'Y/A'?: number|string
  'Y/G'?: number|string
  'A/G'?: number|string
  Touch?: number|string
  'Y/Tch'?: number|string
  YScm?: number|string
  RRTD?: number|string
  Fmb?: number|string
}

export interface TESeason extends WRSeason {}

export interface EligibilityRow {
  player_id: string
  rookie_year: number
  seasons_with_G_ge_1: number
  eligible_flag: 0|1
  rationale_text?: string
}

export interface DailyPick {
  date_chi: string // YYYY-MM-DD in America/Chicago
  player_id: string
}

export interface Dataset {
  players: Player[]
  qb: QBSeason[]
  rb: RBSeason[]
  wr: WRSeason[]
  te: TESeason[]
  eligibility: EligibilityRow[]
  dailyPicks: DailyPick[]
}
