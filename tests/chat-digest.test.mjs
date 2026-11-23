import test from 'node:test'
import assert from 'node:assert/strict'
import { runModel } from '../supabase/functions/_shared/valuation/model.ts'
import { addMonths } from '../supabase/functions/_shared/valuation/rand.ts'
import { buildDigest, describeDataset, MAX_DIGEST_CHARS } from '../supabase/functions/_shared/chat/digest.ts'

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
const input = { orgType: 'local', companyName: 'Test Cafe', monthly, local, nonprofit: {}, simulations: 500, seed: 7 }
const output = runModel(input)
const ds = (id, name, withOutput = true) => ({ id, name, fileName: `${name}.csv`, input, output: withOutput ? output : null })

test('digest carries every month and exact yearly totals', () => {
  const text = describeDataset(ds('a', 'Cafe'), true)
  assert.match(text, /2023-01, /)
  assert.match(text, /2025-12, /)
  const rev2024 = monthly.filter((r) => r.month.startsWith('2024')).reduce((s, r) => s + r.revenue, 0)
  assert.ok(text.includes(`$${rev2024.toLocaleString('en-US')}`), 'yearly revenue total is spelled out exactly')
  assert.match(text, /currently open/)
})

test('digest includes the forecast, value range and break-even', () => {
  const text = describeDataset(ds('a', 'Cafe'), true)
  assert.match(text, /Forecast for the next 12 months/)
  assert.match(text, /Combined business value/)
  assert.match(text, /Break-even revenue/)
})

test('digest lists the biggest levers so the plan and chat can quote them', () => {
  const text = describeDataset(ds('a', 'Cafe'), true)
  assert.match(text, /Biggest levers/)
  assert.match(text, /profit a year/)
})

test('a spreadsheet with no results yet is still described', () => {
  assert.match(describeDataset(ds('a', 'Cafe', false), true), /has not been worked out/)
})

test('no datasets gives a clear message', () => {
  assert.match(buildDigest([], null), /not uploaded/)
})

test('the open spreadsheet is listed first and the digest stays bounded', () => {
  const many = Array.from({ length: 40 }, (_, i) => ds(String(i), `Sheet ${i}`))
  const text = buildDigest(many, '39')
  assert.ok(text.indexOf('"Sheet 39"') >= 0 && text.indexOf('"Sheet 39"') < text.indexOf('Spreadsheet: "Sheet 0"') || !text.includes('Spreadsheet: "Sheet 0"'))
  assert.ok(text.length < MAX_DIGEST_CHARS + 30_000)
  assert.match(text, /not shown/)
})
