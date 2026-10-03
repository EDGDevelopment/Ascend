import { useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { useDashboardData } from '@/data/useDashboardData'
import { metricLabels } from '@/data/metrics'
import type { MetricKey } from '@/data/types'
import { formatPercent, formatUsd } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { Card } from '../components/Card'
import { ForecastChart } from '../components/ForecastChart'
import { MetricTabs } from '../components/MetricTabs'

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
      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title={`${metricLabels[metric]}, next 90 days`} action={<MetricTabs value={metric} onChange={setMetric} />}>
          <ForecastChart points={points} height={340} scenario={scenario} />
        </Card>

        <Card title="Scenario" subtitle="Adjust expected demand">
          <label htmlFor="scenario" className="flex items-baseline justify-between text-[13px] text-ink-muted">
            Demand change
            <span className="tabular text-xl font-semibold text-accent">{shift === 0 ? 'Baseline' : formatPercent(shift, 0)}</span>
          </label>
          <input
            id="scenario"
            type="range"
            min={-20}
            max={20}
            step={1}
            value={shift}
            onChange={(e) => setShift(Number(e.target.value))}
            className="mt-4 w-full"
          />
          <div className="mt-1 flex justify-between text-xs text-ink-faint">
            <span>-20%</span>
            <span>+20%</span>
          </div>
          <Button variant="secondary" size="sm" className="mt-5" onClick={() => setShift(0)} disabled={shift === 0}>
            <RotateCcw size={14} aria-hidden="true" /> Reset
          </Button>
          <p className="mt-5 text-xs text-ink-faint">Illustrative. The model will re-run with your assumptions.</p>
        </Card>
      </div>

      <Card title="Forecast detail" padded={false}>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[480px] text-left text-sm">
            <caption className="sr-only">{`${metricLabels[metric]} forecast by month`}</caption>
            <thead>
              <tr className="border-y border-line-soft bg-page text-xs text-ink-faint">
                <th scope="col" className="px-5 py-2.5 font-medium">Month</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Forecast</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">Low</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">High</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.month} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="px-5 py-3 font-medium">{r.month}</th>
                  <td className="px-5 py-3 text-right font-semibold">{formatUsd(Math.round((r.forecast ?? 0) * scenario))}</td>
                  <td className="px-5 py-3 text-right text-ink-muted">{formatUsd(Math.round((r.low ?? 0) * scenario))}</td>
                  <td className="px-5 py-3 text-right text-ink-muted">{formatUsd(Math.round((r.high ?? 0) * scenario))}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
