
import React from 'react'
import type { QBSeason } from '../../lib/types'
import { fmt, teamCell } from '../../util/format'

export function TableQB({ rows }: { rows: QBSeason[] }) {
  const sorted = [...rows].sort((a,b)=> (a.Season||0) as number - (b.Season||0) as number)

  return (
    <table aria-label="Quarterback regular-season by season">
      <thead>
        <tr>
          <th>Season</th><th>Age</th><th>Team</th><th>Lg</th><th>Pos</th><th>G</th><th>GS</th><th>QBRec</th>
          <th>Cmp</th><th>Att</th><th>Cmp%</th><th>Yds</th><th>TD</th><th>TD%</th><th>Int</th><th>Int%</th><th>1D</th><th>Succ%</th><th>Lng</th><th>Y/A</th><th>AY/A</th><th>Y/C</th><th>Y/G</th><th>Rate</th>
          <th>QBR</th><th>Sk</th><th>SkYds</th><th>Sk%</th><th>NY/A</th><th>ANY/A</th><th>4QC</th><th>GWD</th><th>AV</th><th>Awards</th>
        </tr>
      </thead>
      <tbody>
        {sorted.map((r, idx) => (
          <tr key={idx}>
            <td>{fmt(r.Season)}</td>
            <td>{fmt(r.Age)}</td>
            <td>{teamCell(r.Team, r.TeamAbbrs)}</td>
            <td>{fmt(r.Lg)}</td>
            <td>{fmt(r.Pos)}</td>
            <td>{fmt(r.G)}</td>
            <td>{fmt(r.GS)}</td>
            <td>{fmt(r.QBRec)}</td>
            <td>{fmt(r.Cmp)}</td>
            <td>{fmt(r.Att)}</td>
            <td>{fmt(r['Cmp%'])}</td>
            <td>{fmt(r.Yds)}</td>
            <td>{fmt(r.TD)}</td>
            <td>{fmt(r['TD%'])}</td>
            <td>{fmt(r.Int)}</td>
            <td>{fmt(r['Int%'])}</td>
            <td>{fmt(r['1D'])}</td>
            <td>{fmt(r['Succ%'])}</td>
            <td>{fmt(r.Lng)}</td>
            <td>{fmt(r['Y/A'])}</td>
            <td>{fmt(r['AY/A'])}</td>
            <td>{fmt(r['Y/C'])}</td>
            <td>{fmt(r['Y/G'])}</td>
            <td>{fmt(r.Rate)}</td>
            <td>{fmt(r.QBR)}</td>
            <td>{fmt(r.Sk)}</td>
            <td>{fmt(r.SkYds)}</td>
            <td>{fmt(r['Sk%'])}</td>
            <td>{fmt(r['NY/A'])}</td>
            <td>{fmt(r['ANY/A'])}</td>
            <td>{fmt(r['4QC'])}</td>
            <td>{fmt(r.GWD)}</td>
            <td>{fmt(r.AV)}</td>
            <td>{fmt(r.Awards)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}
