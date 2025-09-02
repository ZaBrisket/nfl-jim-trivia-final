
import React from 'react'
import type { Player, EligibilityRow, DailyPick, QBSeason, RBSeason, WRSeason, TESeason } from '../types'

class DatasetState {
  ready = false
  players: Player[] = []
  qb: QBSeason[] = []
  rb: RBSeason[] = []
  wr: WRSeason[] = []
  te: TESeason[] = []
  eligibility: EligibilityRow[] = []
  dailyPicks: DailyPick[] = []

  async loadSample() {
    const base = '/data/sample'
    const [players, qb, rb, wr, te, elig, daily] = await Promise.all([
      fetch(`${base}/players.json`).then(r=>r.json()),
      fetch(`${base}/qb_seasons.json`).then(r=>r.json()),
      fetch(`${base}/rb_seasons.json`).then(r=>r.json()),
      fetch(`${base}/wr_seasons.json`).then(r=>r.json()),
      fetch(`${base}/te_seasons.json`).then(r=>r.json()),
      fetch(`${base}/eligibility.json`).then(r=>r.json()),
      fetch(`${base}/daily_picks.json`).then(r=>r.json())
    ])
    this.players = players; (window as any).__PLAYERS__ = players
    this.qb = qb; this.rb = rb; this.wr = wr; this.te = te
    this.eligibility = elig; this.dailyPicks = daily
    this.ready = true
  }
}

const Ctx = React.createContext<DatasetState | null>(null)

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<DatasetState>()
  if (!ref.current) ref.current = new DatasetState()
  return <Ctx.Provider value={ref.current}>{children}</Ctx.Provider>
}

export function useDataset(): DatasetState {
  const v = React.useContext(Ctx)
  if (!v) throw new Error('useDataset must be inside DatasetProvider')
  return v
}
