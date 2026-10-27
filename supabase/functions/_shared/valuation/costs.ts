/**
 * How costs behave: how much is fixed (rent, salaries) and how much rises and falls with sales (stock, card
 * fees, hourly staff). Fitted from the client's own months as expenses = fixed + variable share x revenue, by
 * least squares. From that: the break-even point and how far above it the business is running.
 * Only as good as the months it sees; a poor fit is reported rather than hidden.
 */
import { mean } from './rand.ts'

export interface CostBehavior {
  /** Costs paid each month whatever sales are. */
  fixedMonthly: number
  /** Cents of cost for each dollar of sales. */
  variableRatio: number
  /** How well one straight line explains the months, 0 to 1. */
  r2: number
  months: number
  /** Monthly revenue at which the business covers its costs. Null when each sale costs more than it brings in. */
  breakEvenMonthly: number | null
  avgRevenue: number
  /** Share of sales that could vanish before the business loses money. Negative if it is already below break-even. */
  marginOfSafety: number | null
  /** Months in the last 12 that fell below break-even. */
  monthsBelow: number | null
  /** False when the fit is too weak to lean on. */
  reliable: boolean
  note: string | null
}

export function fitCosts(revenue: number[], expenses: number[]): CostBehavior | null {
  const n = Math.min(36, revenue.length)
  if (n < 12) return null
  const x = revenue.slice(-n)
  const y = expenses.slice(-n)
  const mx = mean(x)
  const my = mean(y)
  const sxx = x.reduce((s, v) => s + (v - mx) ** 2, 0)
  if (sxx === 0) return null
  const sxy = x.reduce((s, v, i) => s + (v - mx) * (y[i] - my), 0)
  const syy = y.reduce((s, v) => s + (v - my) ** 2, 0)
  let b = sxy / sxx
  const r2 = syy > 0 ? (sxy * sxy) / (sxx * syy) : 0
  let note: string | null = null
  // Costs cannot fall as sales rise, and cannot rise by more than a dollar per dollar for long.
  if (b < 0) { b = 0; note = 'Costs did not rise with sales in your months, so they are treated as all fixed.' }
  if (b > 1) { b = 1; note = 'Costs rose faster than sales in your months. Treated as one dollar of cost per dollar of sales.' }
  const a = my - b * mx
  const fixedMonthly = Math.max(0, a)
  const reliable = r2 >= 0.5 && n >= 18
  if (!reliable && !note) note = n < 18 ? 'Under 18 months of history, so the fixed and variable split is a rough guide.' : 'Your costs do not track your sales closely, so the fixed and variable split is a rough guide.'
  const avg = mean(x)
  const breakEven = b < 1 ? fixedMonthly / (1 - b) : null
  return {
    fixedMonthly,
    variableRatio: b,
    r2,
    months: n,
    breakEvenMonthly: breakEven,
    avgRevenue: avg,
    marginOfSafety: breakEven !== null && avg > 0 ? (avg - breakEven) / avg : null,
    monthsBelow: breakEven !== null ? revenue.slice(-12).filter((v) => v < breakEven).length : null,
    reliable,
    note,
  }
}
