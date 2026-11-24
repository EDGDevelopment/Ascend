import { useMemo, type ReactNode } from 'react'
import { Printer } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthLabel } from '@/data/useDashboardData'
import { formatUsd } from '@/lib/format'
import { useValuation } from '@/valuation/useValuation'
import type { ModelOutput } from '@/valuation/engine'
import { scoreTrackRecord } from '../../../supabase/functions/_shared/valuation/track'
import { NeedsData } from '../components/NeedsData'
import { short } from '../valuation/format'

const pct = (n: number, d = 0) => `${(n * 100).toFixed(d)}%`
const months = (n: number) => (Number.isFinite(n) ? `${n.toFixed(1)} months` : 'No spending recorded')

interface Fact {
  label: string
  value: string
  note?: string
}

/** The figures a lender or grant-maker asks for, taken from the results already worked out. */
function factsFor(o: ModelOutput): { facts: Fact[]; good: string[]; watch: string[] } {
  const f = o.forecast
  const good: string[] = []
  const watch: string[] = []
  const facts: Fact[] = [
    { label: 'Revenue, last 12 months', value: formatUsd(f.trailing12.revenue) },
    { label: 'Revenue forecast, next 12 months', value: short(f.next12.revenue.p50), note: `Likely range ${short(f.next12.revenue.p10)} to ${short(f.next12.revenue.p90)}` },
    { label: 'Expected growth', value: `${f.growth.p50 >= 0 ? '+' : ''}${pct(f.growth.p50, 1)}`, note: `${pct(f.probBelowLastYear.revenue)} chance next year comes in below this one` },
  ]
  if (f.growth.p50 > 0.02) good.push(`Revenue is forecast to grow about ${pct(f.growth.p50, 1)} over the next 12 months.`)
  if (f.growth.p50 < -0.02) watch.push(`Revenue is forecast to fall about ${pct(-f.growth.p50, 1)} over the next 12 months.`)

  if (f.trailing12.expenses !== null && f.trailing12.revenue > 0) {
    const net = f.trailing12.revenue - f.trailing12.expenses
    facts.push({ label: 'Surplus, last 12 months', value: formatUsd(net), note: `${pct(net / f.trailing12.revenue, 1)} of revenue` })
    if (net > 0) good.push('Revenue covered spending over the last 12 months.')
    else watch.push('Spending was higher than revenue over the last 12 months.')
  }

  if (o.local) {
    const l = o.local
    facts.push({ label: 'Owner earnings (SDE)', value: formatUsd(l.sde), note: `${pct(l.sdeMargin, 1)} of revenue` })
    facts.push({ label: 'Estimated business value', value: short(l.range.mid), note: `Range ${short(l.range.low)} to ${short(l.range.high)}` })
    if (l.cash) {
      facts.push({ label: 'Cash on hand', value: months(l.cash.monthsOfCash), note: `Target ${months(l.cash.reserveTargetAmount / Math.max(l.cash.avgMonthlyExpenses, 1))}` })
      if (Number.isFinite(l.cash.monthsOfCash)) (l.cash.monthsOfCash >= 3 ? good : watch).push(`Cash covers about ${l.cash.monthsOfCash.toFixed(1)} months of spending.`)
    }
    watch.push(...l.warnings)
  }

  if (o.nonprofit) {
    const n = o.nonprofit
    facts.push({ label: 'Cash on hand', value: months(n.monthsOfCash), note: `Reserve target ${formatUsd(n.reserveTargetAmount)}` })
    facts.push({ label: 'Chance of a cash shortfall this year', value: pct(n.probShortfall), note: n.runoutMonth ? `Typical cash runs out ${monthLabel(n.runoutMonth)}` : 'Typical cash lasts the whole year' })
    facts.push({ label: 'Surplus forecast, next 12 months', value: short(n.net12.p50), note: `Range ${short(n.net12.p10)} to ${short(n.net12.p90)}` })
    if (n.largestSource) facts.push({ label: 'Largest funding source', value: `${n.largestSource.label}, ${pct(n.largestSource.share)}`, note: n.concentration !== null ? `Concentration index ${n.concentration.toFixed(2)}` : undefined })
    if (n.retention) facts.push({ label: 'Donor retention', value: pct(n.retention.rate) })
    for (const fl of n.flags) (fl.level === 'good' ? good : watch).push(fl.text)
  }
  return { facts, good, watch }
}

