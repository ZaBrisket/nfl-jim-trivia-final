
import React from 'react'
import { Game } from '../state/game'
import { useDataset } from '../state/dataset'

export function HintButtons() {
  const g = Game.use()
  const ds = useDataset()
  const player = ds.players.find(p => p.player_id === g.round.playerId)

  return (
    <div className="row" role="group" aria-label="Hints">
      <button className="btn" onClick={()=>g.hint(1)} disabled={!g.round.active || g.round.hints >= 1 || g.round.revealed}>Hint 1: College (−1)</button>
      <button className="btn" onClick={()=>g.hint(2)} disabled={!g.round.active || g.round.hints >= 2 || g.round.revealed}>Hint 2: Fun fact (−1)</button>
      <div className="row" style={{marginLeft:8}}>
        {g.round.hints >= 1 && <span className="hint-label">College: {player?.college || '—'}</span>}
        {g.round.hints >= 2 && <span className="hint-label">Fun fact: {player?.fun_fact || '—'}</span>}
      </div>
    </div>
  )
}
