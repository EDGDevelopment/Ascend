import { AlertTriangle, CheckCircle2, Info } from 'lucide-react'
import { formatUsd, formatUsdCompact } from '@/lib/format'
import { monthLabel } from '@/data/useDashboardData'
import type { Level, ModelOutput, NonprofitResult } from '@/valuation/engine'
import { ColoredStats } from './ColoredStats'
import { FanChart } from './FanChart'
import { OUTCOME } from './ramp'
import { Stage } from './Stage'
import { short } from './format'

const usd = (n: number) => formatUsd(Math.round(n))
const tone: Record<Level, { box: string; Icon: typeof Info; word: string }> = {
  good: { box: 'bg-accent-soft text-accent-ink', Icon: CheckCircle2, word: 'Good' },
  watch: { box: 'bg-warn-soft text-warn', Icon: Info, word: 'Watch' },
  risk: { box: 'bg-down-soft text-down', Icon: AlertTriangle, word: 'Risk' },
}

/** The bank balance over the next 12 months, as a fan of simulated futures. */
export function NonprofitCashStage({ output }: { output: ModelOutput }) {
  const N = output.nonprofit as NonprofitResult
  const p = output.input.nonprofit
  const f = output.forecast
  return (
    <Stage
      title="Your bank balance, next 12 months"
      subtitle={`Each thin line is one way the year could go, starting from ${short(p.cashOnHand)} today. The bold line is the most likely.`}
    >
      <FanChart
        paths={N.cashSamples}
        futureMonths={f.futureMonths}
        startValue={p.cashOnHand}
        median={N.cash.p50}
        format={formatUsdCompact}
        ariaLabel={`Simulated bank balance for the next 12 months: ${N.cashSamples.length} possible futures from today's ${usd(p.cashOnHand)}, with the middle outcome in bold. In 12 months most likely ${short(N.cash.p50[11])}, between ${short(N.cash.p10[11])} and ${short(N.cash.p90[11])}.`}
      />
      <ColoredStats
        stats={[
          { label: 'Best case', value: short(N.cash.p90[11]), color: OUTCOME.best, note: 'balance in 12 months' },
          { label: 'Most likely', value: short(N.cash.p50[11]), color: 'var(--color-ink)', note: 'balance in 12 months' },
          { label: 'Cautious case', value: short(N.cash.p10[11]), color: OUTCOME.worst, note: 'balance in 12 months' },
        ]}
      />
      {N.pipelineCount > 0 && <p className="mt-4 text-[13px] text-ink-muted">Includes {N.pipelineCount} grant{N.pipelineCount > 1 ? 's' : ''} or campaign{N.pipelineCount > 1 ? 's' : ''} that each land in full or not at all, so the lines can split into two groups.</p>}
    </Stage>
  )
}

export function NonprofitDetails({ output }: { output: ModelOutput }) {
  const N = output.nonprofit as NonprofitResult
  const p = output.input.nonprofit
  const f = output.forecast
  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold">Checks on your finances</h3>
        <ul className="mt-3 space-y-2">
          {N.flags.map((fl) => {
            const { box, Icon, word } = tone[fl.level]
            return (
              <li key={fl.text} className={`flex items-start gap-2 rounded-lg border border-line px-4 py-3 text-sm ${box}`}>
                <Icon size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> <span><span className="sr-only">{word}: </span>{fl.text}</span>
              </li>
            )
          })}
        </ul>
      </section>

      <section className="grid gap-8 lg:grid-cols-2">
        <div>
          <h3 className="text-sm font-semibold">Who funds you</h3>
          {N.mix.length ? (
            <ul className="mt-3 space-y-3">
              {N.mix.map((m) => (
                <li key={m.key}>
                  <div className="flex justify-between text-sm"><span className="text-ink-muted">{m.label}</span><span className="tabular font-medium">{Math.round(m.share * 100)}%</span></div>
                  <div className="mt-1 h-2 overflow-hidden rounded-full bg-sunken"><div className="ramp-bg h-full rounded-full" style={{ width: `${m.share * 100}%` }} /></div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-sm text-ink-muted">No income mix entered. Add it under "More detail" to see how exposed you are to one funder.</p>
          )}
        </div>
        <div>
          <h3 className="text-sm font-semibold">This year's result</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Income is expected to total <span className="font-semibold text-ink">{usd(f.next12.revenue.p50)}</span> against spending of <span className="font-semibold text-ink">{usd(f.next12.expenses?.p50 ?? 0)}</span>, a typical result of <span className="font-semibold text-ink">{usd(N.net12.p50)}</span>.
            {' '}In {Math.round(N.probSurplus * 100)}% of simulated years you finish with a surplus.{' '}
            {N.startsBelowReserve
              ? N.reserveReachedMonth
                ? `Cash is under your ${p.reserveTargetMonths}-month reserve target today; at the typical forecast you reach it in ${monthLabel(N.reserveReachedMonth)}.`
                : `Cash is under your ${p.reserveTargetMonths}-month reserve target today and does not reach it within 12 months at the typical forecast.`
              : `${Math.round(N.probBelowReserve * 100)}% of the time cash dips below your ${p.reserveTargetMonths}-month reserve target at some point.`}
          </p>
        </div>
      </section>
    </div>
  )
}
