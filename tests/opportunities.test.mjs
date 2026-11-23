import test from 'node:test'
import assert from 'node:assert/strict'
import { MAX_OPPORTUNITIES, parseOpportunities } from '../supabase/functions/_shared/chat/opportunities.ts'

const good = { title: 'Raise prices 5%', category: 'Pricing', why: 'Your margin is thin.', evidence: 'Margin 12.2% in 2025.', impact: 'About +$9,000 profit a year.', effort: 'low', firstStep: 'Pick three items to reprice.' }

test('accepts a well-formed reply', () => {
  const out = parseOpportunities(JSON.stringify({ opportunities: [good] }))
  assert.equal(out.length, 1)
  assert.equal(out[0].effort, 'low')
})

test('accepts a reply wrapped in a code fence', () => {
  const out = parseOpportunities('```json\n' + JSON.stringify({ opportunities: [good] }) + '\n```')
  assert.equal(out.length, 1)
})

test('rejects text that is not JSON, or has no usable items', () => {
  assert.equal(parseOpportunities('Sure! Here are some ideas'), null)
  assert.equal(parseOpportunities('{"opportunities":[]}'), null)
  assert.equal(parseOpportunities('{"opportunities":[{"title":"","why":""}]}'), null)
  assert.equal(parseOpportunities('{"something":"else"}'), null)
})

test('fills in safe defaults and caps lengths and count', () => {
  const many = Array.from({ length: 12 }, (_, i) => ({ ...good, title: `Idea ${i}`, effort: 'enormous', why: 'x'.repeat(5000) }))
  const out = parseOpportunities(JSON.stringify({ opportunities: many }))
  assert.equal(out.length, MAX_OPPORTUNITIES)
  assert.equal(out[0].effort, 'medium')
  assert.ok(out[0].why.length <= 500)
})

test('ignores extra fields, so nothing unexpected reaches the page', () => {
  const out = parseOpportunities(JSON.stringify({ opportunities: [{ ...good, html: '<script>alert(1)</script>' }] }))
  assert.equal('html' in out[0], false)
})
