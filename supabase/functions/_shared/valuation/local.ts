/**
 * Valuation for owner-run local businesses.
 *
 * Headline method: seller's discretionary earnings (SDE) x a multiple, the standard for owner-operated
 * businesses under roughly $5-10m of revenue. SDE is the profit one owner-operator takes home:
 * net profit plus the owner's pay, depreciation, interest and one-off or personal costs.
 * Cross-checks: a DCF driven by the forecast (with a build-up discount rate, since a corner shop has no
 * stock-market beta) and, when the client gives the value of equipment and stock, the excess earnings method
 * appraisers use for small businesses. They are combined by weight into a range, never one number, and the
 * page says how closely the methods agree.
 *
 * Multiples commonly quoted for small businesses run from about 1.5x to 4x SDE depending on size,
 * risk, growth and how dependent the business is on its owner.
 */
import { project, sensitivity, simulateDcf, type DcfParams, type DcfResult, type DcfSimulation, type SensitivityGrid } from './dcf.ts'
import type { ForecastPaths, ForecastResult } from './forecast.ts'
import { projectCash, type CashProjection } from './cash.ts'

export type Preset = 'service' | 'shop' | 'recurring' | 'online' | 'custom'

/** Starting points inside the commonly cited 1.5x-4x SDE band. Replace with comparable local sales when you have them. */
export const PRESETS: Record<Exclude<Preset, 'custom'>, { label: string; low: number; mid: number; high: number; note: string }> = {
  service: { label: 'Owner-run service business', low: 1.5, mid: 2.0, high: 2.5, note: 'Cleaners, trades, salons, consultants. The owner is the business, so buyers pay less.' },
  shop: { label: 'Local shop, café or restaurant', low: 1.8, mid: 2.4, high: 3.0, note: 'Premises, regulars and staff in place, but thin margins and long hours.' },
  recurring: { label: 'Recurring-revenue business', low: 2.5, mid: 3.2, high: 4.0, note: 'Memberships, subscriptions, service contracts: revenue that comes back by itself.' },
  online: { label: 'Online store', low: 2.0, mid: 2.8, high: 3.6, note: 'Sells beyond one town, but exposed to ad costs and platform changes.' },
}

export interface LocalProfile {
  // Last 12 months, from your accounts.
  /** Blank: worked out from the monthly revenue and expenses (revenue minus expenses). */
  netProfit?: number
  /** What you took out as pay or draws. */
  ownerPay: number
  depreciation: number
  interest: number
  /** One-off or personal costs run through the business (a trip, a repair, a family member's pay). */
  otherAddBacks: number
  /** What you would have to pay someone else to run it. Blank: the same as what you pay yourself. */
  fairManagerWage?: number
  /** Yearly spend to keep equipment and premises in working order. Blank: 1.5% of sales. */
  maintenanceCapex?: number
  /** Equipment, stock and fit-out you could sell, minus nothing for debts (those go in net debt). */
  assetValue?: number
  /** Loans minus cash in the business. Negative if you hold net cash. */
  netDebt: number
  /** Bank balance today. Optional: enables the cash-safety check (needs monthly expenses). */
  cashOnHand?: number
  /** Months of spending you want in the bank. Blank: 3. */
  reserveTargetMonths?: number
  preset: Preset
  multipleLow: number
  multipleMid: number
  multipleHigh: number
  taxRate: number
  nwcPct: number
  // Discount rate build-up.
  riskFreeRate: number
  equityRiskPremium: number
  /** Extra return buyers demand for the small size of the business. */
  sizePremium: number
  /** Extra return for owner dependence, customer concentration, one location and similar. */
  specificRisk: number
  terminalGrowth: number
  forecastYears: number
  marginSd: number
  rateSd: number
  terminalSd: number
}

/** A profile with every figure filled in. */
export type ResolvedLocal = LocalProfile & { netProfit: number; fairManagerWage: number; maintenanceCapex: number }

/** Fills what the client left blank from what they did give. netProfit stays undefined if it cannot be worked out. */
export function resolveLocal(p: LocalProfile, monthly: { revenue: number; expenses?: number }[]): LocalProfile {
  const last12 = monthly.slice(-12)
  const ttm = last12.reduce((s, r) => s + r.revenue, 0)
  const hasExpenses = last12.length > 0 && last12.every((r) => r.expenses !== undefined)
  return {
    ...p,
    netProfit: p.netProfit ?? (hasExpenses ? ttm - last12.reduce((s, r) => s + (r.expenses as number), 0) : undefined),
    fairManagerWage: p.fairManagerWage ?? p.ownerPay,
    maintenanceCapex: p.maintenanceCapex ?? ttm * 0.015,
  }
}

