import test from 'node:test'
import assert from 'node:assert/strict'
import { runModel, validateModel, LIMITS } from '../supabase/functions/_shared/valuation/model.ts'
import { addMonths } from '../supabase/functions/_shared/valuation/rand.ts'

// 36 months of seasonal revenue with 1%/month growth and a fixed cost base.
const monthly = Array.from({ length: 36 }, (_, i) => {
  const revenue = Math.round(10000 * 1.01 ** i * (1 + 0.2 * Math.sin((2 * Math.PI * i) / 12)))
  return { month: addMonths('2023-01', i), revenue, expenses: Math.round(revenue * 0.7 + 1500) }
})
const local = {
  ownerPay: 42000, depreciation: 0, interest: 0, otherAddBacks: 0, netDebt: 20000, preset: 'shop',
  multipleLow: 2, multipleMid: 3, multipleHigh: 4, taxRate: 0.25, nwcPct: 0.05, riskFreeRate: 0.04,
  equityRiskPremium: 0.055, sizePremium: 0.05, specificRisk: 0.04, terminalGrowth: 0.025, forecastYears: 5,
  marginSd: 0.02, rateSd: 0.02, terminalSd: 0.005,
}
const base = { orgType: 'local', companyName: 'Test Cafe', monthly, local, nonprofit: {}, simulations: 500, seed: 7 }

test('rejects unknown organisation type', () => {
  assert.equal(validateModel({ ...base, orgType: 'x' }).length, 1)
})

test('rejects too few months', () => {
  assert.ok(validateModel({ ...base, monthly: monthly.slice(0, 3) }).length > 0)
})

test('rejects gaps in months', () => {
  const gap = monthly.filter((_, i) => i !== 10)
  assert.match(validateModel({ ...base, monthly: gap }).join(' '), /consecutive/)
})

test('rejects negative revenue', () => {
  const bad = monthly.map((r, i) => (i === 5 ? { ...r, revenue: -1 } : r))
  assert.match(validateModel({ ...base, monthly: bad }).join(' '), /revenue/)
})

test('rejects partial expenses', () => {
  const bad = monthly.map((r, i) => (i === 0 ? { month: r.month, revenue: r.revenue } : r))
  assert.match(validateModel({ ...base, monthly: bad }).join(' '), /expenses/)
})

test('rejects out-of-range simulations', () => {
  assert.match(validateModel({ ...base, simulations: LIMITS.maxSims + 1 }).join(' '), /Simulations/)
})

test('runModel is deterministic for a seed and bands are ordered', () => {
  const a = runModel(base)
  const b = runModel(base)
  assert.deepEqual(a.forecast.revenue, b.forecast.revenue)
  const { p10, p50, p90 } = a.forecast.revenue
  assert.ok(p50.length > 0)
  p50.forEach((v, k) => {
    assert.ok(p10[k] <= v + 1e-9 && v <= p90[k] + 1e-9, `band order at ${k}`)
    assert.ok(Number.isFinite(v))
  })
})

test('runModel throws readable validation errors', () => {
  assert.throws(() => runModel({ ...base, monthly: [] }), /at least/)
})
