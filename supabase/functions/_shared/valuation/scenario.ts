/**
 * "What if" for owners: change price, volume or costs and see what happens to the next 12 months' profit and
 * to what the business is worth. Deterministic and instant, so a slider can drive it.
 *
 * Costs are split into the part that moves with volume and the part that does not, from the client's own months
 * (see costs.ts). Price changes revenue but not cost. Volume changes both. A change in the cost of each unit
 * moves only the variable part. The value moves by the weighted change in each valuation method, so a zero
 * change reproduces the headline value exactly.
 */
import type { CostBehavior } from './costs.ts'
import { project } from './dcf.ts'
import type { LocalResult } from './local.ts'
import type { ModelOutput } from './model.ts'

export interface Adjustments {
  /** Change in selling price, as a decimal. 0.05 means +5%. */
  price: number
  /** Change in units sold. */
  volume: number
  /** Change in what each unit costs you. */
  unitCost: number
  /** Change in fixed costs (rent, salaries). */
  fixedCost: number
  /** A one-off spend this year in dollars (new equipment, a hire's set-up). Hits cash, not the yearly profit that sets value. */
  oneOff: number
}

export const NO_CHANGE: Adjustments = { price: 0, volume: 0, unitCost: 0, fixedCost: 0, oneOff: 0 }

export interface ScenarioResult {
  revenue12: number
  expenses12: number
  profit12: number
  baselineProfit12: number
  /** Yearly profit change versus the forecast. */
  deltaProfit: number
  /** Cash change over the year: the profit change minus any one-off spend. */
  deltaCash: number
  /** Business value after the change and the change itself. Local businesses only. */
  value: number | null
  deltaValue: number | null
  /** Where the fixed/variable split came from. */
  basis: 'fitted' | 'assumed'
}

/** If the months do not support a fitted split, assume this share of costs moves with volume. */
const ASSUMED_VARIABLE_SHARE = 0.6

function structure(o: ModelOutput, costs: CostBehavior | null) {
  const R = o.forecast.next12.revenue.p50
  const expenses = o.forecast.next12.expenses?.p50 ?? null
  const L = o.local as LocalResult | undefined
  // Without monthly expenses, take costs to be whatever leaves the profit the client reported.
  const E = expenses ?? (L ? Math.max(0, R - L.profile.netProfit * (R / Math.max(1, L.ttmRevenue))) : 0)
  const fitted = costs !== null && costs.reliable
  const V0 = fitted ? Math.min(E, costs.variableRatio * R) : ASSUMED_VARIABLE_SHARE * E
  return { R, E, V0, F0: Math.max(0, E - V0), basis: (fitted ? 'fitted' : 'assumed') as 'fitted' | 'assumed' }
}

export function evaluateScenario(o: ModelOutput, adj: Adjustments, costs: CostBehavior | null): ScenarioResult {
  const { R, E, V0, F0, basis } = structure(o, costs)
  const revenue12 = R * (1 + adj.price) * (1 + adj.volume)
  const expenses12 = V0 * (1 + adj.volume) * (1 + adj.unitCost) + F0 * (1 + adj.fixedCost)
  const baselineProfit12 = R - E
  const profit12 = revenue12 - expenses12
  const deltaProfit = profit12 - baselineProfit12

  let value: number | null = null
  let deltaValue: number | null = null
  const L = o.local as LocalResult | undefined
  if (L) {
    const sdeNew = L.sde + deltaProfit
    const dSde = (sdeNew - L.sde) * o.input.local.multipleMid
    const base = L.dcfParams
    const growth1 = (1 + base.growth1) * (1 + adj.price) * (1 + adj.volume) - 1
    const rev1Base = base.baseRevenue * (1 + base.growth1)
    const rev1New = base.baseRevenue * (1 + growth1)
    const ebitMargin = (rev1Base * base.ebitMargin + deltaProfit) / rev1New
    const dDcf = project({ ...base, growth1, ebitMargin }).enterpriseValue - L.dcf.enterpriseValue
    // Excess earnings: the extra after-tax cash is capitalised at the same cap rate (assets and the fair return on them are unchanged).
    const capRate = Math.max(0.05, L.discountRate - L.profile.terminalGrowth)
    const fcf1 = L.dcf.years[0].fcf
    const returnOnAssets = (L.assetFloor ?? 0) * (L.profile.riskFreeRate + L.profile.equityRiskPremium)
    const dExcess = L.excessValue ? (Math.max(0, fcf1 + deltaProfit * (1 - L.profile.taxRate) - returnOnAssets) - Math.max(0, fcf1 - returnOnAssets)) / capRate : 0
    const w = Object.fromEntries(L.methods.map((m) => [m.id, m.weight])) as Record<string, number>
    deltaValue = (w.sde ?? 0) * dSde + (w.dcf ?? 0) * dDcf + (w.excess ?? 0) * dExcess
    value = L.range.mid + deltaValue
  }
  return { revenue12, expenses12, profit12, baselineProfit12, deltaProfit, deltaCash: deltaProfit - adj.oneOff, value, deltaValue, basis }
}

