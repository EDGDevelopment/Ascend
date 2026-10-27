import { useMemo } from 'react'
import { useValuation } from '@/valuation/useValuation'
import type { Band, ModelOutput } from '@/valuation/engine'
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

function kpiFor(key: MetricKey, label: string, points: SeriesPoint[], inverse = false): Kpi {
  const actuals = points.filter((p) => p.actual !== null).map((p) => p.actual as number)
  const value = actuals[actuals.length - 1]
  const prev = actuals[actuals.length - 2]
  return { key, label, value, change: prev ? Number((((value - prev) / Math.abs(prev)) * 100).toFixed(1)) : 0, inverse, spark: actuals.slice(-12) }
}

/** Everything the dashboards show, worked out from the client's own months and the model's forecast. Nothing here is sample data. */
function fromModel(o: ModelOutput, fallbackName: string): DashboardData {
  const rows = o.input.monthly
  const f = o.forecast
  const none: SeriesPoint[] = []
  const series: MetricSeries = {
    revenue: build(rows.map((r) => ({ month: r.month, value: r.revenue })), f.futureMonths, f.revenue),
    expenses: none,
    cashFlow: none,
  }
  const metrics: MetricKey[] = ['revenue']
  const kpis: Kpi[] = [kpiFor('revenue', 'Revenue', series.revenue)]
  if (f.expenses && f.net) {
    series.expenses = build(rows.map((r) => ({ month: r.month, value: r.expenses as number })), f.futureMonths, f.expenses)
    series.cashFlow = build(rows.map((r) => ({ month: r.month, value: r.revenue - (r.expenses as number) })), f.futureMonths, f.net)
    metrics.push('expenses', 'cashFlow')
    kpis.push(kpiFor('expenses', 'Expenses', series.expenses, true), kpiFor('cashFlow', 'Cash flow', series.cashFlow))
  }
  const modelDriver: ModelDriver = {
    companyName: o.input.companyName,
    orgType: o.input.orgType,
    computedAt: o.computedAt,
    method: `${METHOD_NAMES[f.method] ?? f.method}${f.usedPatch ? ' + Ascend Patch Forecaster' : ''}`,
    backtestError: f.backtest ? f.backtest.mape : null,
    coversExpenses: f.expenses !== null,
    growth: f.growth.p50,
  }
  return {
    name: o.input.companyName.trim() || fallbackName,
    asOf: monthLabel(rows[rows.length - 1].month),
    metrics,
    kpis,
    series,
    next12: { low: f.next12.revenue.p10, mid: f.next12.revenue.p50, high: f.next12.revenue.p90 },
    modelDriver,
  }
}

/**
 * Single seam for dashboard data. Returns null until the client has uploaded a spreadsheet and the forecast has
 * been worked out from it; pages show an upload prompt in that case.
 */
export function useDashboardData(): DashboardData | null {
  const { output, active } = useValuation()
  const name = active?.name ?? ''
  return useMemo(() => (output ? fromModel(output, name) : null), [output, name])
}
