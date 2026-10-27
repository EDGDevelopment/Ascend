export type MetricKey = 'revenue' | 'expenses' | 'cashFlow'

export interface SeriesPoint {
  /** Short month label, for example "Sep 26". */
  month: string
  actual: number | null
  forecast: number | null
  low: number | null
  high: number | null
}

export type MetricSeries = Record<MetricKey, SeriesPoint[]>

export interface Kpi {
  key: MetricKey
  label: string
  value: number
  /** Percent change versus the previous month. */
  change: number
  /** When true, a rising value is bad (for example expenses). */
  inverse?: boolean
  spark: number[]
}

/** Facts about how the dashboard figures were worked out from the client's spreadsheet. */
export interface ModelDriver {
  companyName: string
  orgType: 'local' | 'nonprofit'
  computedAt: string
  /** Plain-English name of the forecasting method. */
  method: string
  /** Typical monthly miss when the method is tested on the client's most recent months, as a decimal. */
  backtestError: number | null
  /** True when the expenses and cash flow charts come from the client's figures too, not just revenue. */
  coversExpenses: boolean
  /** Expected revenue growth over the next 12 months versus the last 12, as a decimal. */
  growth: number
}

export interface DashboardData {
  /** What the dashboards call the organisation: the name they gave, or their dataset's name. */
  name: string
  /** Label of the last month of real figures, for example "Sep 26". */
  asOf: string
  /** Which charts have data: expenses and cash flow need monthly expenses in the spreadsheet. */
  metrics: MetricKey[]
  kpis: Kpi[]
  series: MetricSeries
  /** Expected revenue over the next 12 months, with its range. */
  next12: { low: number; mid: number; high: number }
  modelDriver: ModelDriver
}
