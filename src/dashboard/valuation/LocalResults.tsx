import { formatNumber, formatUsd, formatUsdCompact } from '@/lib/format'
import type { LocalResult, ModelOutput, Range } from '@/valuation/engine'
import { ColoredStats } from './ColoredStats'
import { OUTCOME } from './ramp'
import { RampHistogram } from './RampHistogram'

const usd = (n: number) => formatUsd(Math.round(n))
const pct = (n: number, d = 1) => `${(n * 100).toFixed(d)}%`
const span = (r: Range) => `${formatUsdCompact(r.low)} to ${formatUsdCompact(r.high)}`

function Method({ title, value, range, note }: { title: string; value: string; range?: string; note: string }) {
  return (
    <div className="rounded-card border border-line bg-surface p-5">
      <h3 className="text-[13px] font-medium text-ink-muted">{title}</h3>
      <p className="tabular mt-1 text-xl font-semibold tracking-tight">{value}</p>
      {range && <p className="mt-0.5 text-[13px] text-ink-faint">{range}</p>}
      <p className="mt-3 text-[13px] text-ink-muted">{note}</p>
    </div>
  )
}

export function LocalDetails({ output }: { output: ModelOutput }) {
  const L = output.local as LocalResult
  const p = L.profile

  return (
    <div className="space-y-8">
      <section>
        <h3 className="text-sm font-semibold">The valuation methods</h3>
        <p className="mt-0.5 text-xs text-ink-muted">Weighted into the headline range. {L.agreement.label === 'close' ? 'They agree closely.' : L.agreement.label === 'moderate' ? 'They agree roughly.' : 'They disagree widely.'}</p>
        <div className="mt-3 grid gap-4 md:grid-cols-3">
          {L.methods.map((m) => (
            <Method
              key={m.id}
              title={`${m.label} (${Math.round(m.weight * 100)}%)`}
              value={span(m)}
              range={`typical ${usd(m.mid)}`}
              note={m.id === 'sde' ? `Owner earnings of ${usd(L.sde)} (${pct(L.sdeMargin)} of sales) times ${p.multipleLow} to ${p.multipleHigh}. How small businesses are usually priced.` : m.id === 'dcf' ? `Adds up the cash a manager-run version would earn over ${p.forecastYears} years, using your forecast, then discounts it at ${pct(L.discountRate, 0)}. Middle half of ${formatNumber(L.simulation.trials)} simulations.` : 'What equipment and stock are worth, plus the value of earnings beyond a fair return on them. A method appraisers use for small businesses.'}
            />
          ))}
          {L.excessValue === null && <Method title="Excess earnings" value="Not used" note="Add the value of equipment and stock you could sell under More detail to include this method. It also sets a floor under the value." />}
        </div>
        {L.assetFloor !== null && <p className="mt-3 text-xs text-ink-muted">The value never goes below {usd(L.assetFloor)}, what the equipment and stock alone could fetch.</p>}
      </section>

      <div className="space-y-6">
        <h3 className="text-sm font-semibold">The cash-flow check in detail</h3>
        <div className="space-y-6">
          <div className="grid gap-6 xl:grid-cols-2">
            <div>
              <h3 className="text-[13px] font-semibold">Range of outcomes</h3>
              <p className="mt-0.5 text-xs text-ink-faint">Business value across {formatNumber(L.simulation.trials)} simulated futures. Growth in year one follows your own forecast range; margin, required return and long-run growth are nudged by the uncertainties you set.</p>
              <div className="mt-3">
                <RampHistogram
                  bins={L.simulation.histogram}
                  format={formatUsdCompact}
                  ariaLabel="Distribution of simulated business values, from lowest on the left to highest on the right"
                  marks={[
                    { label: 'P10', value: L.simulation.p10, color: OUTCOME.worst },
                    { label: 'Middle', value: L.simulation.p50, color: 'var(--color-ink)' },
                    { label: 'P90', value: L.simulation.p90, color: OUTCOME.best },
                  ]}
                />
              </div>
              <ColoredStats
                stats={[
                  { label: 'Low (P10)', value: formatUsdCompact(L.simulation.p10), color: OUTCOME.worst },
                  { label: 'Middle', value: formatUsdCompact(L.simulation.p50), color: 'var(--color-ink)' },
                  { label: 'High (P90)', value: formatUsdCompact(L.simulation.p90), color: OUTCOME.best },
                ]}
              />
            </div>

            <div>
              <h3 className="text-[13px] font-semibold">Where the numbers come from</h3>
              <dl className="mt-3 space-y-1.5 text-sm">
                {([
                  ['Net profit', p.netProfit], ['+ Owner pay', p.ownerPay], ['+ Depreciation', p.depreciation], ['+ Interest', p.interest], ['+ One-off or personal', p.otherAddBacks],
                ] as const).map(([l, v]) => (
                  <div key={l} className="flex justify-between"><dt className="text-ink-muted">{l}</dt><dd className="tabular">{usd(v)}</dd></div>
                ))}
                <div className="flex justify-between border-t border-line-soft pt-1.5 font-semibold"><dt>Owner earnings (SDE)</dt><dd className="tabular">{usd(L.sde)}</dd></div>
                <div className="flex justify-between pt-3"><dt className="text-ink-muted">Required return</dt><dd className="tabular">{pct(p.riskFreeRate)} + {pct(p.equityRiskPremium)} + {pct(p.sizePremium)} + {pct(p.specificRisk)} = {pct(L.discountRate)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Profit margin after a fair manager wage</dt><dd className="tabular">{pct(L.ebitMargin)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Year-one growth used</dt><dd className="tabular">{pct(L.dcfParams.growth1)}</dd></div>
                <div className="flex justify-between"><dt className="text-ink-muted">Share of value from beyond year {p.forecastYears}</dt><dd className="tabular">{pct(L.dcf.terminalShare, 0)}</dd></div>
              </dl>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-2">
            <div className="overflow-x-auto">
              <h3 className="text-[13px] font-semibold">If the required return or long-run growth were different</h3>
              <table className="mt-3 w-full min-w-[440px] text-right text-sm">
                <caption className="sr-only">Business value by required return and long-run growth</caption>
                <thead>
                  <tr className="border-y border-line-soft bg-page text-xs text-ink-faint">
                    <th scope="col" className="px-3 py-2 text-left font-medium">Return \ Growth</th>
                    {L.sensitivity.growths.map((g) => <th key={g} scope="col" className="px-3 py-2 font-medium">{pct(g, 2)}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {L.sensitivity.values.map((row, r) => (
                    <tr key={r} className="border-b border-line-soft last:border-0">
                      <th scope="row" className="px-3 py-2 text-left font-medium">{pct(L.sensitivity.rates[r])}</th>
                      {row.map((v, c) => (
                        <td key={c} className={`tabular px-3 py-2 ${r === 2 && c === 2 ? 'bg-accent-soft font-semibold text-accent-ink' : 'text-ink-muted'}`}>{Number.isNaN(v) ? 'n/a' : formatUsdCompact(v)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="overflow-x-auto">
              <h3 className="text-[13px] font-semibold">Cash a manager-run business would produce</h3>
              <table className="mt-3 w-full min-w-[420px] text-right text-sm">
                <caption className="sr-only">Forecast revenue and free cash flow by year</caption>
                <thead>
                  <tr className="border-y border-line-soft bg-page text-xs text-ink-faint">
                    {['Year', 'Revenue', 'Growth', 'Cash flow', 'Worth today'].map((h) => <th key={h} scope="col" className="px-3 py-2 font-medium first:text-left">{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {L.dcf.years.map((y) => (
                    <tr key={y.year} className="border-b border-line-soft last:border-0">
                      <th scope="row" className="px-3 py-2 text-left font-medium">{y.year}</th>
                      <td className="tabular px-3 py-2">{usd(y.revenue)}</td>
                      <td className="tabular px-3 py-2 text-ink-muted">{pct(y.growth)}</td>
                      <td className="tabular px-3 py-2">{usd(y.fcf)}</td>
                      <td className="tabular px-3 py-2 text-ink-muted">{usd(y.pvFcf)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

