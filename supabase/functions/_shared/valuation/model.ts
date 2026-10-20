/**
 * Entry point shared by the Supabase Edge Function and the browser.
 * Takes monthly figures plus a few details about the organisation, returns a 12-month forecast and,
 * depending on the kind of organisation, a value range (local business) or a resilience report (non-profit).
 */
import { fitCosts, type CostBehavior } from './costs.ts'
import { HORIZON, MIN_MONTHS, runForecast, type ForecastResult } from './forecast.ts'
import { resolveLocal, runLocal, validateLocal, type LocalProfile, type LocalResult, type ResolvedLocal } from './local.ts'
import { runNonprofit, validateNonprofit, type NonprofitProfile, type NonprofitResult } from './nonprofit.ts'
import { monthDiff } from './rand.ts'
import { detectSignals, type SignalsResult } from './signals.ts'

export type OrgType = 'local' | 'nonprofit'

export interface MonthlyRow {
  /** "YYYY-MM" */
  month: string
  revenue: number
  /** Spending that month. Optional for businesses, required for non-profits. */
  expenses?: number
}

export interface ModelInput {
  orgType: OrgType
  companyName: string
  monthly: MonthlyRow[]
  local: LocalProfile
  nonprofit: NonprofitProfile
  /** Monte Carlo trials, 500 to 20,000. */
  simulations: number
  seed: number
}

export interface ModelOutput {
  input: ModelInput
  forecast: ForecastResult
  local?: LocalResult
  nonprofit?: NonprofitResult
  /** Owner tools drawn from the same months. */
  tools: { signals: SignalsResult; costs: CostBehavior | null }
  computedAt: string
}

export const LIMITS = { maxMonths: 120, minSims: 500, maxSims: 20_000 }

export function validateModel(input: ModelInput): string[] {
  const errors: string[] = []
  const rows = input.monthly
  if (input.orgType !== 'local' && input.orgType !== 'nonprofit') return ['Choose local business or non-profit.']
  if (!Array.isArray(rows) || rows.length < MIN_MONTHS) return [`Add at least ${MIN_MONTHS} months of revenue. Two years or more gives much better forecasts.`]
  if (rows.length > LIMITS.maxMonths) return [`Use at most ${LIMITS.maxMonths} months.`]

  for (let i = 0; i < rows.length; i++) {
    const r = rows[i]
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(r.month ?? '')) return [`Row ${i + 1}: month must look like 2025-03.`]
    if (i > 0 && monthDiff(rows[i - 1].month, r.month) !== 1) {
      errors.push(`Months must be consecutive with none missing: ${rows[i - 1].month} is followed by ${r.month}.`)
      break
    }
    if (typeof r.revenue !== 'number' || !Number.isFinite(r.revenue) || r.revenue < 0) errors.push(`${r.month}: revenue must be zero or more.`)
    if (r.expenses !== undefined && (typeof r.expenses !== 'number' || !Number.isFinite(r.expenses) || r.expenses < 0)) errors.push(`${r.month}: expenses must be zero or more.`)
  }
  if (errors.length) return errors.slice(0, 5)

  const withExp = rows.filter((r) => r.expenses !== undefined).length
  const hasExpenses = withExp === rows.length
  if (withExp > 0 && !hasExpenses) errors.push('Either give expenses for every month or for none.')
  if (!Number.isInteger(input.simulations) || input.simulations < LIMITS.minSims || input.simulations > LIMITS.maxSims) errors.push(`Simulations must be ${LIMITS.minSims} to ${LIMITS.maxSims}.`)
  if (errors.length) return errors

  const last12 = rows.slice(-12)
  const ttm = last12.reduce((s, r) => s + r.revenue, 0)
  const lastMonth = rows[rows.length - 1].month
  return input.orgType === 'local' ? validateLocal(resolveLocal(input.local, rows), ttm) : validateNonprofit(input.nonprofit, lastMonth, hasExpenses)
}

export function runModel(input: ModelInput): ModelOutput {
  const errors = validateModel(input)
  if (errors.length) throw new Error(errors.join(' '))
  const rows = input.monthly
  const hasExpenses = rows[0].expenses !== undefined
  const { result: forecast, paths } = runForecast({
    months: rows.map((r) => r.month),
    revenue: rows.map((r) => r.revenue),
    expenses: hasExpenses ? rows.map((r) => r.expenses as number) : null,
    simulations: input.simulations,
    seed: input.seed,
  })
  const revenue = rows.map((r) => r.revenue)
  const expenses = hasExpenses ? rows.map((r) => r.expenses as number) : null
  const tools = { signals: detectSignals(rows.map((r) => r.month), revenue, expenses), costs: expenses ? fitCosts(revenue, expenses) : null }
  const out: ModelOutput = { input, forecast, tools, computedAt: new Date().toISOString() }
  if (input.orgType === 'local') out.local = runLocal(resolveLocal(input.local, rows) as ResolvedLocal, forecast, paths, input.simulations, input.seed)
  else out.nonprofit = runNonprofit(input.nonprofit, forecast, paths, rows.map((r) => r.expenses as number), rows[rows.length - 1].month, input.seed)
  return out
}

export { HORIZON }
export type { ForecastResult, LocalProfile, LocalResult, NonprofitProfile, NonprofitResult }
export { PRESETS, discountRate, resolveLocal } from './local.ts'
export type { ResolvedLocal } from './local.ts'
export { MIX_LABELS } from './nonprofit.ts'
export type { FundingMix, PipelineItem } from './nonprofit.ts'
export type { Band, Backtest, ForecastMethod } from './forecast.ts'
export type { DcfParams, DcfResult, DcfSimulation, SensitivityGrid, HistogramBin } from './dcf.ts'
export type { Preset, Range } from './local.ts'
export type { Flag, Level } from './nonprofit.ts'
export { addMonths } from './rand.ts'
export { registerPatchModel, patchModelLoaded } from './patch.ts'
export type { PatchWeightsFile } from './patch.ts'
export { evaluateScenario, rankLevers, nonprofitScenario, customerEconomics, NO_CHANGE } from './scenario.ts'
export type { Adjustments, ScenarioResult, Lever, CustomerInputs, CustomerEconomics } from './scenario.ts'
export type { CostBehavior } from './costs.ts'
export type { Signal, ShiftSignal, SeriesSignals, SignalsResult } from './signals.ts'
export type { MethodRow, Agreement, LocalCash } from './local.ts'
