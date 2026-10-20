/**
 * Financial resilience for small non-profits, charities and community groups.
 *
 * A non-profit has no owner to sell to, so "value" is the wrong question. Boards ask: how long can we
 * keep going, how exposed are we to losing one funder, and will this year end in surplus or deficit?
 * This module answers those from monthly income and spending, using the same revenue forecast as the
 * business model, plus an optional pipeline of grants and campaigns that may or may not land.
 *
 * Measures follow the common non-profit finance guidance: months of cash on hand, operating reserve
 * ratio (unrestricted net assets / average monthly spending, with 3 to 6 months usually recommended),
 * revenue diversification and donor retention.
 */
import type { Band, ForecastPaths, ForecastResult } from './forecast.ts'
import { projectCash } from './cash.ts'
import { addMonths, monthDiff, rng, sum } from './rand.ts'

export interface FundingMix {
  individuals: number
  foundations: number
  government: number
  earned: number
  corporate: number
}

export const MIX_LABELS: Record<keyof FundingMix, string> = {
  individuals: 'Individual donors',
  foundations: 'Foundations and grants',
  government: 'Government funding',
  earned: 'Earned income (fees, sales, events)',
  corporate: 'Corporate sponsors',
}

export interface PipelineItem {
  name: string
  amount: number
  /** Chance it comes in, 0 to 1. */
  probability: number
  /** "YYYY-MM" the money would arrive. Must fall within the next 12 months. */
  month: string
}

export interface NonprofitProfile {
  cashOnHand: number
  /** Cash that isn't tied to a restricted purpose. Defaults to cash on hand. */
  unrestrictedNetAssets?: number
  reserveTargetMonths: number
  /** Share of income from each source, as decimals adding to about 1. All zero means "not given". */
  mix: FundingMix
  /** Share of last year's donors who gave again, 0 to 1. */
  donorRetention?: number
  /** Grants and campaigns in progress that are not already in the income history. */
  pipeline: PipelineItem[]
}

export function validateNonprofit(p: NonprofitProfile, lastMonth: string, hasExpenses: boolean): string[] {
  const errors: string[] = []
  const num = (v: unknown) => typeof v === 'number' && Number.isFinite(v)
  if (!hasExpenses) errors.push('Monthly spending is needed for a non-profit: add an Expenses figure for every month.')
  if (!num(p.cashOnHand)) errors.push('Cash on hand must be a number.')
  if (p.unrestrictedNetAssets !== undefined && !num(p.unrestrictedNetAssets)) errors.push('Unrestricted net assets must be a number, or left blank.')
  if (!num(p.reserveTargetMonths) || p.reserveTargetMonths < 0 || p.reserveTargetMonths > 24) errors.push('Reserve target must be between 0 and 24 months of spending.')
  const shares = Object.values(p.mix ?? {})
  if (shares.some((s) => !num(s) || s < 0 || s > 1)) errors.push('Funding mix shares must each be between 0% and 100%.')
  else {
    const total = sum(shares)
    if (total > 0 && Math.abs(total - 1) > 0.02) errors.push(`Funding mix adds up to ${(total * 100).toFixed(0)}%. It should add to 100%, or leave every source at 0.`)
  }
  if (p.donorRetention !== undefined && !(num(p.donorRetention) && p.donorRetention >= 0 && p.donorRetention <= 1)) errors.push('Donor retention must be between 0% and 100%, or left blank.')
  if (!Array.isArray(p.pipeline) || p.pipeline.length > 50) errors.push('Pipeline can hold up to 50 items.')
  else {
    p.pipeline.forEach((it, i) => {
      const label = it.name?.trim() || `Pipeline item ${i + 1}`
      if (!num(it.amount) || it.amount < 0) errors.push(`${label}: amount must be zero or more.`)
      if (!num(it.probability) || it.probability < 0 || it.probability > 1) errors.push(`${label}: chance must be between 0% and 100%.`)
      const d = /^\d{4}-(0[1-9]|1[0-2])$/.test(it.month ?? '') ? monthDiff(lastMonth, it.month) : Number.NaN
      if (!(d >= 1 && d <= 12)) errors.push(`${label}: expected month must be within the 12 months after your last data month.`)
    })
  }
  return errors
}

export type Level = 'good' | 'watch' | 'risk'

export interface Flag {
  level: Level
  text: string
}

export interface NonprofitResult {
  avgMonthlyExpenses: number
  monthsOfCash: number
  reserveRatio: number
  reserveTargetAmount: number
  /** Projected cash at the end of each of the next 12 months. */
  cash: Band
  /** A small sample of the simulated cash paths, for drawing. */
  cashSamples: number[][]
  /** First month the typical (median) cash balance runs out, or null if it lasts the whole year. */
  runoutMonth: string | null
  probShortfall: number
  probBelowReserve: number
  /** True when cash today is already under the reserve target. */
  startsBelowReserve: boolean
  /** First month the typical cash balance reaches the reserve target, if it starts below it. */
  reserveReachedMonth: string | null
  net12: { p10: number; p50: number; p90: number }
  probSurplus: number
  pipelineExpected: number
  pipelineCount: number
  mix: { key: keyof FundingMix; label: string; share: number }[]
  largestSource: { label: string; share: number } | null
  /** Herfindahl index: 1 means one source, 0.2 means five equal ones. */
  concentration: number | null
  retention: { rate: number; dollarsToReplace: number } | null
  flags: Flag[]
}

