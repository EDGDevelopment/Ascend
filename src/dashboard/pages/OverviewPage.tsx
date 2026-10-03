import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight } from 'lucide-react'
import { useDashboardData } from '@/data/useDashboardData'
import { metricLabels } from '@/data/metrics'
import type { MetricKey } from '@/data/types'
import { formatUsd } from '@/lib/format'
import { ActivityFeed } from '../components/ActivityFeed'
import { Card } from '../components/Card'
import { DemandChart } from '../components/DemandChart'
import { ForecastChart } from '../components/ForecastChart'
import { HealthCard } from '../components/HealthCard'
import { KpiStrip } from '../components/KpiStrip'
import { MetricTabs } from '../components/MetricTabs'
import { OpportunityRow } from '../components/OpportunityRow'

function ViewAll({ to }: { to: string }) {
  return (
    <Link to={to} className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
      View all <ArrowRight size={14} aria-hidden="true" />
    </Link>
  )
}

export default function OverviewPage() {
  const data = useDashboardData()
  const [metric, setMetric] = useState<MetricKey>('revenue')

  const points = data.series[metric]
  const end = points[points.length - 1]
  const open = data.opportunities.filter((o) => o.status !== 'Done')
  const openValue = open.reduce((sum, o) => sum + o.monthlyValue, 0)

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <h2 className="text-xl font-semibold tracking-tight">
        {data.business.name} <span className="font-normal text-ink-faint">· September 2026</span>
      </h2>

      <KpiStrip kpis={data.kpis} openValue={openValue} openCount={open.length} />

      <div className="grid gap-6 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={`${metricLabels[metric]} forecast`}
          subtitle={`${formatUsd(end.forecast ?? 0)} projected by ${end.month} (${formatUsd(end.low ?? 0)} to ${formatUsd(end.high ?? 0)})`}
          action={<MetricTabs value={metric} onChange={setMetric} />}
        >
          <ForecastChart points={points} />
        </Card>
        <HealthCard score={data.healthScore} change={data.healthChange} factors={data.healthFactors} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <Card className="xl:col-span-2" title="Top opportunities" action={<ViewAll to="/dashboard/opportunities" />}>
          <div className="divide-y divide-line-soft">
            {open.slice(0, 3).map((o) => (
              <OpportunityRow key={o.id} item={o} compact />
            ))}
          </div>
        </Card>
        <Card title="Recent activity">
          <ActivityFeed items={data.activity.slice(0, 4)} />
        </Card>
      </div>

      <Card title="Weekday sales versus potential">
        <DemandChart data={data.demand} />
      </Card>
    </div>
  )
}
