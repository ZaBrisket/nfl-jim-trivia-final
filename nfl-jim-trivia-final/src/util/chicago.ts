
export function chicagoDateString(d: Date): string {
  // Format date in America/Chicago as YYYY-MM-DD
  const fmt = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Chicago',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  })
  const parts = fmt.formatToParts(d)
  const y = parts.find(p => p.type === 'year')!.value
  const m = parts.find(p => p.type === 'month')!.value
  const da = parts.find(p => p.type === 'day')!.value
  return `${y}-${m}-${da}`
}