export function runNonprofit(p: NonprofitProfile, forecast: ForecastResult, paths: ForecastPaths, expenses: number[], lastMonth: string, seed: number): NonprofitResult {
  const exp12 = expenses.slice(-12)
  const avgMonthlyExpenses = sum(exp12) / exp12.length
  const una = p.unrestrictedNetAssets ?? p.cashOnHand
  const monthsOfCash = avgMonthlyExpenses > 0 ? p.cashOnHand / avgMonthlyExpenses : Number.POSITIVE_INFINITY
  const reserveRatio = avgMonthlyExpenses > 0 ? una / avgMonthlyExpenses : Number.POSITIVE_INFINITY
  const reserveTargetAmount = p.reserveTargetMonths * avgMonthlyExpenses

  const rand = rng(seed + 7)
  // Each pipeline item lands in full or not at all, so lumpy grants are not averaged into a smooth drip.
  const proj = projectCash(paths.revenue, paths.expenses as number[][], p.cashOnHand, reserveTargetAmount, () => {
    const extra = new Array<number>(12).fill(0)
    for (const it of p.pipeline) if (rand() < it.probability) extra[monthDiff(lastMonth, it.month) - 1] += it.amount
    return extra
  })
  const { cash, net12 } = proj
  const runIdx = cash.p50.findIndex((v) => v < 0)

  const mixTotal = sum(Object.values(p.mix))
  const mix = (Object.keys(MIX_LABELS) as (keyof FundingMix)[])
    .map((key) => ({ key, label: MIX_LABELS[key], share: mixTotal > 0 ? p.mix[key] / mixTotal : 0 }))
    .filter((m) => m.share > 0)
    .sort((a, b) => b.share - a.share)
  const largestSource = mix.length ? { label: mix[0].label, share: mix[0].share } : null
  const concentration = mix.length ? sum(mix.map((m) => m.share * m.share)) : null

  const ttm = forecast.trailing12.revenue
  const retention = p.donorRetention !== undefined && mixTotal > 0 ? { rate: p.donorRetention, dollarsToReplace: ttm * (p.mix.individuals / mixTotal) * (1 - p.donorRetention) } : null

  const flags: Flag[] = []
  if (monthsOfCash < 1) flags.push({ level: 'risk', text: `Cash covers about ${monthsOfCash.toFixed(1)} months of spending. One late payment could cause a shortfall.` })
  else if (monthsOfCash < 3) flags.push({ level: 'watch', text: `Cash covers ${monthsOfCash.toFixed(1)} months of spending. Three to six months is the usual recommendation.` })
  else flags.push({ level: 'good', text: `Cash covers ${monthsOfCash.toFixed(1)} months of spending, inside or above the usual three to six month cushion.` })
  const shortPct = Math.round(proj.probShortfall * 100)
  if (proj.probShortfall >= 0.25) flags.push({ level: 'risk', text: `In ${shortPct}% of simulated years the account runs dry at some point. Look at timing of income and what can be deferred.` })
  else if (proj.probShortfall >= 0.05) flags.push({ level: 'watch', text: `In ${shortPct}% of simulated years the account runs dry at some point.` })
  if (largestSource && largestSource.share > 0.5) flags.push({ level: 'watch', text: `${Math.round(largestSource.share * 100)}% of income comes from ${largestSource.label.toLowerCase()}. Losing that source would be hard to absorb.` })
  if (retention && retention.dollarsToReplace > 0) flags.push({ level: retention.rate < 0.5 ? 'watch' : 'good', text: `Each year you must replace about $${Math.round(retention.dollarsToReplace).toLocaleString('en-US')} of individual giving from donors who do not return.` })
  if (net12.p50 < 0) flags.push({ level: 'watch', text: 'The typical forecast year ends in deficit. Reserves are being drawn down.' })

  return {
    avgMonthlyExpenses,
    monthsOfCash,
    reserveRatio,
    reserveTargetAmount,
    cash,
    cashSamples: proj.samples,
    runoutMonth: runIdx >= 0 ? addMonths(lastMonth, runIdx + 1) : null,
    probShortfall: proj.probShortfall,
    probBelowReserve: proj.probBelowReserve,
    startsBelowReserve: p.cashOnHand < reserveTargetAmount,
    reserveReachedMonth: (() => {
      const i = cash.p50.findIndex((v) => v >= reserveTargetAmount)
      return p.cashOnHand < reserveTargetAmount && i >= 0 ? addMonths(lastMonth, i + 1) : null
    })(),
    net12,
    probSurplus: proj.probSurplus,
    pipelineExpected: sum(p.pipeline.map((it) => it.amount * it.probability)),
    pipelineCount: p.pipeline.length,
    mix,
    largestSource,
    concentration,
    retention,
    flags,
  }
}
