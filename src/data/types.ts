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

export interface HealthFactor {
  name: string
  score: number
  note: string
}

export type Impact = 'High' | 'Medium' | 'Low'
export type OpportunityStatus = 'New' | 'Reviewing' | 'Done'

export interface Opportunity {
  id: string
  title: string
  summary: string
  detail: string
  area: 'Revenue' | 'Costs' | 'Inventory' | 'Cash flow' | 'Customers'
  impact: Impact
  /** Model confidence from 0 to 1. */
  confidence: number
  /** Estimated monthly value in dollars. */
  monthlyValue: number
  status: OpportunityStatus
}

export interface ActivityItem {
  id: string
  kind: 'forecast' | 'signal' | 'data' | 'opportunity'
  text: string
  time: string
}

export interface DemandPoint {
  day: string
  actual: number
  potential: number
}

export type SourceStatus = 'Healthy' | 'Syncing' | 'Needs attention'

export interface DataSource {
  id: string
  name: string
  type: string
  status: SourceStatus
  lastSync: string
  records: number
  coverage: string
}

export interface ModelInfo {
  name: string
  version: string
  architecture: string
  patchLength: number
  stride: number
  contextMonths: number
  horizonDays: number
  parameters: string
  lastTrained: string
  status: string
}

export interface ModelAccuracyPoint {
  horizon: string
  error: number
}

export interface TrainingRun {
  id: string
  date: string
  dataset: string
  mape: number
  note: string
}

export interface DashboardData {
  business: { name: string; industry: string; location: string }
  healthScore: number
  healthChange: number
  healthFactors: HealthFactor[]
  kpis: Kpi[]
  series: MetricSeries
  opportunities: Opportunity[]
  activity: ActivityItem[]
  demand: DemandPoint[]
  sources: DataSource[]
  model: ModelInfo
  accuracy: ModelAccuracyPoint[]
  trainingRuns: TrainingRun[]
}
