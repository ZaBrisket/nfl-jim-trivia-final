
import React from 'react'
import type { TESeason } from '../../lib/types'
import { fmt, teamCell } from '../../util/format'

export function TableTE({ rows }: { rows: TESeason[] }) {
  const sorted = [...rows].sort((a,b)=> (a.Season||0) as number - (b.Season||0) as number)

  return (
    <table aria-label="Tight end regular-season by season">
      <thead>
        <tr>
          <th>Season</th><th>Age</th><th>Team</th><th>Pos</th><th>G</th><th>GS</th>
          <th>Tgt</th><th>Rec</th><th>RecYds</th><th>Y/R</th><th>RecTD</th><th>R/G</th><th>RecY/G</th>
          <th>Att</th><th>Yds</th><th>TD</th><th>Y/A</th><th>Y/G</th><th>A/G</th>
          <th>Touch</th><th>Y/Tch</th><th>YScm</th><th>RRTD</th><th>Fmb</th><th>Awards</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, idx) => (
          <tr key={idx}>
            <td>{fmt(r.Season)}</td>
            <td>{fmt(r.Age)}</td>
            <td>{teamCell(r.Team, r.TeamAbbrs)}</td>
            <td>{fmt(r.Pos)}</td>
            <td>{fmt(r.G)}</td>
            <td>{fmt(r.GS)}</td>
            <td>{fmt(r.Tgt)}</td>
            <td>{fmt(r.Rec)}</td>
            <td>{fmt(r.RecYds)}</td>
            <td>{fmt(r['Y/R'])}</td>
            <td>{fmt(r.RecTD)}</td>
            <td>{fmt(r['R/G'])}</td>
            <td>{fmt(r['RecY/G'])}</td>
            <td>{fmt(r.Att)}</td>
            <td>{fmt(r.Yds)}</td>
            <td>{fmt(r.TD)}</td>
            <td>{fmt(r['Y/A'])}</td>
            <td>{fmt(r['Y/G'])}</td>
            <td>{fmt(r['A/G'])}</td>
            <td>{fmt(r.Touch)}</td>
            <td>{fmt(r['Y/Tch'])}</td>
            <td>{fmt(r.YScm)}</td>
            <td>{fmt(r.RRTD)}</td>
            <td>{fmt(r.Fmb)}</td>
            <td>{fmt(r.Awards)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
