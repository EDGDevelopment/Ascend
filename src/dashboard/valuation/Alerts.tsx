import { AlertTriangle, CheckCircle2, TrendingDown, TrendingUp } from 'lucide-react'
import { monthLabel } from '@/data/useDashboardData'
import type { ModelOutput, SeriesSignals } from '@/valuation/engine'
import { Card } from '../components/Card'
import { OUTCOME } from './ramp'

function Block({ title, s, goodWhen }: { title: string; s: SeriesSignals; goodWhen: 'high' | 'low' }) {
  const items = [...s.signals].reverse()
  return (
    <Card title={title}>
      {s.shift && (
        <p className="mb-4 flex items-start gap-2 rounded-lg border border-line bg-warn-soft px-4 py-3 text-sm text-warn">
          {s.shift.direction === 'up' ? <TrendingUp size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> : <TrendingDown size={16} className="mt-0.5 shrink-0" aria-hidden="true" />}
          <span>The last 3 months have all run about {Math.abs(Math.round(s.shift.pctOff * 100))}% {s.shift.direction === 'up' ? 'above' : 'below'} what the pattern says they should. That looks like a change in level, not a one-off.</span>
        </p>
      )}
      {items.length === 0 ? (
        <p className="flex items-center gap-2 text-sm text-ink-muted"><CheckCircle2 size={16} style={{ color: OUTCOME.good }} aria-hidden="true" /> No unusual months in the last two years.</p>
      ) : (
        <ul className="space-y-3">
          {items.map((it) => {
            const good = it.kind === goodWhen
            return (
              <li key={it.month} className="flex items-start gap-3 text-sm">
                <span aria-hidden="true" className="mt-1.5 size-2.5 shrink-0 rounded-full" style={{ background: good ? OUTCOME.good : OUTCOME.worst }} />
                <span><span className="font-semibold">{monthLabel(it.month)}</span> was {Math.abs(Math.round(it.pctOff * 100))}% {it.kind === 'high' ? 'above' : 'below'} what we would expect <span className="text-ink-muted">({good ? 'good news' : 'worth a look'})</span>.</span>
              </li>
            )
          })}
        </ul>
      )}
    </Card>
  )
}

export function Alerts({ output }: { output: ModelOutput }) {
  const s = output.tools.signals
  if (s.note) return <Card title="Unusual months"><p className="flex items-start gap-2 text-sm text-ink-muted"><AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {s.note}</p></Card>
  return (
    <div className="space-y-6">
      <p className="text-sm text-ink-muted">Each month is compared with the same month a year earlier, adjusted for how the last six months have been running. Only clear outliers are listed, so a quiet list is a good sign.</p>
      <Block title="Revenue" s={s.revenue} goodWhen="high" />
      {s.expenses && <Block title="Spending" s={s.expenses} goodWhen="low" />}
    </div>
  )
}
