import { useState } from 'react'
import { useDashboardData } from '@/data/useDashboardData'
import { metricLabels } from '@/data/metrics'
import type { MetricKey } from '@/data/types'
import { formatPercent, formatUsd } from '@/lib/format'
import { useValuation } from '@/valuation/useValuation'
import { Card } from '../components/Card'
import { ForecastChart } from '../components/ForecastChart'
import { KpiStrip } from '../components/KpiStrip'
import { MetricTabs } from '../components/MetricTabs'
import { NeedsData } from '../components/NeedsData'
import { Insights } from '../valuation/Insights'

export default function OverviewPage() {
  const data = useDashboardData()
  const { output } = useValuation()
  const [metric, setMetric] = useState<MetricKey>('revenue')

  if (!data || !output) return <NeedsData />

  const shown = data.metrics.includes(metric) ? metric : 'revenue'
  const points = data.series[shown]
  const end = points[points.length - 1]

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {data.name} <span className="font-normal text-ink-faint">· up to {data.asOf}</span>
      </h2>

      <KpiStrip kpis={data.kpis} next12={data.next12.mid} growth={data.modelDriver.growth} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={`${metricLabels[shown]} forecast`}
          subtitle={`${formatUsd(end.forecast ?? 0)} projected by ${end.month} (${formatUsd(end.low ?? 0)} to ${formatUsd(end.high ?? 0)}). From your own figures, ${formatPercent(data.modelDriver.growth * 100)} expected revenue growth over 12 months.`}
          action={<MetricTabs value={shown} onChange={setMetric} available={data.metrics} />}
        >
          <ForecastChart points={points} />
        </Card>
        <Insights output={output} />
      </div>
    </div>
  )
}
