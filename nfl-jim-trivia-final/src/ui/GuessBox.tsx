
import React from 'react'
import { Game } from '../state/game'
import { useDataset } from '../state/dataset'

export function GuessBox() {
  const g = Game.use()
  const ds = useDataset()
  const inputRef = React.useRef<HTMLInputElement>(null)
  const [open, setOpen] = React.useState(false)
  const [hover, setHover] = React.useState(0)

  React.useEffect(() => {
    ;(window as any).__PLAYERS__ = ds.players
  }, [ds.players])

  React.useEffect(() => {
    if (g.focusedGuess) {
      inputRef.current?.focus()
      g.focusedGuess = false
    }
  }, [g.focusedGuess])

  const options = React.useMemo(() => {
    const q = g.guessInput.trim().toLowerCase()
    if (!q) return []
    // find by display name or alias substrings
    const res = ds.players.filter(p => {
      const name = p.display_name.toLowerCase()
      const aliases = (p.aliases_csv || '').toLowerCase()
      return name.includes(q) || aliases.includes(q)
    }).slice(0, 10)
    return res
  }, [g.guessInput, ds.players])

  const select = (name: string) => {
    g.guessInput = name
    g.submit()
  }

  return (
    <div style={{position:'relative'}}>
      <label className="sr-only" htmlFor="guess">Guess</label>
      <input
        id="guess"
        className="input"
        placeholder="Type a name… (Press / to focus)"
        value={g.guessInput}
        onChange={(e)=>{ g.guessInput = e.target.value; (g as any).force() }}
        onFocus={()=>setOpen(true)}
        onBlur={()=> setTimeout(()=>setOpen(false), 100)}
        ref={inputRef}
      />
      <button className="btn" onClick={()=>g.submit()} style={{marginLeft:8}}>Submit (Enter)</button>

      {open && options.length > 0 && (
        <ul role="listbox" aria-label="Matching players" style={{position:'absolute', zIndex:5, background:'#fff', border:'1px solid #111', listStyle:'none', padding:0, margin:0, maxHeight:240, overflowY:'auto', width: 420}}>
          {options.map((p, i) => {
            const label = `${p.display_name} — ${p.pos}, ${p.rookie_year}–${(p as any).last_year||p.rookie_year} ${p.primary_teams_abbr_concat ? '('+p.primary_teams_abbr_concat+')' : ''}`
            return (
              <li key={p.player_id}>
                <button
                  role="option"
                  aria-selected={i===hover}
                  className="btn"
                  style={{display:'block', width:'100%', textAlign:'left', border:'none', borderBottom:'1px solid #eee'}}
                  onMouseEnter={()=>setHover(i)}
                  onMouseDown={(e)=>{ e.preventDefault(); select(p.display_name) }}
                >{label}</button>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
