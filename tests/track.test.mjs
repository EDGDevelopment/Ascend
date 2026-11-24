import test from 'node:test'
import assert from 'node:assert/strict'
import { addSnapshot, scoreTrackRecord, snapshotFrom, EXPECTED_IN_RANGE } from '../supabase/functions/_shared/valuation/track.ts'
import { addMonths } from '../supabase/functions/_shared/valuation/rand.ts'

const months = (start, n) => Array.from({ length: n }, (_, i) => addMonths(start, i))
const snap = (lastMonth, madeAt = '2026-01-01T00:00:00Z') => ({
  madeAt,
  lastMonth,
  months: months(addMonths(lastMonth, 1), 12),
  p10: Array(12).fill(80),
  p50: Array(12).fill(100),
  p90: Array(12).fill(120),
})

test('nothing is scored until real months arrive', () => {
  const t = scoreTrackRecord([snap('2025-12')], [{ month: '2025-12', revenue: 100 }])
  assert.equal(t.scored, 0)
  assert.equal(t.inRangeShare, null)
  assert.equal(t.typicalError, null)
})

test('scores months against the range and the middle forecast', () => {
  const actual = [
    { month: '2026-01', revenue: 110 }, // in range, +10%
    { month: '2026-02', revenue: 70 }, // below range, -30%
    { month: '2026-03', revenue: 100 }, // in range, 0%
  ]
  const t = scoreTrackRecord([snap('2025-12')], actual)
  assert.equal(t.scored, 3)
  assert.ok(Math.abs(t.inRangeShare - 2 / 3) < 1e-9)
  assert.ok(Math.abs(t.typicalError - (0.1 + 0.3 + 0) / 3) < 1e-9)
  assert.ok(Math.abs(t.bias - (0.1 - 0.3 + 0) / 3) < 1e-9)
  assert.equal(t.snapshots[0].months[1].inRange, false)
  assert.ok(EXPECTED_IN_RANGE > 0 && EXPECTED_IN_RANGE < 1)
})

test('months already known when the forecast was made are not scored', () => {
  const s = { ...snap('2025-12'), months: months('2025-11', 12) } // overlaps known months
  const t = scoreTrackRecord([s], [{ month: '2025-11', revenue: 100 }, { month: '2025-12', revenue: 100 }, { month: '2026-01', revenue: 100 }])
  assert.equal(t.scored, 1)
  assert.equal(t.snapshots[0].months[0].month, '2026-01')
})

test('re-running from the same last month replaces the older snapshot', () => {
  const a = snap('2025-12', '2026-01-01T00:00:00Z')
  const b = snap('2025-12', '2026-01-05T00:00:00Z')
  const c = snap('2026-01', '2026-02-01T00:00:00Z')
  const list = addSnapshot(addSnapshot(addSnapshot([], a), c), b)
  assert.equal(list.length, 2)
  assert.equal(list[0].madeAt, b.madeAt)
  assert.equal(list[1].lastMonth, '2026-01')
})

test('snapshotFrom keeps the revenue band and last month', () => {
  const out = {
    input: { monthly: [{ month: '2025-11', revenue: 1 }, { month: '2025-12', revenue: 2 }] },
    forecast: { futureMonths: ['2026-01', '2026-02'], revenue: { p10: [1, 1], p50: [2, 2], p90: [3, 3] } },
    computedAt: '2026-01-01T00:00:00Z',
  }
  const s = snapshotFrom(out)
  assert.equal(s.lastMonth, '2025-12')
  assert.deepEqual(s.p50, [2, 2])
  assert.equal(snapshotFrom({ ...out, input: { monthly: [] } }), null)
})
