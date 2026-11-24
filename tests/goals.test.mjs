import test from 'node:test'
import assert from 'node:assert/strict'
import { newGoal, scoreGoal, MIN_MONTHS } from '../supabase/functions/_shared/valuation/goals.ts'
import { addMonths } from '../supabase/functions/_shared/valuation/rand.ts'

const future = Array.from({ length: 12 }, (_, i) => addMonths('2026-01', i))
const output = {
  input: { monthly: [{ month: '2025-12', revenue: 100 }] },
  forecast: { futureMonths: future, revenue: { p10: Array(12).fill(90), p50: Array(12).fill(100), p90: Array(12).fill(110) } },
  computedAt: '2026-01-01T00:00:00Z',
}
const make = (extra = {}) => newGoal(output, { id: 'g1', title: 'Raise prices 5%', source: 'custom', now: '2026-01-02T00:00:00Z', ...extra })
const actuals = (vals) => vals.map((revenue, i) => ({ month: addMonths('2026-01', i), revenue }))

test('a goal starts the month after the last real month and freezes the forecast', () => {
  const g = make({ targetPct: 5 })
  assert.equal(g.startMonth, '2026-01')
  assert.equal(g.targetPct, 5)
  assert.deepEqual(g.baseline.p50, Array(12).fill(100))
})

test('blank titles and missing forecasts give no goal', () => {
  assert.equal(make({ title: '  ' }), null)
  assert.equal(newGoal({ ...output, input: { monthly: [] } }, { id: 'x', title: 'a', source: 'custom', now: 'n' }), null)
})

test('too early to call before the minimum number of months', () => {
  const r = scoreGoal(make(), actuals([120, 120]))
  assert.equal(r.months, 2)
  assert.ok(2 < MIN_MONTHS)
  assert.equal(r.verdict, 'too-early')
  assert.ok(Math.abs(r.lift - 0.2) < 1e-9)
})

test('clearly above, in line, and clearly below the forecast', () => {
  assert.equal(scoreGoal(make(), actuals([120, 120, 120])).verdict, 'above')
  assert.equal(scoreGoal(make(), actuals([100, 104, 98])).verdict, 'in-line')
  assert.equal(scoreGoal(make(), actuals([80, 85, 82])).verdict, 'below')
})

test('the target is met when the lift reaches it', () => {
  const g = make({ targetPct: 5 })
  assert.equal(scoreGoal(g, actuals([106, 106, 106])).targetMet, true)
  assert.equal(scoreGoal(g, actuals([102, 102, 102])).targetMet, false)
  assert.equal(scoreGoal(make(), actuals([106, 106, 106])).targetMet, null)
})

test('months before the start are not counted', () => {
  const g = { ...make(), startMonth: '2026-03' }
  const r = scoreGoal(g, actuals([500, 500, 100, 100, 100]))
  assert.equal(r.months, 3)
  assert.equal(r.actual, 300)
})
