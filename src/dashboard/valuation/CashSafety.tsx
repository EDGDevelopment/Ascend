import { formatUsdCompact } from '@/lib/format'
import type { ModelOutput } from '@/valuation/engine'
import { Card } from '../components/Card'
import { ColoredStats } from './ColoredStats'
import { FanChart } from './FanChart'
import { OUTCOME } from './ramp'
import { Stage } from './Stage'
import { short } from './format'

export function CashSafety({ output }: { output: ModelOutput }) {
  const c = output.local?.cash
  if (!c) {
    return (
      <Card title="Cash safety">
        <p className="text-sm text-ink-muted">Add how much is in the bank today under "More detail" in step 2, and make sure your months include expenses. Then you will see how long your cash lasts and the chance of running short.</p>
      </Card>
    )
  }
  const months = Number.isFinite(c.monthsOfCash) ? c.monthsOfCash : 24
  const target = output.input.local.reserveTargetMonths ?? 3
  return (
    <Stage title="Will you have enough cash?" subtitle={`Each thin line is one way the next 12 months could go, starting from ${short(output.input.local.cashOnHand ?? 0)} in the bank.`}>
      <FanChart paths={c.samples} futureMonths={output.forecast.futureMonths} startValue={output.input.local.cashOnHand ?? 0} median={c.cash.p50} format={formatUsdCompact} ariaLabel={`Simulated bank balance for the next 12 months. Most likely ${short(c.cash.p50[11])} in a year, between ${short(c.cash.p10[11])} and ${short(c.cash.p90[11])}.`} />
      <ColoredStats
        stats={[
          { label: 'Cash covers', value: months >= 24 ? '24+ months' : `${months.toFixed(1)} months`, color: months < 1 ? OUTCOME.worst : months < target ? OUTCOME.caution : OUTCOME.good, note: `of spending. Target ${target}.` },
          { label: 'Chance of running short', value: `${Math.round(c.probShortfall * 100)}%`, color: c.probShortfall >= 0.25 ? OUTCOME.worst : c.probShortfall >= 0.05 ? OUTCOME.caution : OUTCOME.good, note: 'at any point this year' },
          { label: 'Balance in 12 months', value: short(c.cash.p50[11]), color: OUTCOME.best, note: `${short(c.cash.p10[11])} to ${short(c.cash.p90[11])} likely` },
        ]}
      />
    </Stage>
  )
}
