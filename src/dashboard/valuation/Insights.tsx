import { Card } from '../components/Card'
import { OUTCOME } from './ramp'
import { insightsFor } from './takeaways'
import type { ModelOutput } from '@/valuation/engine'

const COLOR = { good: OUTCOME.good, watch: OUTCOME.caution, info: OUTCOME.best }
const WORD = { good: 'Good news', watch: 'Worth a look', info: 'Good to know' }

export function Insights({ output }: { output: ModelOutput }) {
  const items = insightsFor(output)
  return (
    <Card title="What this means">
      <ul className="space-y-3">
        {items.map((it) => (
          <li key={it.text} className="flex items-start gap-3 text-[15px] leading-relaxed">
            <span aria-hidden="true" className="mt-2 size-2.5 shrink-0 rounded-full" style={{ background: COLOR[it.tone] }} />
            <span><span className="sr-only">{WORD[it.tone]}: </span>{it.text}</span>
          </li>
        ))}
      </ul>
    </Card>
  )
}
