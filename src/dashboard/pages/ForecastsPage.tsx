import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useDashboardData } from '@/data/useDashboardData'
import type { MetricKey } from '@/data/types'
import { formatPercent, formatUsd } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Card } from '../components/Card'
import { ForecastChart } from '../components/ForecastChart'
import { MetricTabs } from '../components/MetricTabs'
import { metricLabels } from '@/data/metrics'

export default function ForecastsPage() {
  const data = useDashboardData()
  const [metric, setMetric] = useState<MetricKey>('revenue')
  // Scenario is a simple percent shift applied to the forecast. The real model will return full scenario runs.
  const [shift, setShift] = useState(0)
  const scenario = 1 + shift / 100

  const points = data.series[metric]
  const rows = points.filter((p) => p.actual === null)

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <p className="max-w-2xl text-sm text-ink-muted">
        Forecasts for the next 90 days, with a range that widens the further out the model looks. Use the scenario
        control to see how a change in demand would carry through.
      </p>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={`${metricLabels[metric]} forecast`}
          subtitle="18 months of history, 3 months projected"
          action={<MetricTabs value={metric} onChange={setMetric} />}
        >
          <ForecastChart points={points} height={340} scenario={scenario} />
        </Card>

        <Card title="Scenario explorer" subtitle="Adjust expected demand">
          <label htmlFor="scenario" className="flex items-baseline justify-between text-[13px] font-medium text-ink-soft">
            Demand change
            <span className="tabular text-lg font-semibold text-accent">{shift === 0 ? 'Baseline' : formatPercent(shift, 0)}</span>
          </label>
          <input
            id="scenario"
            type="range"
            min={-20}
            max={20}
            step={1}
            value={shift}
            onChange={(e) => setShift(Number(e.target.value))}
            className="mt-4 w-full accent-[var(--color-accent)]"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-faint">
            <span>-20%</span>
            <span>+20%</span>
          </div>
          <p className="mt-5 rounded-lg bg-page p-3.5 text-[13px] leading-relaxed text-ink-muted">
            Illustrative only. In the full product this will re-run the model with your assumptions instead of scaling the
            baseline.
          </p>
          <Button variant="secondary" size="sm" className="mt-4" onClick={() => setShift(0)} disabled={shift === 0}>
            <RotateCcw size={14} /> Reset
          </Button>
        </Card>
      </div>

      <Card title="Forecast detail" padded={false}>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[520px] text-left text-sm">
            <caption className="sr-only">{`${metricLabels[metric]} forecast by month`}</caption>
            <thead>
              <tr className="border-y border-line-soft bg-page text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="px-5 py-3 font-medium">Month</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Forecast</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Low</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">High</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="px-5 py-3.5 font-medium">{r.month}</th>
                  <td className="tabular px-5 py-3.5 text-right font-semibold">{formatUsd(Math.round((r.forecast ?? 0) * scenario))}</td>
                  <td className="tabular px-5 py-3.5 text-right text-ink-muted">{formatUsd(Math.round((r.low ?? 0) * scenario))}</td>
                  <td className="tabular px-5 py-3.5 text-right text-ink-muted">{formatUsd(Math.round((r.high ?? 0) * scenario))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
