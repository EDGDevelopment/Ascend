/**
 * Discounted cash flow core. Deliberately small: the caller decides the discount rate, the
 * starting revenue and the first-year growth, so the same maths serves any organisation.
 * All rates are decimals. Money is in whatever currency and unit the client used.
 */
import { normal, percentile, rng } from './rand.ts'

export interface DcfParams {
  /** Revenue of the last 12 months. */
  baseRevenue: number
  /** Revenue growth in year 1. Fades in a straight line to terminalGrowth by the last year. */
  growth1: number
  /** Operating profit as a share of revenue, after paying whoever runs the business a fair wage. */
  ebitMargin: number
  taxRate: number
  daPct: number
  capexPct: number
  /** Cash tied up in working capital, as a share of each extra dollar of revenue. */
  nwcPct: number
  terminalGrowth: number
  discountRate: number
  forecastYears: number
}

export interface DcfYear {
  year: number
  revenue: number
  growth: number
  ebit: number
  fcf: number
  pvFcf: number
}

export interface DcfResult {
  years: DcfYear[]
  pvForecast: number
  terminalValue: number
  pvTerminal: number
  enterpriseValue: number
  /** Share of value that comes from beyond the forecast window. Above ~75% means the forecast does little work. */
  terminalShare: number
}

export function project(p: DcfParams): DcfResult {
  const n = p.forecastYears
  const years: DcfYear[] = []
  let prev = p.baseRevenue
  let pvForecast = 0
  let lastFcf = 0
  for (let t = 1; t <= n; t++) {
    const growth = n === 1 ? p.growth1 : p.growth1 + ((p.terminalGrowth - p.growth1) * (t - 1)) / (n - 1)
    const revenue = prev * (1 + growth)
    const ebit = revenue * p.ebitMargin
    const fcf = ebit * (1 - p.taxRate) + revenue * p.daPct - revenue * p.capexPct - (revenue - prev) * p.nwcPct
    const pvFcf = fcf / (1 + p.discountRate) ** t
    pvForecast += pvFcf
    years.push({ year: t, revenue, growth, ebit, fcf, pvFcf })
    prev = revenue
    lastFcf = fcf
  }
  const terminalValue = (lastFcf * (1 + p.terminalGrowth)) / (p.discountRate - p.terminalGrowth)
  const pvTerminal = terminalValue / (1 + p.discountRate) ** n
  const enterpriseValue = pvForecast + pvTerminal
  return { years, pvForecast, terminalValue, pvTerminal, enterpriseValue, terminalShare: enterpriseValue !== 0 ? pvTerminal / enterpriseValue : 0 }
}

export interface SensitivityGrid {
  rates: number[]
  growths: number[]
  /** values[row = discount rate][col = long-run growth]; NaN where growth reaches the rate. */
  values: number[][]
}

export function sensitivity(p: DcfParams, rateStep = 0.02, growthStep = 0.0025): SensitivityGrid {
  const rates = [-2, -1, 0, 1, 2].map((k) => p.discountRate + k * rateStep)
  const growths = [-2, -1, 0, 1, 2].map((k) => p.terminalGrowth + k * growthStep)
  const values = rates.map((r) => growths.map((g) => (g >= r - 0.005 ? Number.NaN : project({ ...p, discountRate: r, terminalGrowth: g }).enterpriseValue)))
  return { rates, growths, values }
}

export interface Uncertainty {
  marginSd: number
  rateSd: number
  terminalSd: number
}

export interface HistogramBin {
  from: number
  to: number
  count: number
}

export interface DcfSimulation {
  trials: number
  discarded: number
  mean: number
  p10: number
  p25: number
  p50: number
  p75: number
  p90: number
  histogram: HistogramBin[]
}

/**
 * Monte Carlo over the DCF. First-year growth is drawn from the forecast's own simulated outcomes, so how
 * uncertain the value is depends on how bumpy this business's history actually was, not on a guess.
 */
export function simulateDcf(p: DcfParams, growthSamples: number[], u: Uncertainty, simulations: number, seed: number): DcfSimulation {
  const rand = rng(seed)
  const values: number[] = []
  let discarded = 0
  for (let i = 0; i < simulations; i++) {
    const growth1 = growthSamples[i % growthSamples.length]
    const ebitMargin = Math.min(0.9, Math.max(-0.5, p.ebitMargin + normal(rand) * u.marginSd))
    const discountRate = Math.max(0.03, p.discountRate + normal(rand) * u.rateSd)
    const terminalGrowth = p.terminalGrowth + normal(rand) * u.terminalSd
    // At or above the discount rate a perpetuity has no finite value. Drop the trial instead of clamping, so tails aren't distorted.
    if (terminalGrowth >= discountRate - 0.005) {
      discarded++
      continue
    }
    values.push(project({ ...p, growth1, ebitMargin, discountRate, terminalGrowth }).enterpriseValue)
  }
  values.sort((a, b) => a - b)
  const lo = percentile(values, 0.01)
  const hi = percentile(values, 0.99)
  const bins = 30
  const width = hi > lo ? (hi - lo) / bins : 1
  const histogram: HistogramBin[] = Array.from({ length: bins }, (_, i) => ({ from: lo + i * width, to: lo + (i + 1) * width, count: 0 }))
  for (const v of values) if (v >= lo && v <= hi) histogram[Math.min(bins - 1, Math.floor((v - lo) / width))].count++
  return {
    trials: values.length,
    discarded,
    mean: values.length ? values.reduce((s, v) => s + v, 0) / values.length : Number.NaN,
    p10: percentile(values, 0.1),
    p25: percentile(values, 0.25),
    p50: percentile(values, 0.5),
    p75: percentile(values, 0.75),
    p90: percentile(values, 0.9),
    histogram,
  }
}
