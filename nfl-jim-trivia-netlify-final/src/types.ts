
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
  Team: string
  Pos: Position
  G?: number|string
  GS?: number|string
  Awards?: string
  TeamAbbrs?: string
}

export interface QBSeason extends SeasonBase {
  Lg?: string; QBRec?: string; Cmp?: any; Att?: any; 'Cmp%': any; Yds?: any; TD?: any; 'TD%': any
  Int?: any; 'Int%': any; '1D'?: any; 'Succ%': any; Lng?: any; 'Y/A'?: any; 'AY/A'?: any; 'Y/C'?: any; 'Y/G'?: any
  Rate?: any; QBR?: any; Sk?: any; SkYds?: any; 'Sk%': any; 'NY/A'?: any; 'ANY/A'?: any; '4QC'?: any; GWD?: any; AV?: any
}
export interface RBSeason extends SeasonBase {
  Att?: any; Yds?: any; TD?: any; 'Y/A'?: any; 'Y/G'?: any; 'A/G'?: any; Tgt?: any; Rec?: any; RecYds?: any; 'Y/R'?: any
  RecTD?: any; 'R/G'?: any; 'RecY/G'?: any; Touch?: any; 'Y/Tch'?: any; YScm?: any; RRTD?: any; Fmb?: any
}
export interface WRSeason extends SeasonBase {
  Tgt?: any; Rec?: any; RecYds?: any; 'Y/R'?: any; RecTD?: any; 'R/G'?: any; 'RecY/G'?: any; Att?: any; Yds?: any; TD?: any
  'Y/A'?: any; 'Y/G'?: any; 'A/G'?: any; Touch?: any; 'Y/Tch'?: any; YScm?: any; RRTD?: any; Fmb?: any
}
export interface TESeason extends WRSeason {}

export interface EligibilityRow {
  player_id: string
  rookie_year: number
  seasons_with_G_ge_1: number
  eligible_flag: 0|1
  rationale_text?: string
}

export interface DailyPick { date_chi: string; player_id: string }
