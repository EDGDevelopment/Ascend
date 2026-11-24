import test from 'node:test'
import assert from 'node:assert/strict'
import { mergeMonths, findMatch } from '../supabase/functions/_shared/valuation/merge.ts'
import { addMonths } from '../supabase/functions/_shared/valuation/rand.ts'

const rows = (start, n, revenue = 100, expenses = 90) => Array.from({ length: n }, (_, i) => ({ month: addMonths(start, i), revenue, expenses }))

test('new months are added after the saved ones', () => {
  const r = mergeMonths(rows('2025-01', 12), rows('2025-10', 6))
  assert.equal(r.error, null)
  assert.equal(r.monthly.length, 15)
  assert.equal(r.added, 3)
  assert.equal(r.changed, 0)
  assert.equal(r.monthly.at(-1).month, '2026-03')
})

test('overlapping months take the figures from the file', () => {
  const r = mergeMonths(rows('2025-01', 12), rows('2025-11', 3, 150, 120))
  assert.equal(r.added, 1)
  assert.equal(r.changed, 2)
  assert.equal(r.monthly.find((m) => m.month === '2025-12').revenue, 150)
  assert.equal(r.monthly.find((m) => m.month === '2025-10').revenue, 100)
})

test('an identical file adds and changes nothing', () => {
  const r = mergeMonths(rows('2025-01', 12), rows('2025-01', 12))
  assert.equal(r.added, 0)
  assert.equal(r.changed, 0)
})

test('a gap between the saved months and the file is refused', () => {
  const r = mergeMonths(rows('2025-01', 12), rows('2026-03', 3))
  assert.match(r.error, /gap/)
  assert.equal(r.monthly.length, 12)
})

test('expenses are dropped for all months when only some have them', () => {
  const noExp = rows('2026-01', 2).map(({ month, revenue }) => ({ month, revenue }))
  const r = mergeMonths(rows('2025-01', 12), noExp)
  assert.equal(r.droppedExpenses, true)
  assert.ok(r.monthly.every((m) => m.expenses === undefined))
})

test('finding a saved business by name, ignoring case and spacing, within the same kind', () => {
  const saved = [
    { id: 1, name: 'Corner Cafe', input: { orgType: 'local', companyName: '' } },
    { id: 2, name: 'Helping Hands', input: { orgType: 'nonprofit', companyName: 'Helping  Hands' } },
  ]
  assert.equal(findMatch(saved, 'local', ['corner cafe  ', undefined])?.id, 1)
  assert.equal(findMatch(saved, 'nonprofit', ['helping hands'])?.id, 2)
  assert.equal(findMatch(saved, 'local', ['helping hands']), null)
  assert.equal(findMatch(saved, 'local', ['', undefined]), null)
})
