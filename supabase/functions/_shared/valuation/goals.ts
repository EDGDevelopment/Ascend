// Goals: a change the owner decides to make, checked later against the forecast made before it started.
// Plain TypeScript with no browser or Deno APIs, like the rest of the engine.

import type { ModelOutput } from './model.ts'
import { addMonths } from './rand.ts'
import { snapshotFrom } from './track.ts'

export type GoalStatus = 'active' | 'done' | 'dropped'

export interface Goal {
  id: string
  title: string
  /** Free text: the first step, or why. */
  note: string
  source: 'plan' | 'custom'
  /** The lift in monthly revenue the owner is aiming for, as a percent (5 means +5%), or null. */
  targetPct: number | null
  createdAt: string
  /** First month the change is expected to show, "YYYY-MM". Months before it are not counted. */
  startMonth: string
  status: GoalStatus
  /** What the forecast said at the time, if nothing changed. Frozen, so later re-runs do not move the goalposts. */
  baseline: { months: string[]; p10: number[]; p50: number[]; p90: number[] }
}

export type Verdict = 'too-early' | 'above' | 'in-line' | 'below'

export interface GoalResult {
  /** Months since the start with real results. */
  months: number
  actual: number
  expected: number
  /** (actual - expected) / expected, as a decimal, or null with no months yet. */
  lift: number | null
  /** Whether the target was met, or null when there is no target or no months yet. */
  targetMet: boolean | null
  verdict: Verdict
}

/** Months needed before a verdict means anything. */
export const MIN_MONTHS = 3

export function newGoal(
  output: ModelOutput,
  fields: { id: string; title: string; note?: string; source: 'plan' | 'custom'; targetPct?: number | null; now: string },
): Goal | null {
  const snap = snapshotFrom(output)
  if (!snap || !fields.title.trim()) return null
  return {
    id: fields.id,
    title: fields.title.trim(),
    note: (fields.note ?? '').trim(),
    source: fields.source,
    targetPct: fields.targetPct !== null && fields.targetPct !== undefined && Number.isFinite(fields.targetPct) ? fields.targetPct : null,
    createdAt: fields.now,
    startMonth: addMonths(snap.lastMonth, 1),
    status: 'active',
    baseline: { months: snap.months, p10: snap.p10, p50: snap.p50, p90: snap.p90 },
  }
}

/**
 * Compares real revenue since the start with what the frozen forecast expected. The verdict uses the sum of the
 * monthly ranges, which is wider than a true range for the total, so "above" and "below" are not called lightly.
 */
export function scoreGoal(goal: Goal, monthly: { month: string; revenue: number }[]): GoalResult {
  const actualByMonth = new Map(monthly.map((r) => [r.month, r.revenue]))
  let months = 0
  let actual = 0
  let expected = 0
  let low = 0
  let high = 0
  goal.baseline.months.forEach((m, i) => {
    const a = actualByMonth.get(m)
    if (a === undefined || m < goal.startMonth) return
    months++
    actual += a
    expected += goal.baseline.p50[i]
    low += goal.baseline.p10[i]
    high += goal.baseline.p90[i]
  })
  const lift = months > 0 && expected > 0 ? (actual - expected) / expected : null
  const targetMet = lift === null || goal.targetPct === null ? null : lift * 100 >= goal.targetPct
  const verdict: Verdict = months < MIN_MONTHS ? 'too-early' : actual > high ? 'above' : actual < low ? 'below' : 'in-line'
  return { months, actual, expected, lift, targetMet, verdict }
}
