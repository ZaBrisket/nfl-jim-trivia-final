
import React from 'react'
import { useDataset } from '../state/dataset'
import { Game } from '../state/game'

export function RevealCard() {
  const ds = useDataset()
  const g = Game.use()
  const p = ds.players.find(p => p.player_id === g.round.playerId)
  if (!p) return null

  return (
    <div className="card" role="region" aria-label="Reveal">
      <h3 style={{marginTop:0}}>{p.display_name}</h3>
      <div className="grid two">
        <div>
          <p><strong>Position:</strong> {p.pos}</p>
          <p><strong>College:</strong> {p.college || '—'}</p>
          <p><strong>Jersey #:</strong> {p.jersey_number || '—'}</p>
          <p><strong>Draft:</strong> {p.draft_year ? `${p.draft_year} / Rd ${p.draft_round ?? '—'} / Pick ${p.draft_pick ?? '—'} / Team ${p.draft_team_abbr ?? '—'}` : '—'}</p>
        </div>
        <div>
          <p><strong>Awards:</strong> {(p as any).awards_summary || '—'}</p>
          <p><strong>Bio:</strong> {p.bio_line || '—'}</p>
          <p><strong>Fun fact:</strong> {g.round.hints >= 2 ? '— (used as hint)' : (p.fun_fact || '—')}</p>
          <p><strong>Career totals:</strong> {p.career_totals_json || '—'}</p>
        </div>
      </div>
      <p className="muted">Data compiled from offline demo sources.</p>
    </div>
  )
}
