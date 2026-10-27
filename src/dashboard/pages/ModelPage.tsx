import { useDashboardData } from '@/data/useDashboardData'
import { useValuation } from '@/valuation/useValuation'
import { Card } from '../components/Card'
import { NeedsData } from '../components/NeedsData'

// Measured by scripts/backtest.mjs on 31 public monthly series (US Census retail by store type, airline passengers,
// Quebec car sales). See docs/VALUATION.md.
const BENCHMARKS = [
  { history: '36 months', accuracy: '95.4%', ranges: '80.0%' },
  { history: '18 months', accuracy: '95.0%', ranges: '82.7%' },
]

export default function ModelPage() {
  const data = useDashboardData()
  const { output, source } = useValuation()
  if (!data || !output) return <NeedsData />

  const f = output.forecast
  const d = data.modelDriver
  const rows: [string, string][] = [
    ['Months of your data', String(output.input.monthly.length)],
    ['Method', d.method],
    ['Simulated futures', output.input.simulations.toLocaleString()],
    ['Worked out', `${new Date(d.computedAt).toLocaleString()}${source ? `, ${source === 'server' ? 'on the server' : 'in your browser'}` : ''}`],
    ['Tested on your last months', d.backtestError === null ? 'Not enough history to test' : `typically ${(d.backtestError * 100).toFixed(1)}% off each month`],
    ['Ascend Patch Forecaster', f.usedPatch ? 'Used' : 'Not used for this run'],
  ]

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Card title="How your forecast was made" subtitle="Everything here comes from the spreadsheet you uploaded.">
        <dl className="divide-y divide-line-soft">
          {rows.map(([k, v]) => (
            <div key={k} className="grid gap-1 py-3 sm:grid-cols-[220px_1fr]">
              <dt className="text-sm text-ink-muted">{k}</dt>
              <dd className="text-[15px] font-medium">{v}</dd>
            </div>
          ))}
        </dl>
      </Card>

      <Card title="How well the method works in general" subtitle="Tested on 31 public monthly series: forecast 12 months ahead from the last 18 or 36 months, many times over.">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-line-soft text-xs text-ink-faint">
              <th scope="col" className="py-2 font-medium">History given</th>
              <th scope="col" className="py-2 text-right font-medium">Monthly accuracy</th>
              <th scope="col" className="py-2 text-right font-medium">Range held the truth</th>
            </tr>
          </thead>
          <tbody>
            {BENCHMARKS.map((b) => (
              <tr key={b.history} className="border-b border-line-soft last:border-0">
                <th scope="row" className="py-3 font-medium">{b.history}</th>
                <td className="py-3 text-right font-semibold">{b.accuracy}</td>
                <td className="py-3 text-right">{b.ranges}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-faint">
          These are national totals for whole retail categories, which are smoother than one business. Your own number above is the one to trust. Ranges are meant to hold the truth about 8 times in 10.
        </p>
      </Card>
    </div>
  )
}
