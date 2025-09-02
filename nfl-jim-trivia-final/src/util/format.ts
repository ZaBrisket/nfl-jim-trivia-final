
export function fmt(value: any): string {
  if (value === undefined || value === null || value === '' || Number.isNaN(value)) return '—'
  if (typeof value === 'number') {
    // show integers as-is, decimals to 1 place
    if (Number.isInteger(value)) return String(value)
    return (Math.round(value * 10) / 10).toFixed(1)
  }
  // try numeric strings
  if (typeof value === 'string' && value.trim() !== '' && !isNaN(Number(value))) {
    const n = Number(value)
    if (Number.isInteger(n)) return String(n)
    return (Math.round(n * 10) / 10).toFixed(1)
  }
  return String(value)
}

export function teamCell(teamFull: string, abbrs?: string): string {
  if (abbrs && abbrs.trim() !== '') return `${teamFull} (${abbrs})`
  return teamFull
}