function List({ title, items, empty }: { title: string; items: string[]; empty: string }) {
  return (
    <div>
      <h3 className="text-sm font-semibold">{title}</h3>
      {items.length === 0 ? (
        <p className="mt-2 text-sm text-ink-muted">{empty}</p>
      ) : (
        <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-ink-faint">
          {items.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      )}
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="break-inside-avoid border-t border-line-soft pt-5">
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wide text-ink-faint">{title}</h2>
      {children}
    </section>
  )
}

export default function FundingPage() {
  const { active, output } = useValuation()
  const track = useMemo(() => (active ? scoreTrackRecord(active.snapshots ?? [], active.input.monthly) : null), [active])
  if (!active || !output || !track) return <NeedsData />

  const { facts, good, watch } = factsFor(output)
  const rows = output.input.monthly
  const name = output.input.companyName.trim() || active.name
  const f = output.forecast

  return (
    <div className="mx-auto max-w-[820px] space-y-4">
      <div className="flex justify-end print:hidden">
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> Print or save as PDF
        </Button>
      </div>

      <article className="space-y-6 rounded-card border border-line bg-surface p-6 sm:p-9 print:border-0 print:p-0">
        <header>
          <p className="text-xs font-semibold uppercase tracking-wide text-accent-ink">Financial snapshot</p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight">{name}</h1>
          <p className="mt-1 text-sm text-ink-muted">
            {output.input.orgType === 'nonprofit' ? 'Non-profit' : 'Local business'} · {rows.length} months of results, {monthLabel(rows[0].month)} to {monthLabel(rows[rows.length - 1].month)} · Prepared {new Date().toLocaleDateString()}
          </p>
        </header>

        <Section title="Key figures">
          <dl className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            {facts.map((x) => (
              <div key={x.label} className="break-inside-avoid">
                <dt className="text-xs text-ink-faint">{x.label}</dt>
                <dd className="mt-0.5 text-xl font-semibold tracking-tight">{x.value}</dd>
                {x.note && <p className="text-[13px] text-ink-muted">{x.note}</p>}
              </div>
            ))}
          </dl>
        </Section>

        <Section title="Strengths and things to watch">
          <div className="grid gap-6 sm:grid-cols-2">
            <List title="Strengths" items={good} empty="Nothing stands out as a clear strength in these figures." />
            <List title="Watch" items={watch} empty="Nothing flagged." />
          </div>
        </Section>

        <Section title="How reliable is the forecast">
          <ul className="list-disc space-y-1.5 pl-5 text-sm leading-relaxed marker:text-ink-faint">
            <li>
              Method: {f.method.replace(/-/g, ' ')}
              {f.usedPatch ? ' with the Ascend Patch Forecaster' : ''}, run over thousands of simulated futures to give a range rather than one number.
            </li>
            {f.backtest && <li>Tested on this organisation's own last months, it was typically {pct(f.backtest.mape, 1)} off each month.</li>}
            {track.scored > 0 && track.inRangeShare !== null && (
              <li>
                Past forecasts: {pct(track.inRangeShare)} of {track.scored} real month{track.scored === 1 ? '' : 's'} landed inside the forecast range, with a typical miss of {pct(track.typicalError ?? 0, 1)}.
              </li>
            )}
          </ul>
        </Section>

        <p className="border-t border-line-soft pt-4 text-xs leading-relaxed text-ink-faint">
          Prepared with Ascend from figures supplied by the organisation. These are unaudited estimates with ranges, not accounts, a valuation opinion or financial advice.
        </p>
      </article>
    </div>
  )
}
