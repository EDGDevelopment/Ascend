import { monthLabel } from '@/data/useDashboardData'
import type { ModelOutput } from '@/valuation/engine'
import { Card } from '../components/Card'
import { ColoredStats } from './ColoredStats'
import { OUTCOME } from './ramp'
import { Stage } from './Stage'
import { short } from './format'

/** Months of revenue as bars against the break-even line: teal when the month covered its costs, coral when it did not. */
function Bars({ months, values, line }: { months: string[]; values: number[]; line: number }) {
  const W = 700, H = 220, m = { l: 8, r: 8, t: 14, b: 26 }
  const max = Math.max(...values, line) * 1.1
  const bw = (W - m.l - m.r) / values.length
  const y = (v: number) => H - m.b - (v / max) * (H - m.t - m.b)
  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full" role="img" aria-label={`Monthly revenue for the last ${values.length} months against a break-even line at ${short(line)} a month. ${values.filter((v) => v < line).length} months fell below it.`}>
      {values.map((v, i) => (
        <rect key={i} x={m.l + i * bw + 2} y={y(v)} width={bw - 4} height={H - m.b - y(v)} rx="3" style={{ fill: v >= line ? OUTCOME.good : OUTCOME.worst }} opacity="0.9" />
      ))}
      <line x1={m.l} x2={W - m.r} y1={y(line)} y2={y(line)} strokeDasharray="5 4" strokeWidth="2" style={{ stroke: 'var(--color-ink)' }} />
      <text x={W - m.r} y={y(line) - 6} textAnchor="end" fontSize="12" fontWeight="600" style={{ fill: 'var(--color-ink)' }}>Break-even {short(line)}</text>
      {values.map((_, i) => (i % 3 === 0 ? <text key={i} x={m.l + i * bw + bw / 2} y={H - 8} textAnchor="middle" fontSize="11" style={{ fill: 'var(--color-ink-faint)' }}>{monthLabel(months[i])}</text> : null))}
    </svg>
  )
}

export function BreakEven({ output }: { output: ModelOutput }) {
  const c = output.tools.costs
  if (!c) {
    return <Card title="Break-even"><p className="text-sm text-ink-muted">Break-even needs your monthly expenses. Add an expenses figure for each month, then run the forecast again.</p></Card>
  }
  const rows = output.input.monthly.slice(-24)
  const be = c.breakEvenMonthly
  const mos = c.marginOfSafety
  return (
    <div className="space-y-6">
      <Stage title="How much do you need to sell each month?" subtitle="Some costs are paid whatever you sell. The rest rise and fall with sales. Break-even is where sales cover both.">
        {be !== null ? (
          <>
            <p className="ramp-text tabular text-5xl font-semibold tracking-tight sm:text-6xl">{short(be)}</p>
            <p className="mt-1 text-sm text-ink-muted">a month to break even. Your average month is {short(c.avgRevenue)}.</p>
            <div className="mt-6"><Bars months={rows.map((r) => r.month)} values={rows.map((r) => r.revenue)} line={be} /></div>
          </>
        ) : (
          <p className="text-base">In your months, every extra dollar of sales cost about a dollar to deliver, so selling more would not cover your fixed costs. Look at the cost of each sale first.</p>
        )}
        <ColoredStats
          stats={[
            { label: 'Fixed costs a month', value: short(c.fixedMonthly), color: OUTCOME.caution, note: 'paid whatever you sell' },
            { label: 'Cost of each $1 sold', value: `${Math.round(c.variableRatio * 100)}¢`, color: OUTCOME.worst, note: 'stock, fees, hourly staff' },
            { label: 'Cushion above break-even', value: mos !== null ? `${Math.round(mos * 100)}%` : 'n/a', color: mos !== null && mos < 0 ? OUTCOME.worst : OUTCOME.good, note: mos !== null ? 'sales could fall this far' : undefined },
          ]}
        />
        {c.monthsBelow !== null && <p className="mt-4 text-sm text-ink-muted">{c.monthsBelow === 0 ? 'Every one of the last 12 months covered its costs.' : `${c.monthsBelow} of the last 12 months fell below break-even.`}</p>}
      </Stage>
      <p className={`text-sm ${c.reliable ? 'text-ink-muted' : 'text-warn'}`}>
        Worked out from {c.months} months of your own figures (fit quality {Math.round(c.r2 * 100)}%).{c.note ? ` ${c.note}` : ''}
      </p>
    </div>
  )
}
