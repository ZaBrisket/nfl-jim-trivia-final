
import React from 'react'
import type { Player, Position } from '../lib/types'
import { chicagoDateString } from '../util/chicago'
import { seedFromString, mulberry32 } from '../util/rng'
import { levenshtein } from '../util/levenshtein'
import { useDataset } from './dataset'

type RoundState = {
  active: boolean
  revealed: boolean
  playerId?: string
  pos?: Position
  startAt?: number
  guesses: number
  hints: number
  score: number
  timedOut: boolean
}

function getStored<T>(key: string, fallback: T): T {
  try { const s = localStorage.getItem(key); return s ? JSON.parse(s) as T : fallback } catch { return fallback }
}
function setStored<T>(key: string, value: T) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch {}
}

const RECENT_KEY = 'njt_recent_ids'
const STREAK_KEY = 'njt_streak_best'
const CURRENT_STREAK_KEY = 'njt_streak_current'

class GameState {
  // reactive-ish
  round: RoundState = { active:false, revealed:false, guesses:0, hints:0, score:5, timedOut:false }
  guessInput = ''
  focusedGuess = false

  // streaks
  bestStreak = getStored<number>(STREAK_KEY, 0)
  currentStreak = getStored<number>(CURRENT_STREAK_KEY, 0)

  // timer interval
  #timer?: any

  use() {
    const [, setTick] = React.useState(0)
    React.useEffect(() => () => clearInterval(this.#timer), [])
    const force = () => setTick(x => x + 1)
    ;(this as any).force = force
    return this
  }

  focusGuess() {
    this.focusedGuess = true
    ;(this as any).force()
  }

  private startTimer() {
    clearInterval(this.#timer)
    this.#timer = setInterval(() => {
      if (!this.round.active || this.round.revealed || this.round.timedOut) return
      const elapsed = Math.floor((Date.now() - (this.round.startAt || Date.now())) / 1000)
      if (elapsed >= 60) {
        // timeout ends round and applies -1 penalty
        this.round.timedOut = true
        this.endRound(false, true)
      }
      ;(this as any).force()
    }, 250)
  }

  get timeLeft(): number {
    if (!this.round.active || !this.round.startAt) return 60
    const elapsed = Math.floor((Date.now() - this.round.startAt) / 1000)
    return Math.max(0, 60 - elapsed)
  }

  startRound(ds: ReturnType<typeof useDataset>) {
    const eligible = ds.eligibility.filter(e => e.eligible_flag === 1).map(e => e.player_id)
    const recent = getStored<string[]>(RECENT_KEY, [])
    const pool = eligible.filter(id => !recent.includes(id))
    const pickFrom = pool.length > 0 ? pool : eligible
    const seed = seedFromString(String(Date.now()))
    const rng = mulberry32(seed)
    const idx = Math.floor(rng() * pickFrom.length)
    const playerId = pickFrom[idx]
    this.startSpecific(ds, playerId)
  }

  startSpecific(ds: ReturnType<typeof useDataset>, playerId: string) {
    const p = ds.players.find(p => p.player_id === playerId)
    if (!p) return
    this.round = { active:true, revealed:false, playerId, pos:p.pos, startAt: Date.now(), guesses:0, hints:0, score:5, timedOut:false }
    this.guessInput = ''
    this.startTimer()
    ;(this as any).force()
  }

  restartDaily(ds: ReturnType<typeof useDataset>) {
    const today = chicagoDateString(new Date())
    const match = ds.dailyPicks.find(d => d.date_chi === today)
    if (match) this.startSpecific(ds, match.player_id)
  }

  // Hints
  hint(n: 1|2) {
    if (!this.round.active || this.round.revealed) return
    if (n === 1 && this.round.hints < 1) { this.round.hints += 1; this.round.score -= 1 }
    else if (n === 2 && this.round.hints < 2) { this.round.hints += 1; this.round.score -= 1 }
    ;(this as any).force()
  }

  // Submit guess
  submit() {
    if (!this.round.active || this.round.revealed) return
    const id = this.round.playerId!
    const value = this.guessInput.trim()
    if (!value) return
    const ok = this.matchGuess(value, id)
    if (ok) {
      this.endRound(true, false)
    } else {
      this.round.guesses += 1
      if (this.round.guesses >= 3) {
        this.endRound(false, false, true)
      }
      ;(this as any).force()
    }
  }

  giveUp() {
    if (!this.round.active || this.round.revealed) return
    this.endRound(false, true)
  }

  private endRound(correct: boolean, timeout: boolean, thirdWrong = false) {
    clearInterval(this.#timer)
    // penalties
    if (!correct && (timeout || thirdWrong)) {
      this.round.score -= 1
    }
    this.round.revealed = true
    this.round.active = true // still show table + reveal
    // streaks
    if (correct && this.round.score >= 1) {
      this.currentStreak += 1
      this.bestStreak = Math.max(this.bestStreak, this.currentStreak)
    } else {
      this.currentStreak = 0
    }
    setStored(STREAK_KEY, this.bestStreak)
    setStored(CURRENT_STREAK_KEY, this.currentStreak)
    // recent ids
    const recent = getStored<string[]>(RECENT_KEY, [])
    const next = [this.round.playerId!, ...recent].slice(0, 50)
    setStored(RECENT_KEY, next)
    ;(this as any).force()
  }

  matchGuess(value: string, playerId: string): boolean {
    const ds = (window as any).__DATASET__ as ReturnType<typeof useDataset> | undefined
    // Fallback: simple approach using current dataset if we had a global
    // But within state, we cannot read ds; instead, we match using cached players from localStorage? Keep simple:
    // We accept any case-insensitive exact name or alias match to the current player's record.
    const players: any[] = ((window as any).__PLAYERS__ || [])
    const p = players.find(p => p.player_id === playerId)
    if (!p) return false
    const name = p.display_name.toLowerCase()
    const aliases = (p.aliases_csv || '').split(',').map((s: string) => s.trim().toLowerCase()).filter(Boolean)
    const v = value.toLowerCase()
    if (v === name) return true
    if (aliases.includes(v)) return true
    // allow small typos (distance <= 2) if unique
    const dist = levenshtein(v, name)
    if (name.length >= 6 && dist <= 2) return true
    return false
  }
}

const GameContext = React.createContext<GameState | null>(null)
const game = new GameState()
export const Game = {
  use() {
    return game.use()
  },
  Provider({ children }: { children: React.ReactNode }) {
    return <GameContext.Provider value={game}>{children}</GameContext.Provider>
  }
}
