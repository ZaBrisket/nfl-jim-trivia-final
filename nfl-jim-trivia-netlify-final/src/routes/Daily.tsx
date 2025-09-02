
import React from 'react'
import { Game } from '../state/game'
import { useDataset } from '../state/dataset'
import { ScoreBar } from '../ui/ScoreBar'
import { GuessBox } from '../ui/GuessBox'
import { HintButtons } from '../ui/HintButtons'
import { StatTableContainer } from '../ui/StatTableContainer'
import { RevealCard } from '../ui/RevealCard'
import { KeyboardShortcuts } from '../ui/KeyboardShortcuts'
import { chicagoDateString } from '../util/chicago'

export default function Daily(){
  const ds = useDataset()
  const g = Game.use()

  React.useEffect(()=>{ if(!ds.ready) ds.loadSample() },[ds])
  React.useEffect(()=>{
    if(ds.ready){
      const today = chicagoDateString(new Date())
      const pick = ds.dailyPicks.find(d=>d.date_chi===today)
      if(pick) g.startSpecific(ds, pick.player_id)
      else g.startRound(ds)
    }
  },[ds.ready])

  if(!ds.ready) return <p>Loading dataset…</p>

  return (
    <div>
      <KeyboardShortcuts onSlash={()=>g.focusGuess()} onEnter={()=>g.submit()} onHint1={()=>g.hint(1)} onHint2={()=>g.hint(2)} onEscape={()=>g.giveUp()} />
      <div className="row" style={{justifyContent:'space-between', alignItems:'flex-start'}}>
        <div className="row" role="group" aria-label="Round controls">
          <button className="btn" onClick={()=>g.restartDaily(ds)}>Restart Daily</button>
        </div>
        <ScoreBar />
      </div>

      <div className="row" style={{marginTop:8}}>
        <GuessBox />
        <HintButtons />
      </div>

      {g.round.active && <div className="table-wrap" style={{marginTop:12}}><StatTableContainer /></div>}
      {g.round.revealed && <div style={{marginTop:12}}><RevealCard /></div>}
    </div>
  )
}
