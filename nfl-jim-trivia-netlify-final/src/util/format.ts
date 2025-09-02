
export function fmt(value:any): string {
  if (value === undefined || value === null || value === '' || Number.isNaN(value)) return '—'
  if (typeof value === 'number') return Number.isInteger(value) ? String(value) : (Math.round(value*10)/10).toFixed(1)
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
    const n = Number(value); return Number.isInteger(n) ? String(n) : (Math.round(n*10)/10).toFixed(1)
  }
  return String(value)
}
export function teamCell(teamFull:string, abbrs?:string): string {
  return (abbrs && abbrs.trim()!=='') ? `${teamFull} (${abbrs})` : teamFull
}