export function validateLocal(p: LocalProfile, ttmRevenue: number): string[] {
  const errors: string[] = []
  if (p.netProfit === undefined) errors.push('Enter your profit for the last 12 months, or add monthly expenses so Ascend can work it out.')
  const nums = [p.netProfit ?? 0, p.ownerPay, p.depreciation, p.interest, p.otherAddBacks, p.fairManagerWage ?? 0, p.maintenanceCapex ?? 0, p.netDebt, p.multipleLow, p.multipleMid, p.multipleHigh, p.taxRate, p.nwcPct, p.riskFreeRate, p.equityRiskPremium, p.sizePremium, p.specificRisk, p.terminalGrowth, p.marginSd, p.rateSd, p.terminalSd]
  if (!nums.every((v) => typeof v === 'number' && Number.isFinite(v))) errors.push('Every figure in the business details must be a number.')
  if (errors.length) return errors
  if (!(p.multipleLow > 0 && p.multipleLow <= p.multipleMid && p.multipleMid <= p.multipleHigh)) errors.push('Multiples must be positive and go low, typical, high.')
  if (p.multipleHigh > 10) errors.push('A multiple above 10x of owner earnings is not realistic for a small business.')
  if (p.taxRate < 0 || p.taxRate > 0.6) errors.push('Tax rate must be between 0% and 60%.')
  if (!Number.isInteger(p.forecastYears) || p.forecastYears < 3 || p.forecastYears > 10) errors.push('Valuation horizon must be 3 to 10 years.')
  if (p.assetValue !== undefined && !(Number.isFinite(p.assetValue) && p.assetValue >= 0)) errors.push('Asset value must be zero or more, or left blank.')
  if (ttmRevenue <= 0) errors.push('The last 12 months need revenue above zero.')
  const rate = discountRate(p)
  if (p.terminalGrowth >= rate - 0.005) errors.push(`Long-run growth (${(p.terminalGrowth * 100).toFixed(1)}%) must be at least 0.5 points below the discount rate (${(rate * 100).toFixed(1)}%).`)
  return errors
}

/** Build-up method: what an investor could earn risk-free, plus compensation for each kind of risk. */
export const discountRate = (p: Pick<LocalProfile, 'riskFreeRate' | 'equityRiskPremium' | 'sizePremium' | 'specificRisk'>) =>
  p.riskFreeRate + p.equityRiskPremium + p.sizePremium + p.specificRisk

export interface Range {
  low: number
  mid: number
  high: number
}

export interface MethodRow {
  id: 'sde' | 'dcf' | 'excess'
  label: string
  low: number
  mid: number
  high: number
  /** Share of the combined range, adding to 1 across methods. */
  weight: number
}

export interface Agreement {
  /** Gap between the highest and lowest typical value, as a share of their average. */
  spread: number
  label: 'close' | 'moderate' | 'wide'
}

export interface LocalCash extends CashProjection {
  monthsOfCash: number
  reserveTargetAmount: number
  avgMonthlyExpenses: number
}

export interface LocalResult {
  sde: number
  /** SDE as a share of revenue. */
  sdeMargin: number
  ttmRevenue: number
  discountRate: number
  /** Operating margin after a fair manager wage, used by the DCF. */
  ebitMargin: number
  sdeValue: Range
  dcfValue: Range
  dcfSpread: { p10: number; p90: number }
  /** Excess earnings method; null when equipment and stock were not given. */
  excessValue: Range | null
  methods: MethodRow[]
  agreement: Agreement
  /** Cash-safety check; null without a bank balance and monthly expenses. */
  cash: LocalCash | null
  assetFloor: number | null
  /** Business value (cash-free, debt-free) combining the methods. */
  range: Range
  netDebt: number
  /** Range after subtracting net debt: what the owner would take home. */
  ownerRange: Range
  dcf: DcfResult
  dcfParams: DcfParams
  sensitivity: SensitivityGrid
  simulation: DcfSimulation
  /** The figures actually used, with blanks filled in. */
  profile: ResolvedLocal
  warnings: string[]
}

