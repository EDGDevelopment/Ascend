import { PRESETS, discountRate, resolveLocal, type LocalProfile, type ModelInput, type Preset } from '@/valuation/engine'
import { formatUsd } from '@/lib/format'
import { NumberField } from '../components/NumberField'

interface Props {
  input: ModelInput
  loadId: number
  setInput: (next: ModelInput) => void
}

function useLocalFields({ input, loadId, setInput }: Props) {
  const p = input.local
  const set = (patch: Partial<LocalProfile>) => setInput({ ...input, local: { ...p, ...patch } })
  const num = (key: keyof LocalProfile, label: string, kind: 'pct' | 'num' | 'int' = 'num', hint?: string, optional = false) => (
    <NumberField key={`${key}-${loadId}`} label={label} kind={kind} hint={hint} optional={optional} value={p[key] as number | undefined} onCommit={(v) => set({ [key]: v } as Partial<LocalProfile>)} />
  )
  return { p, set, num }
}

/** The few questions everyone answers. */
export function LocalQuestions(props: Props) {
  const { input } = props
  const { p, set, num } = useLocalFields(props)
  const resolved = resolveLocal(p, input.monthly)
  const fromMonths = input.monthly.slice(-12).every((r) => r.expenses !== undefined)
  const preset = p.preset === 'custom' ? null : PRESETS[p.preset]

  return (
    <div className="grid gap-5 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <label htmlFor="preset" className="mb-1.5 block text-[13px] font-medium text-ink-soft">What kind of business is it?</label>
        <select
          id="preset"
          value={p.preset}
          onChange={(e) => {
            const v = e.target.value as Preset
            if (v === 'custom') set({ preset: 'custom' })
            else set({ preset: v, multipleLow: PRESETS[v].low, multipleMid: PRESETS[v].mid, multipleHigh: PRESETS[v].high })
          }}
          className="h-11 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink hover:border-ink-faint focus:border-accent-bright focus:outline-none focus:ring-2 focus:ring-accent-bright/25"
        >
          {Object.entries(PRESETS).map(([k, v]) => (
            <option key={k} value={k}>{v.label}</option>
          ))}
          <option value="custom">Something else (set my own multiples)</option>
        </select>
        <p className="mt-1.5 text-xs text-ink-faint">{preset ? preset.note : 'Set your own multiples under "More detail".'}</p>
      </div>
      {num('netProfit', 'Profit in the last 12 months', 'num', fromMonths && resolved.netProfit !== undefined ? `Worked out from your months: ${formatUsd(Math.round(resolved.netProfit))}. Type a number to use your accounts instead.` : 'After costs, before income tax. Needed because your months have no expenses.', fromMonths)}
      {num('ownerPay', 'What you pay yourself in a year', 'num', 'Salary and draws. A new owner would take their own, so it counts as extra earnings.')}
      {num('netDebt', 'Money owed, minus cash in the business', 'num', 'Loans less cash. Leave 0 if none.')}
    </div>
  )
}

/** Everything optional. Sensible values are used when these are left alone. */
export function LocalMore(props: Props) {
  const { input, setInput, loadId } = props
  const { p, set, num } = useLocalFields(props)
  const rate = discountRate(p)

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-sm font-semibold">Adjustments to your profit</h3>
        <p className="mt-0.5 text-xs text-ink-faint">Costs a new owner would not have. Each one makes your owner earnings, and so the value, higher.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {num('depreciation', 'Depreciation')}
          {num('interest', 'Interest paid')}
          {num('otherAddBacks', 'One-off or personal costs', 'num', 'A repair, a trip, a relative on the payroll.')}
          {num('assetValue', 'Equipment and stock you could sell', 'num', 'Sets a floor under the value.', true)}
          {num('fairManagerWage', 'What a manager would cost', 'num', 'Blank: the same as your own pay.', true)}
          {num('maintenanceCapex', 'Yearly upkeep spend', 'num', 'Blank: 1.5% of sales.', true)}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Cash safety</h3>
        <p className="mt-0.5 text-xs text-ink-faint">Optional. Shows how long your cash lasts and the chance of running short. Needs expenses in your months.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          {num('cashOnHand', 'Cash in the bank today', 'num', undefined, true)}
          {num('reserveTargetMonths', 'Cash target, months of spending', 'num', 'Blank: 3 months.', true)}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">What buyers pay</h3>
        <p className="mt-0.5 text-xs text-ink-faint">Small businesses usually sell for about 1.5 to 4 times their owner earnings. These are starting points, not market data for your area.</p>
        <div key={`mult-${loadId}-${p.preset}`} className="mt-3 grid max-w-md grid-cols-3 gap-3">
          <NumberField label="Low" kind="num" value={p.multipleLow} onCommit={(v) => v !== undefined && set({ multipleLow: v, preset: 'custom' })} />
          <NumberField label="Typical" kind="num" value={p.multipleMid} onCommit={(v) => v !== undefined && set({ multipleMid: v, preset: 'custom' })} />
          <NumberField label="High" kind="num" value={p.multipleHigh} onCommit={(v) => v !== undefined && set({ multipleHigh: v, preset: 'custom' })} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Risk</h3>
        <p className="mt-0.5 text-xs text-ink-faint">The return a buyer would demand, built up in steps. Yours adds up to {(rate * 100).toFixed(1)}%.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {num('riskFreeRate', 'Safe return', 'pct', 'Government bond yield.')}
          {num('equityRiskPremium', 'Market risk', 'pct')}
          {num('sizePremium', 'Small-business risk', 'pct')}
          {num('specificRisk', 'Your own risk', 'pct', 'Higher if you rely on you, one big customer or one site.')}
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Advanced</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {num('taxRate', 'Tax rate', 'pct')}
          {num('nwcPct', 'Working capital', 'pct', 'Cash tied up per extra dollar of sales.')}
          {num('terminalGrowth', 'Long-run growth', 'pct')}
          {num('forecastYears', 'Years to value', 'int', '3 to 10.')}
          {num('marginSd', 'Profit uncertainty', 'pct', 'Typical miss, in points.')}
          {num('rateSd', 'Return uncertainty', 'pct', 'Typical miss, in points.')}
          {num('terminalSd', 'Growth uncertainty', 'pct', 'Typical miss, in points.')}
          <NumberField key={`sims-${loadId}`} label="Simulations" kind="int" hint="500 to 20,000." value={input.simulations} onCommit={(v) => v !== undefined && setInput({ ...input, simulations: v })} />
        </div>
      </section>
    </div>
  )
}
