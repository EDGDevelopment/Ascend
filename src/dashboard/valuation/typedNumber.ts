/** Parses what a person typed into a table cell. Returns null when it isn't a usable number. */
export function typedNumber(raw: string): number | null {
  const s = raw.trim().replace(/[$,\s]/g, '')
  if (s === '') return null
  const n = Number(s)
  return Number.isFinite(n) ? n : null
}
