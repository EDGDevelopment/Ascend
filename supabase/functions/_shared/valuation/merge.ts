// Updating a business with a newer spreadsheet: find which saved business a file belongs to, and merge its months in.
// Plain TypeScript with no browser or Deno APIs, like the rest of the engine.

import { LIMITS, type MonthlyRow } from './model.ts'
import { monthDiff } from './rand.ts'

export interface MergeResult {
  monthly: MonthlyRow[]
  /** Months in the file that the saved business did not have. */
  added: number
  /** Months in both, where the file's figures differ from the saved ones. The file wins. */
  changed: number
  /** True when expenses were removed because some months had none. The forecast needs all or nothing. */
  droppedExpenses: boolean
  /** Set when the months cannot be joined, for example a gap between them. */
  error: string | null
}

export function mergeMonths(existing: MonthlyRow[], incoming: MonthlyRow[]): MergeResult {
  const byMonth = new Map(existing.map((r) => [r.month, r]))
  let added = 0
  let changed = 0
  for (const r of incoming) {
    const old = byMonth.get(r.month)
    if (!old) added++
    else if (old.revenue !== r.revenue || old.expenses !== r.expenses) changed++
    byMonth.set(r.month, r)
  }
  let monthly = [...byMonth.values()].sort((a, b) => (a.month < b.month ? -1 : 1))

  for (let i = 1; i < monthly.length; i++) {
    if (monthDiff(monthly[i - 1].month, monthly[i].month) !== 1) {
      return { monthly: existing, added, changed, droppedExpenses: false, error: `There is a gap between ${monthly[i - 1].month} and ${monthly[i].month}. Months must run one after another.` }
    }
  }

  const droppedExpenses = monthly.some((r) => r.expenses === undefined) && monthly.some((r) => r.expenses !== undefined)
  if (droppedExpenses) monthly = monthly.map((r) => ({ month: r.month, revenue: r.revenue }))
  if (monthly.length > LIMITS.maxMonths) monthly = monthly.slice(-LIMITS.maxMonths)
  return { monthly, added, changed, droppedExpenses, error: null }
}

const norm = (s: string | undefined) => (s ?? '').trim().toLowerCase().replace(/\s+/g, ' ')

/** The saved business a file most likely updates: same kind of organisation and the same name. */
export function findMatch<T extends { name: string; input: { orgType: string; companyName: string } }>(
  saved: T[],
  orgType: string,
  names: (string | undefined)[],
): T | null {
  const wanted = names.map(norm).filter(Boolean)
  if (wanted.length === 0) return null
  return saved.find((d) => d.input.orgType === orgType && [norm(d.name), norm(d.input.companyName)].some((n) => n && wanted.includes(n))) ?? null
}