export function runLocal(p: ResolvedLocal, forecast: ForecastResult, paths: ForecastPaths, simulations: number, seed: number): LocalResult {
  const ttm = forecast.trailing12.revenue
  const sde = p.netProfit + p.ownerPay + p.depreciation + p.interest + p.otherAddBacks
  const rate = discountRate(p)
  const ebitMargin = (sde - p.fairManagerWage - p.depreciation) / ttm
  const dcfParams: DcfParams = {
    baseRevenue: ttm,
    growth1: forecast.growth.p50,
    ebitMargin,
    taxRate: p.taxRate,
    daPct: p.depreciation / ttm,
    capexPct: p.maintenanceCapex / ttm,
    nwcPct: p.nwcPct,
    terminalGrowth: p.terminalGrowth,
    discountRate: rate,
    forecastYears: p.forecastYears,
  }
  const growthSamples = paths.revenue.map((path) => path.reduce((s, v) => s + v, 0) / ttm - 1)
  const dcf = project(dcfParams)
  const simulation = simulateDcf(dcfParams, growthSamples, { marginSd: p.marginSd, rateSd: p.rateSd, terminalSd: p.terminalSd }, simulations, seed + 1)

  const sdeValue: Range = { low: sde * p.multipleLow, mid: sde * p.multipleMid, high: sde * p.multipleHigh }
  const dcfValue: Range = { low: simulation.p25, mid: simulation.p50, high: simulation.p75 }
  const assetFloor = p.assetValue ?? null

  // Excess earnings (Treasury method): value = assets + goodwill, where goodwill is the capitalised cash earnings
  // left over after a fair return on the assets. The earnings used are the DCF's own year-one after-tax free cash
  // flow, which already pays a fair manager wage and upkeep, so the methods are built on the same footing. The cap
  // rate is the required return minus long-run growth.
  let excessValue: Range | null = null
  const capRate = Math.max(0.05, rate - p.terminalGrowth)
  const assetReturn = p.riskFreeRate + p.equityRiskPremium
  const fcf1 = dcf.years[0].fcf
  if (assetFloor !== null && assetFloor > 0) {
    const value = (cap: number) => assetFloor + Math.max(0, fcf1 - assetFloor * assetReturn) / cap
    excessValue = { low: value(capRate + 0.03), mid: value(capRate), high: value(Math.max(0.05, capRate - 0.03)) }
  }

  // Weighted combination of the methods, never lower than what the tangible assets alone would fetch.
  const methods: MethodRow[] = [
    { id: 'sde', label: 'Earnings multiple', ...sdeValue, weight: excessValue ? 0.4 : 0.55 },
    { id: 'dcf', label: 'Cash-flow model', ...dcfValue, weight: excessValue ? 0.3 : 0.45 },
  ]
  if (excessValue) methods.push({ id: 'excess', label: 'Excess earnings', ...excessValue, weight: 0.3 })
  const floor = assetFloor ?? Number.NEGATIVE_INFINITY
  const blend = (k: 'low' | 'mid' | 'high') => Math.max(floor, methods.reduce((s, m) => s + m.weight * m[k], 0))
  const range: Range = { low: blend('low'), mid: blend('mid'), high: blend('high') }
  const mids = methods.map((m) => m.mid)
  const avgMid = mids.reduce((s, v) => s + v, 0) / mids.length
  const spread = avgMid > 0 ? (Math.max(...mids) - Math.min(...mids)) / avgMid : 0
  const agreement: Agreement = { spread, label: spread < 0.2 ? 'close' : spread < 0.4 ? 'moderate' : 'wide' }

  // Cash safety: only when the client gave a bank balance and monthly expenses.
  let cash: LocalCash | null = null
  if (p.cashOnHand !== undefined && paths.expenses) {
    const exp12 = forecast.trailing12.expenses
    const avgMonthlyExpenses = exp12 !== null ? exp12 / 12 : 0
    const reserveTargetAmount = (p.reserveTargetMonths ?? 3) * avgMonthlyExpenses
    cash = { ...projectCash(paths.revenue, paths.expenses, p.cashOnHand, reserveTargetAmount), monthsOfCash: avgMonthlyExpenses > 0 ? p.cashOnHand / avgMonthlyExpenses : Number.POSITIVE_INFINITY, reserveTargetAmount, avgMonthlyExpenses }
  }
  const ownerRange: Range = { low: range.low - p.netDebt, mid: range.mid - p.netDebt, high: range.high - p.netDebt }

  const warnings: string[] = []
  if (sde <= 0) warnings.push('Owner earnings (SDE) are zero or negative, so the earnings-based methods show little value. Check the add-backs, or treat the business as worth about its assets.')
  if (ebitMargin <= 0 && sde > 0) warnings.push('After paying a fair wage to whoever runs it, the business makes no profit. A buyer who has to hire a manager would see little value.')
  if (dcf.terminalShare > 0.75) warnings.push(`${Math.round(dcf.terminalShare * 100)}% of the cash-flow value comes from beyond ${p.forecastYears} years, so it leans on the long-run assumptions. Trust the earnings multiple more.`)
  if (agreement.label === 'wide') warnings.push('The valuation methods disagree by more than 40%. That usually means the multiple, growth or discount rate needs a second look.')
  if (p.fairManagerWage < p.ownerPay * 0.3 && p.ownerPay > 0) warnings.push('The fair manager wage is far below what you pay yourself. Buyers will price in a realistic wage.')

  return { profile: p, sde, sdeMargin: sde / ttm, ttmRevenue: ttm, discountRate: rate, ebitMargin, sdeValue, dcfValue, dcfSpread: { p10: simulation.p10, p90: simulation.p90 }, excessValue, methods, agreement, cash, assetFloor, range, netDebt: p.netDebt, ownerRange, dcf, dcfParams, sensitivity: sensitivity(dcfParams), simulation, warnings }
}
