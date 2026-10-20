import { useState } from 'react'
import { formatPercent, formatUsdCompact } from '@/lib/format'
import type { MetricKey } from '@/data/types'
import type { Band, ModelOutput } from '@/valuation/engine'
import { MetricTabs } from '../components/MetricTabs'
import { ColoredStats } from './ColoredStats'
import { FanChart } from './FanChart'
import { OUTCOME } from './ramp'
import { Stage } from './Stage'
import { short, MONTHS } from './format'

const SHOWN_HISTORY = 24
const MONTH_INITIALS = ['J', 'F', 'M', 'A', 'M', 'J', 'J', 'A', 'S', 'O', 'N', 'D']

const METHOD_TEXT: Record<string, string> = {
  'seasonal-multiplicative': 'Learned your trend and seasonal pattern, then averaged that with last year scaled by recent growth.',
  'seasonal-additive': 'Learned your trend and seasonal pattern, then averaged that with last year scaled by recent growth.',
  'trend-only': 'Followed your recent trend, averaged with last year scaled by recent growth. Seasonal swings were not strong enough to rely on.',
  'last-year-growth': 'Repeated each month of last year, scaled by how much you have grown since. With 24 months or more it learns your seasons properly.',
}

/** The main picture: simulated years fanned out from today, with three colored headline numbers. */
export function ForecastStage({ output }: { output: ModelOutput }) {
  const [metric, setMetric] = useState<MetricKey>('revenue')
  const f = output.forecast
  const rows = output.input.monthly
  const hasNet = f.expenses !== null && f.net !== null
  const active: MetricKey = hasNet ? metric : 'revenue'
  const hist = rows.slice(-SHOWN_HISTORY)
  const values = (pick: (r: (typeof rows)[number]) => number) => ({ months: hist.map((r) => r.month), values: hist.map(pick) })

  const chart =
    active === 'revenue'
      ? { history: values((r) => r.revenue), paths: f.samples.revenue, median: f.revenue.p50 }
      : active === 'expenses'
        ? { history: values((r) => r.expenses as number), paths: f.samples.expenses as number[][], median: (f.expenses as Band).p50 }
        : { history: values((r) => r.revenue - (r.expenses as number)), paths: f.samples.net as number[][], median: (f.net as Band).p50 }
  const n12 = active === 'revenue' ? f.next12.revenue : active === 'expenses' ? (f.next12.expenses as NonNullable<typeof f.next12.expenses>) : (f.next12.net as NonNullable<typeof f.next12.net>)
  const t12 = active === 'revenue' ? f.trailing12.revenue : active === 'expenses' ? (f.trailing12.expenses as number) : f.trailing12.revenue - (f.trailing12.expenses as number)
  const change = t12 > 0 ? n12.p50 / t12 - 1 : null
  const label = active === 'revenue' ? 'revenue' : active === 'expenses' ? 'spending' : 'profit'

  return (
    <Stage
      title="Your next 12 months"
      subtitle={`Each thin line is one way the year could go. The bold line is the most likely.${change !== null ? ` Expected ${label}: ${short(n12.p50)}, ${formatPercent(change * 100, 0)} on the last 12 months.` : ''}`}
      action={hasNet ? <MetricTabs value={active} onChange={setMetric} /> : undefined}
    >
      <FanChart
        paths={chart.paths}
        futureMonths={f.futureMonths}
        history={chart.history}
        median={chart.median}
        format={formatUsdCompact}
        ariaLabel={`Simulated ${label} for the next 12 months: ${chart.paths.length} possible futures from today, with the middle outcome in bold. Expected total ${short(n12.p50)}, between ${short(n12.p10)} and ${short(n12.p90)}.`}
      />
      <ColoredStats
        stats={[
          { label: 'Best case', value: short(n12.p90), color: OUTCOME.best, note: `${label}, next 12 months` },
          { label: 'Most likely', value: short(n12.p50), color: 'var(--color-ink)', note: `${label}, next 12 months` },
          { label: 'Cautious case', value: short(n12.p10), color: OUTCOME.worst, note: `${label}, next 12 months` },
        ]}
      />
    </Stage>
  )
}

/** The method, the self-test and the seasonal pattern: for people who want to know how it was worked out. */
export function ForecastNotes({ output }: { output: ModelOutput }) {
  const f = output.forecast
  const bt = f.backtest
  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <div>
        <h3 className="text-sm font-semibold">How the forecast was made</h3>
        <p className="mt-1.5 text-sm text-ink-muted">{METHOD_TEXT[f.method]}{f.usedPatch ? ' It also draws on the Ascend Patch Forecaster, a small neural network trained on tens of thousands of real monthly business series.' : ''}</p>
        {bt ? (
          <p className="mt-2 text-sm text-ink-muted">
            <span className="font-medium text-ink">Self-test:</span> with your last {bt.months} months hidden, it missed by about {(bt.mape * 100).toFixed(1)}% a month. Guessing "same as last year" would have missed by {(bt.naiveMape * 100).toFixed(1)}%.
          </p>
        ) : (
          <p className="mt-2 text-sm text-ink-muted">There is too little history for a self-test yet. Add more months.</p>
        )}
        <p className="mt-2 text-sm text-ink-muted">Roughly 8 in 10 years should land between the cautious and best cases. The range widens the further ahead it looks.</p>
        {f.notes.map((n) => (
          <p key={n} className="mt-2 text-sm text-warn">{n}</p>
        ))}
      </div>
      {f.seasonalShape && (
        <div>
          <h3 className="text-sm font-semibold">Your busy and quiet months</h3>
          <div className="mt-3 flex items-end gap-1.5" role="img" aria-label={`Typical level of each month against your average. Busiest ${MONTHS[f.seasonalShape.indexOf(Math.max(...f.seasonalShape))]}, quietest ${MONTHS[f.seasonalShape.indexOf(Math.min(...f.seasonalShape))]}.`}>
            {f.seasonalShape.map((v, c) => (
              <div key={c} className="flex flex-1 flex-col items-center justify-end gap-1">
                <div className="w-full rounded-t" style={{ height: `${Math.round(Math.max(0.15, Math.min(1.6, v)) * 56)}px`, background: v >= 1 ? 'var(--color-out-2)' : 'var(--color-out-3)' }} title={`${MONTHS[c]}: ${(v * 100).toFixed(0)}% of an average month`} />
                <span className="text-[11px] text-ink-muted">{MONTH_INITIALS[c]}</span>
              </div>
            ))}
          </div>
          <p className="mt-2 text-xs text-ink-muted">Green months are above your average, amber below.</p>
        </div>
      )}
    </div>
  )
}