export interface Lever {
  id: string
  label: string
  deltaProfit: number
  deltaValue: number | null
}

/** Ten per cent moves in each lever, ranked by what they do to value (or to profit for non-profits). */
export function rankLevers(o: ModelOutput, costs: CostBehavior | null): Lever[] {
  const tries: [string, string, Partial<Adjustments>][] = [
    ['price', 'Raise prices 10%', { price: 0.1 }],
    ['volume', 'Sell 10% more', { volume: 0.1 }],
    ['unitCost', 'Cut the cost of each sale by 10%', { unitCost: -0.1 }],
    ['fixedCost', 'Cut fixed costs by 10%', { fixedCost: -0.1 }],
  ]
  return tries
    .map(([id, label, adj]) => {
      const r = evaluateScenario(o, { ...NO_CHANGE, ...adj }, costs)
      return { id, label, deltaProfit: r.deltaProfit, deltaValue: r.deltaValue }
    })
    .sort((a, b) => (b.deltaValue ?? b.deltaProfit) - (a.deltaValue ?? a.deltaProfit))
}

/** Non-profit what-if: change income or spending and see the effect on the year-end balance. */
export function nonprofitScenario(o: ModelOutput, incomeChange: number, spendingChange: number, oneOff: number) {
  const f = o.forecast
  const R = f.next12.revenue.p50
  const E = f.next12.expenses?.p50 ?? 0
  const deltaNet = R * incomeChange - E * spendingChange - oneOff
  const base = o.nonprofit?.cash.p50[11] ?? 0
  const avg = o.nonprofit?.avgMonthlyExpenses ?? 0
  const newAvg = avg * (1 + spendingChange)
  const endCash = base + deltaNet
  return { deltaNet, endCash, monthsOfCash: newAvg > 0 ? endCash / newAvg : Number.POSITIVE_INFINITY }
}

export interface CustomerInputs {
  /** Average spend per purchase. */
  avgSale: number
  /** Purchases a typical customer makes in a year. */
  purchasesPerYear: number
  /** Share of each sale left after the direct cost of delivering it, 0 to 1. */
  grossMargin: number
  /** Years a typical customer keeps coming back. */
  yearsActive: number
  marketingPerMonth: number
  newCustomersPerMonth: number
}

export interface CustomerEconomics {
  /** What a customer is worth to you in gross profit over their time with you. */
  lifetimeValue: number
  /** What it costs to win a customer. */
  acquisitionCost: number | null
  /** Lifetime value for each dollar spent winning them. 3 or more is the usual rule of thumb. */
  ratio: number | null
  /** Months of a customer's gross profit it takes to earn back the cost of winning them. */
  paybackMonths: number | null
}

export function customerEconomics(c: CustomerInputs): CustomerEconomics {
  const yearlyProfit = c.avgSale * c.purchasesPerYear * c.grossMargin
  const lifetimeValue = yearlyProfit * c.yearsActive
  const acquisitionCost = c.newCustomersPerMonth > 0 ? c.marketingPerMonth / c.newCustomersPerMonth : null
  return {
    lifetimeValue,
    acquisitionCost,
    ratio: acquisitionCost !== null && acquisitionCost > 0 ? lifetimeValue / acquisitionCost : null,
    paybackMonths: acquisitionCost !== null && yearlyProfit > 0 ? acquisitionCost / (yearlyProfit / 12) : null,
  }
}
