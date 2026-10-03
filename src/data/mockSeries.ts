import type { MetricKey, MetricSeries, SeriesPoint } from './types'

const MONTHS = [
  'Apr 25', 'May 25', 'Jun 25', 'Jul 25', 'Aug 25', 'Sep 25',
  'Oct 25', 'Nov 25', 'Dec 25', 'Jan 26', 'Feb 26', 'Mar 26',
  'Apr 26', 'May 26', 'Jun 26', 'Jul 26', 'Aug 26', 'Sep 26',
]
const FORECAST_MONTHS = ['Oct 26', 'Nov 26', 'Dec 26']

/** Small deterministic pseudo-random generator so mock charts are stable between renders. */
function seeded(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296 - 0.5
  }
}

function build(base: number, trend: number, season: number, noise: number, seed: number, forecastLift: number): SeriesPoint[] {
  const rand = seeded(seed)
  const actuals = MONTHS.map((_, i) => {
    const seasonal = Math.sin(((i + 2) / 12) * Math.PI * 2) * season
    return Math.round(base + trend * i + seasonal + rand() * noise)
  })

  const points: SeriesPoint[] = MONTHS.map((month, i) => ({
    month,
    actual: actuals[i],
    forecast: null,
    low: null,
    high: null,
  }))

  // Anchor the forecast line to the last actual so the two lines join.
  const last = actuals[actuals.length - 1]
  points[points.length - 1] = { ...points[points.length - 1], forecast: last, low: last, high: last }

  FORECAST_MONTHS.forEach((month, j) => {
    const i = MONTHS.length + j
    const seasonal = Math.sin(((i + 2) / 12) * Math.PI * 2) * season
    const value = Math.round(base + trend * i + seasonal + forecastLift * (j + 1))
    const spread = Math.round(Math.abs(base) * 0.03 * (j + 1.2))
    points.push({ month, actual: null, forecast: value, low: value - spread, high: value + spread })
  })

  return points
}

export const mockSeries: MetricSeries = {
  revenue: build(38000, 560, 3400, 2200, 11, 700),
  expenses: build(28500, 190, 1200, 1100, 29, 250),
  cashFlow: build(7600, 310, 1700, 1400, 47, 520),
}

export function lastActual(metric: MetricKey): number {
  const pts = mockSeries[metric]
  return pts.filter((p) => p.actual !== null).slice(-1)[0].actual as number
}
