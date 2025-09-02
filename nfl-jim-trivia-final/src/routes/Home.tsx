
import React from 'react'
import { Game } from '../state/game'
import { ScoreBar } from '../ui/ScoreBar'
import { GuessBox } from '../ui/GuessBox'
import { HintButtons } from '../ui/HintButtons'
import { StatTableContainer } from '../ui/StatTableContainer'
import { RevealCard } from '../ui/RevealCard'
import { useDataset } from '../state/dataset'
import { KeyboardShortcuts } from '../ui/KeyboardShortcuts'

export default function Home() {
  const ds = useDataset()
  const g = Game.use()

  React.useEffect(() => {
    if (!ds.ready) ds.loadSample()
  }, [ds])

  React.useEffect(() => {
    if (ds.ready && !g.round.active) {
      g.startRound(ds)
    }
  }, [ds.ready])

  if (!ds.ready) return <p>Loading dataset…</p>

  return (
    <div>
      <KeyboardShortcuts onSlash={() => g.focusGuess()} onEnter={() => g.submit()} onHint1={() => g.hint(1)} onHint2={() => g.hint(2)} onEscape={() => g.giveUp()} />
      <div className="row" style={{justifyContent:'space-between', alignItems:'flex-start'}}>
        <div className="row" role="group" aria-label="Round controls">
          <button className="btn" onClick={() => g.startRound(ds)}>Start Round</button>
          <button className="btn" onClick={() => g.giveUp()} disabled={!g.round.active || g.round.revealed}>Give Up (Esc)</button>
        </div>
        <ScoreBar />
      </div>

      <div className="row" style={{marginTop:8}}>
        <GuessBox />
        <HintButtons />
      </div>

      {g.round.active && (
        <div className="table-wrap" style={{marginTop:12}}>
          <StatTableContainer />
        </div>
      )}

      {g.round.revealed && (
        <div style={{marginTop:12}}>
          <RevealCard />
          <div style={{marginTop:12}} className="row">
            <button className="btn" onClick={() => g.startRound(ds)}>Next Round</button>
          </div>
        </div>
      )}
    </div>
  )
}
