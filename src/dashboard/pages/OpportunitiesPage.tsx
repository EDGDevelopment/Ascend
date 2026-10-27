import { rankLevers } from '@/valuation/engine'
import { useValuation } from '@/valuation/useValuation'
import { Card } from '../components/Card'
import { NeedsData } from '../components/NeedsData'
import { Insights } from '../valuation/Insights'
import { short } from '../valuation/format'

export default function OpportunitiesPage() {
  const { output } = useValuation()
  if (!output) return <NeedsData />

  const levers = output.local ? rankLevers(output, output.tools.costs) : []

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      {output.local && (
        <Card title="Where a change would help most" subtitle="Each row tries a 10% change to one thing and shows what it would do, using your own figures.">
          <ol className="divide-y divide-line-soft">
            {levers.map((l, i) => (
              <li key={l.id} className="flex flex-wrap items-center justify-between gap-3 py-3.5">
                <div className="flex items-center gap-3">
                  <span aria-hidden="true" className="grid size-7 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-ink">{i + 1}</span>
                  <span className="text-[15px] font-medium">{l.label}</span>
                </div>
                <div className="tabular text-right text-sm">
                  <span className="font-semibold">{l.deltaProfit >= 0 ? '+' : ''}{short(l.deltaProfit)}</span>
                  <span className="text-ink-muted"> profit a year</span>
                  {l.deltaValue !== null && (
                    <>
                      <span className="text-ink-faint"> · </span>
                      <span className="font-semibold">{l.deltaValue >= 0 ? '+' : ''}{short(l.deltaValue)}</span>
                      <span className="text-ink-muted"> value</span>
                    </>
                  )}
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-3 text-xs text-ink-faint">Try your own numbers under What if on the Financial model page.</p>
        </Card>
      )}
      <Insights output={output} />
    </div>
  )
}
