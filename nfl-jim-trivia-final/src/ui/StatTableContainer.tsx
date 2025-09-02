
import React from 'react'
import { useDataset } from '../state/dataset'
import { Game } from '../state/game'
import { TableQB } from './tables/TableQB'
import { TableRB } from './tables/TableRB'
import { TableWR } from './tables/TableWR'
import { TableTE } from './tables/TableTE'

export function StatTableContainer() {
  const ds = useDataset()
  const g = Game.use()
  const pid = g.round.playerId
  const pos = g.round.pos

  if (!pid || !pos) return null
  if (pos === 'QB') return <TableQB rows={ds.qb.filter(r=>r.player_id===pid)} />
  if (pos === 'RB') return <TableRB rows={ds.rb.filter(r=>r.player_id===pid)} />
  if (pos === 'WR') return <TableWR rows={ds.wr.filter(r=>r.player_id===pid)} />
  if (pos === 'TE') return <TableTE rows={ds.te.filter(r=>r.player_id===pid)} />
  return null
}
