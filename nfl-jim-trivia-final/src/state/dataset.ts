
import React from 'react'
import type { Dataset, Player, EligibilityRow, DailyPick, QBSeason, RBSeason, WRSeason, TESeason } from '../lib/types'

function useForceUpdate() {
  const [, setTick] = React.useState(0)
  return () => setTick(x => x + 1)
}

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

    this.players = players
    this.qb = qb
    this.rb = rb
    this.wr = wr
    this.te = te
    this.eligibility = elig
    this.dailyPicks = daily
    this.ready = true
  }
}

const ctx = React.createContext<DatasetState | null>(null)

export function DatasetProvider({ children }: { children: React.ReactNode }) {
  const ref = React.useRef<DatasetState>()
  const force = useForceUpdate()
  if (!ref.current) ref.current = new DatasetState()
  const state = ref.current
  ;(state as any).force = force
  return <ctx.Provider value={state}>{children}</ctx.Provider>
}

export function useDataset(): DatasetState {
  const v = React.useContext(ctx)
  if (!v) throw new Error('useDataset must be used within DatasetProvider')
  return v
}
