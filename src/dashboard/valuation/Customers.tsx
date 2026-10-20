import { useMemo, useState } from 'react'
import { customerEconomics, type CustomerInputs } from '@/valuation/engine'
import { NumberField } from '../components/NumberField'
import { ColoredStats } from './ColoredStats'
import { OUTCOME } from './ramp'
import { Stage } from './Stage'
import { short } from './format'

const START: CustomerInputs = { avgSale: 28, purchasesPerYear: 9, grossMargin: 0.65, yearsActive: 3, marketingPerMonth: 1500, newCustomersPerMonth: 60 }

/** What a customer is worth, what one costs to win, and whether the sums work. A standalone calculator: it does not use the forecast. */
export function Customers() {
  const [c, setC] = useState<CustomerInputs>(START)
  const r = useMemo(() => customerEconomics(c), [c])
  const f = (key: keyof CustomerInputs, label: string, kind: 'num' | 'pct' | 'int', hint: string) => (
    <NumberField label={label} kind={kind} hint={hint} value={c[key]} onCommit={(v) => setC((x) => ({ ...x, [key]: v ?? 0 }))} />
  )
  const verdict = r.ratio === null ? null : r.ratio >= 3 ? { text: 'Healthy: each customer earns you well over what they cost to win.', color: OUTCOME.good } : r.ratio >= 1 ? { text: 'Thin: customers pay back, but not by much. Look at repeat visits or the cost of winning them.', color: OUTCOME.caution } : { text: 'Losing money on new customers: they cost more to win than they ever return.', color: OUTCOME.worst }
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {f('avgSale', 'Average sale', 'num', 'What one customer spends each time.')}
        {f('purchasesPerYear', 'Visits or orders a year', 'num', 'How often a typical customer buys.')}
        {f('grossMargin', 'Profit left on each sale', 'pct', 'After the direct cost of the sale.')}
        {f('yearsActive', 'Years a customer stays', 'num', 'Before they stop coming.')}
        {f('marketingPerMonth', 'Spent on winning customers a month', 'num', 'Ads, promotions, referral rewards.')}
        {f('newCustomersPerMonth', 'New customers a month', 'num', 'People who bought from you for the first time.')}
      </div>
      <Stage title="Is winning customers worth it?" subtitle="Lifetime value against the cost of winning someone new.">
        <ColoredStats
          stats={[
            { label: 'A customer is worth', value: short(r.lifetimeValue), color: OUTCOME.best, note: 'profit over their time with you' },
            { label: 'Winning one costs', value: r.acquisitionCost !== null ? short(r.acquisitionCost) : 'n/a', color: OUTCOME.caution, note: 'marketing per new customer' },
            { label: 'Worth for each $1 spent', value: r.ratio !== null ? `${r.ratio.toFixed(1)}x` : 'n/a', color: verdict?.color ?? 'var(--color-ink)', note: '3x or more is the usual aim' },
            { label: 'Paid back in', value: r.paybackMonths !== null ? `${r.paybackMonths.toFixed(1)} months` : 'n/a', color: OUTCOME.good, note: 'of that customer\'s profit' },
          ]}
        />
        {verdict && <p className="mt-4 text-sm" style={{ color: verdict.color }}>{verdict.text}</p>}
      </Stage>
    </div>
  )
}
