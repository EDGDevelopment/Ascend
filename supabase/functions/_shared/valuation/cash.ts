/**
 * Cash projection shared by non-profits and businesses: start from today's bank balance, add each simulated
 * month's income, subtract spending, and see where the balance goes.
 */
import type { Band } from './forecast.ts'
import { percentile } from './rand.ts'

export interface CashProjection {
  /** Balance at the end of each of the next 12 months. */
  cash: Band
  /** A small sample of the simulated balances, for drawing. */
  samples: number[][]
  probShortfall: number
  probBelowReserve: number
  net12: { p10: number; p50: number; p90: number }
  probSurplus: number
}

/**
 * `extras(i)` adds lump sums (such as grants that may land) to simulated path i, one value per month.
 */
export function projectCash(revenue: number[][], expenses: number[][], cashOnHand: number, reserveTarget: number, extras?: (i: number) => number[]): CashProjection {
  const sims = revenue.length
  const paths: number[][] = []
  const nets: number[] = []
  let shortfalls = 0
  let below = 0
  for (let i = 0; i < sims; i++) {
    const add = extras ? extras(i) : null
    let cash = cashOnHand
    let min = cash
    let net = 0
    const path: number[] = []
    for (let k = 0; k < 12; k++) {
      const flow = revenue[i][k] + (add ? add[k] : 0) - expenses[i][k]
      cash += flow
      net += flow
      if (cash < min) min = cash
      path.push(cash)
    }
    paths.push(path)
    nets.push(net)
    if (min < 0) shortfalls++
    if (min < reserveTarget) below++
  }
  const cols = Array.from({ length: 12 }, (_, k) => paths.map((c) => c[k]).sort((a, b) => a - b))
  const sorted = [...nets].sort((a, b) => a - b)
  return {
    cash: { p10: cols.map((c) => percentile(c, 0.1)), p50: cols.map((c) => percentile(c, 0.5)), p90: cols.map((c) => percentile(c, 0.9)) },
    samples: paths.slice(0, 120).map((c) => c.map((v) => Math.round(v))),
    probShortfall: shortfalls / sims,
    probBelowReserve: below / sims,
    net12: { p10: percentile(sorted, 0.1), p50: percentile(sorted, 0.5), p90: percentile(sorted, 0.9) },
    probSurplus: nets.filter((v) => v >= 0).length / sims,
  }
}
