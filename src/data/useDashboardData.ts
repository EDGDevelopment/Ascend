import { useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import { useValuation } from '@/valuation/useValuation'
import type { Band, ModelOutput } from '@/valuation/engine'
import { mockDashboard } from './mockDashboard'
import type { DashboardData, Kpi, MetricKey, MetricSeries, ModelDriver, SeriesPoint } from './types'

const SHOWN_HISTORY = 18
const SHOWN_FORECAST = 3

const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
/** "2026-09" to "Sep 26", the label style the charts already use. */
export const monthLabel = (m: string) => `${MONTH_NAMES[Number(m.slice(5, 7)) - 1]} ${m.slice(2, 4)}`

const METHOD_NAMES: Record<string, string> = {
  'seasonal-multiplicative': 'seasonal trend model',
  'seasonal-additive': 'seasonal trend model',
  'trend-only': 'trend model',
  'last-year-growth': 'last year, scaled by recent growth',
}

function build(history: { month: string; value: number }[], future: string[], band: Band): SeriesPoint[] {
  const shown = history.slice(-SHOWN_HISTORY)
  const points: SeriesPoint[] = shown.map((h) => ({ month: monthLabel(h.month), actual: h.value, forecast: null, low: null, high: null }))
  // Anchor the forecast line to the last actual so the two lines join.
  const last = shown[shown.length - 1].value
  points[points.length - 1] = { ...points[points.length - 1], forecast: last, low: last, high: last }
  future.slice(0, SHOWN_FORECAST).forEach((m, k) => {
    points.push({ month: monthLabel(m), actual: null, forecast: Math.round(band.p50[k]), low: Math.round(band.p10[k]), high: Math.round(band.p90[k]) })
  })
  return points
}

function kpiFor(base: Kpi, points: SeriesPoint[]): Kpi {
  const actuals = points.filter((p) => p.actual !== null).map((p) => p.actual as number)
  const value = actuals[actuals.length - 1]
  const prev = actuals[actuals.length - 2]
  return { ...base, value, change: prev ? Number((((value - prev) / Math.abs(prev)) * 100).toFixed(1)) : 0, spark: actuals.slice(-12) }
}

/**
 * Replaces the sample series with the client's own months and the model's forecast. Revenue always comes from
 * the model. Expenses and cash flow do too when the client gave monthly expenses; otherwise they stay sample data.
 */
function withModel(base: DashboardData, o: ModelOutput): DashboardData {
  const rows = o.input.monthly
  const f = o.forecast
  const series: MetricSeries = { ...base.series }
  series.revenue = build(rows.map((r) => ({ month: r.month, value: r.revenue })), f.futureMonths, f.revenue)
  if (f.expenses && f.net) {
    series.expenses = build(rows.map((r) => ({ month: r.month, value: r.expenses as number })), f.futureMonths, f.expenses)
    series.cashFlow = build(rows.map((r) => ({ month: r.month, value: r.revenue - (r.expenses as number) })), f.futureMonths, f.net)
  }
  const kpis = base.kpis.map((k) => (k.key === 'revenue' || (f.expenses && (k.key === 'expenses' || k.key === 'cashFlow')) ? kpiFor(k, series[k.key as MetricKey]) : k))
  const driver: ModelDriver = {
    companyName: o.input.companyName,
    orgType: o.input.orgType,
    computedAt: o.computedAt,
    method: `${METHOD_NAMES[f.method] ?? f.method}${f.usedPatch ? ' + Ascend Patch Forecaster' : ''}`,
    backtestError: f.backtest ? f.backtest.mape : null,
    coversExpenses: f.expenses !== null,
    growth: f.growth.p50,
  }
  return { ...base, series, kpis, modelDriver: driver }
}

/**
 * Single seam for dashboard data. Today it returns bundled sample data, with the charts replaced by the
 * client's own monthly figures and forecast once they have run the model. Later this is where Supabase
 * queries or the model API will be called.
 */
export function useDashboardData(): DashboardData {
  const { user } = useAuth()
  const { output } = useValuation()
  const businessName = user?.businessName?.trim()
  return useMemo(() => {
    const base = businessName ? { ...mockDashboard, business: { ...mockDashboard.business, name: businessName } } : mockDashboard
    return output ? withModel(base, output) : base
  }, [businessName, output])
}
