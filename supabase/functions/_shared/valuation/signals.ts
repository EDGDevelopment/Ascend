/**
 * Unusual-month alerts. Each month is compared with the same month a year earlier, scaled by how the last six
 * months have been running against their own year-ago months. Comparing like with like needs no estimate of
 * the seasonal pattern, so one odd year cannot make the normal years look odd. A month's surprise is scored
 * with the median absolute deviation rather than the standard deviation, so the unusual months being hunted do
 * not inflate the yardstick. Needs 24+ months.
 */
import { mean, percentile } from './rand.ts'

export interface Signal {
  month: string
  value: number
  /** What the trend and season led us to expect. */
  expected: number
  /** How far off, as a decimal. */
  pctOff: number
  /** Robust z-score: how many "typical misses" away. */
  z: number
  kind: 'high' | 'low'
}

export interface ShiftSignal {
  direction: 'up' | 'down'
  months: number
  /** Average gap from expectation over those months, as a decimal. */
  pctOff: number
}

export interface SeriesSignals {
  signals: Signal[]
  shift: ShiftSignal | null
}

const median = (xs: number[]) => percentile([...xs].sort((a, b) => a - b), 0.5)

export interface Signal {
  month: string
  value: number
  /** What the trend and season led us to expect. */
  expected: number
  /** How far off, as a decimal. */
  pctOff: number
  /** Robust z-score: how many "typical misses" away. */
  z: number
  kind: 'high' | 'low'
}

export interface ShiftSignal {
  direction: 'up' | 'down'
  months: number
  /** Average gap from expectation over those months, as a decimal. */
  pctOff: number
}

export interface SeriesSignals {
  signals: Signal[]
  shift: ShiftSignal | null
}


/** Months flagged when the robust z-score reaches this. */
export const FLAG_Z = 3
const SHIFT_Z = 1.5
const MIN_SD = 0.03

export function detectSeries(months: string[], y: number[]): SeriesSignals {
  const n = y.length
  if (n < 24 || y.some((v) => v <= 0)) return { signals: [], shift: null }
  // Year-over-year log change for every month that has a year-ago partner.
  const yoy: number[] = []
  for (let t = 12; t < n; t++) yoy[t] = Math.log(y[t] / y[t - 12])

  const first = 18
  const resid: number[] = []
  const expected: number[] = []
  for (let t = first; t < n; t++) {
    const g = median(yoy.slice(t - 6, t))
    expected.push(y[t - 12] * Math.exp(g))
    resid.push(yoy[t] - g)
  }
  const centre = median(resid)
  const sd = Math.max(MIN_SD, 1.4826 * median(resid.map((r) => Math.abs(r - centre))))
  const zs = resid.map((r) => (r - centre) / sd)

  const signals: Signal[] = []
  for (let i = 0; i < zs.length; i++) {
    const t = i + first
    if (t < n - 24) continue
    if (Math.abs(zs[i]) >= FLAG_Z) signals.push({ month: months[t], value: y[t], expected: expected[i], pctOff: y[t] / expected[i] - 1, z: zs[i], kind: zs[i] > 0 ? 'high' : 'low' })
  }

  // A run of three months all on the same side of expectation is a change in level, not a one-off.
  const tail = zs.slice(-3)
  let shift: ShiftSignal | null = null
  if (tail.length === 3 && (tail.every((v) => v >= SHIFT_Z) || tail.every((v) => v <= -SHIFT_Z))) {
    shift = { direction: tail[0] > 0 ? 'up' : 'down', months: 3, pctOff: mean(tail.map((_, k) => y[n - 3 + k] / expected[expected.length - 3 + k] - 1)) }
  }
  return { signals, shift }
}

export interface SignalsResult {
  revenue: SeriesSignals
  expenses: SeriesSignals | null
  /** Why nothing was checked, when that is the case. */
  note: string | null
}

export function detectSignals(months: string[], revenue: number[], expenses: number[] | null): SignalsResult {
  if (revenue.length < 24) return { revenue: { signals: [], shift: null }, expenses: null, note: 'Alerts need 24 months of history to know what a usual month looks like.' }
  return { revenue: detectSeries(months, revenue), expenses: expenses ? detectSeries(months, expenses) : null, note: null }
}
