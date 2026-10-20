import { rankLevers, type LocalResult, type ModelOutput, type NonprofitResult } from '@/valuation/engine'
import { MONTHS, short } from './format'

export interface Insight {
  tone: 'good' | 'watch' | 'info'
  text: string
}

/** Calendar month names ordered busiest to quietest, from the seasonal shape (index 0 = January). */
function extremes(shape: number[] | null) {
  if (!shape) return null
  const idx = shape.map((v, i) => ({ v, i })).sort((a, b) => b.v - a.v)
  return { busy: idx[0], quiet: idx[idx.length - 1] }
}

/** A few plain-language takeaways from the numbers. At most four, most important first. */
export function insightsFor(output: ModelOutput): Insight[] {
  const f = output.forecast
  const out: Insight[] = []
  const growth = f.growth.p50
  out.push({
    tone: growth >= 0 ? 'good' : 'watch',
    text: `Your revenue is expected to ${growth >= 0 ? 'grow' : 'dip'} about ${Math.abs(growth * 100).toFixed(0)}% over the next 12 months, to around ${short(f.next12.revenue.p50)}.`,
  })

  if (output.local) {
    const L = output.local as LocalResult
    const ex = extremes(f.seasonalShape)
    if (ex && ex.busy.v - ex.quiet.v > 0.08) {
      out.push({ tone: 'info', text: `${MONTHS[ex.busy.i]} is usually your busiest month (${Math.round((ex.busy.v - 1) * 100)}% above average) and ${MONTHS[ex.quiet.i]} your quietest (${Math.round((1 - ex.quiet.v) * 100)}% below). Plan stock and staff around that.` })
    }
    const top = rankLevers(output, output.tools.costs)[0]
    if (top && top.deltaValue !== null) out.push({ tone: 'good', text: `Your biggest lever is to ${top.label.charAt(0).toLowerCase()}${top.label.slice(1)}: about ${short(top.deltaProfit)} more profit a year and ${short(top.deltaValue)} more value. See "What if" to try it.` })
    const sig = output.tools.signals.revenue
    if (sig.shift) out.push({ tone: 'watch', text: `Revenue has run ${Math.abs(Math.round(sig.shift.pctOff * 100))}% ${sig.shift.direction === 'up' ? 'above' : 'below'} its usual pattern for three months in a row. See "Alerts".` })
    for (const w of L.warnings.slice(0, 2)) out.push({ tone: 'watch', text: w })
  } else if (output.nonprofit) {
    const N = output.nonprofit as NonprofitResult
    out.unshift({
      tone: N.monthsOfCash < 3 ? 'watch' : 'good',
      text: N.monthsOfCash >= 24 ? 'You hold more than two years of spending in cash.' : `You hold ${N.monthsOfCash.toFixed(1)} months of spending in cash. Three to six months is the usual advice.`,
    })
    if (N.largestSource && N.largestSource.share > 0.5) out.push({ tone: 'watch', text: `${Math.round(N.largestSource.share * 100)}% of your income comes from ${N.largestSource.label.toLowerCase()}. Losing it would be hard to absorb.` })
    if (N.retention && N.retention.dollarsToReplace > 0) out.push({ tone: 'info', text: `You need to win back about ${short(N.retention.dollarsToReplace)} of individual giving each year from donors who do not return.` })
    if (N.pipelineCount > 0) out.push({ tone: 'info', text: `Your ${N.pipelineCount} pending grant${N.pipelineCount > 1 ? 's' : ''} or campaign${N.pipelineCount > 1 ? 's are' : ' is'} worth about ${short(N.pipelineExpected)} once you weigh each by its chance.` })
    if (N.net12.p50 < 0) out.push({ tone: 'watch', text: 'The typical year ends in deficit, so reserves are being drawn down.' })
  }
  return out.slice(0, 4)
}
