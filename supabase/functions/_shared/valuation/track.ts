// Forecast track record: remember each forecast when it is made, then score it against what actually happened.
// Plain TypeScript with no browser or Deno APIs, like the rest of the engine.

import type { ModelOutput } from './model.ts'

/** What a forecast said, kept so it can be checked later. Revenue only. */
export interface ForecastSnapshot {
  /** When the forecast was worked out (ISO time). */
  madeAt: string
  /** The last month of real data the forecast was built from, "YYYY-MM". */
  lastMonth: string
  /** The 12 months it looked ahead. */
  months: string[]
  p10: number[]
  p50: number[]
  p90: number[]
}

export interface ScoredMonth {
  month: string
  actual: number
  p10: number
  p50: number
  p90: number
  inRange: boolean
  /** (actual - p50) / p50. Positive means the business did better than forecast. */
  error: number
}

export interface SnapshotScore {
  madeAt: string
  lastMonth: string
  /** Months in the forecast horizon. */
  horizon: number
  months: ScoredMonth[]
}

export interface TrackRecord {
  snapshots: SnapshotScore[]
  /** Months scored across all forecasts. */
  scored: number
  /** Share of scored months that landed inside the p10 to p90 range, or null when nothing is scored. */
  inRangeShare: number | null
  /** Typical size of the miss against the middle forecast (mean absolute % error). */
  typicalError: number | null
  /** Average signed miss. Positive means results beat the forecast, negative means they fell short. */
  bias: number | null
}

/** The share of months a p10 to p90 range should hold the truth, by design. */
export const EXPECTED_IN_RANGE = 0.8
export const MAX_SNAPSHOTS = 36

export function snapshotFrom(output: ModelOutput): ForecastSnapshot | null {
  const rows = output.input.monthly
  const f = output.forecast
  const last = rows[rows.length - 1]
  if (!last || f.futureMonths.length === 0 || f.revenue.p50.length !== f.futureMonths.length) return null
  return {
    madeAt: output.computedAt,
    lastMonth: last.month,
    months: [...f.futureMonths],
    p10: [...f.revenue.p10],
    p50: [...f.revenue.p50],
    p90: [...f.revenue.p90],
  }
}

/** Adds a snapshot. A newer forecast built from the same last month replaces the older one, so re-running does not pile up copies. */
export function addSnapshot(list: ForecastSnapshot[], snap: ForecastSnapshot): ForecastSnapshot[] {
  const rest = list.filter((s) => s.lastMonth !== snap.lastMonth)
  return [...rest, snap].sort((a, b) => (a.lastMonth < b.lastMonth ? -1 : 1)).slice(-MAX_SNAPSHOTS)
}

export function scoreTrackRecord(snaps: ForecastSnapshot[], monthly: { month: string; revenue: number }[]): TrackRecord {
  const actual = new Map(monthly.map((r) => [r.month, r.revenue]))
  const scoredSnaps: SnapshotScore[] = snaps.map((s) => {
    const months: ScoredMonth[] = []
    s.months.forEach((m, i) => {
      const a = actual.get(m)
      // Only months after the forecast was made count: anything up to lastMonth was already known.
      if (a === undefined || m <= s.lastMonth || !(s.p50[i] > 0)) return
      months.push({ month: m, actual: a, p10: s.p10[i], p50: s.p50[i], p90: s.p90[i], inRange: a >= s.p10[i] && a <= s.p90[i], error: (a - s.p50[i]) / s.p50[i] })
    })
    return { madeAt: s.madeAt, lastMonth: s.lastMonth, horizon: s.months.length, months }
  })
  const all = scoredSnaps.flatMap((s) => s.months)
  const n = all.length
  return {
    snapshots: scoredSnaps,
    scored: n,
    inRangeShare: n ? all.filter((m) => m.inRange).length / n : null,
    typicalError: n ? all.reduce((t, m) => t + Math.abs(m.error), 0) / n : null,
    bias: n ? all.reduce((t, m) => t + m.error, 0) / n : null,
  }
}
