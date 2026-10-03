import { useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowRight, Sparkles } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { useDashboardData } from '@/data/useDashboardData'
import type { MetricKey } from '@/data/types'
import { formatUsd } from '@/lib/format'
import { ActivityFeed } from '../components/ActivityFeed'
import { Card } from '../components/Card'
import { DemandChart } from '../components/DemandChart'
import { ForecastChart } from '../components/ForecastChart'
import { HealthCard } from '../components/HealthCard'
import { KpiCard } from '../components/KpiCard'
import { MetricTabs } from '../components/MetricTabs'
import { metricLabels } from '@/data/metrics'
import { OpportunityRow } from '../components/OpportunityRow'

export default function OverviewPage() {
  const data = useDashboardData()
  const { user } = useAuth()
  const [metric, setMetric] = useState<MetricKey>('revenue')

  const points = data.series[metric]
  const end = points[points.length - 1]
  const open = data.opportunities.filter((o) => o.status !== 'Done')
  const openValue = open.reduce((sum, o) => sum + o.monthlyValue, 0)
  const firstName = user?.fullName?.split(' ')[0]

  return (
    <div className="mx-auto max-w-[1280px] space-y-6">
      <div className="rise">
        <p className="eyebrow">{data.business.name}</p>
        <h2 className="mt-1 text-2xl font-semibold tracking-tight sm:text-[1.75rem]">
          {firstName ? `Good to see you, ${firstName}.` : 'Welcome back.'} Here is what changed.
        </h2>
        <p className="mt-1.5 text-sm text-ink-muted">
          September 2026 overview for a {data.business.industry.toLowerCase()} business in {data.business.location}.
        </p>
      </div>

      <div className="rise grid gap-4 [animation-delay:60ms] sm:grid-cols-2 xl:grid-cols-4">
        {data.kpis.map((k) => (
          <KpiCard key={k.key} kpi={k} />
        ))}
        <div className="rounded-card border border-accent/25 bg-accent-soft/60 p-5 shadow-card">
          <p className="flex items-center gap-1.5 text-[13px] font-medium text-accent-strong">
            <Sparkles size={14} /> Growth opportunities
          </p>
          <p className="tabular mt-2 text-[1.75rem] font-semibold leading-none tracking-tight">{formatUsd(openValue)}</p>
          <p className="mt-3 text-[13px] text-ink-muted">
            estimated monthly value across {open.length} open findings
          </p>
        </div>
      </div>

      <div className="rise grid gap-6 [animation-delay:120ms] xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title={`${metricLabels[metric]}, actual and forecast`}
          subtitle={`Next 90 days projected to ${formatUsd(end.forecast ?? 0)} by ${end.month}, range ${formatUsd(end.low ?? 0)} to ${formatUsd(end.high ?? 0)}`}
          action={<MetricTabs value={metric} onChange={setMetric} />}
        >
          <ForecastChart points={points} />
          <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-ink-faint">
            <span className="inline-flex items-center gap-1.5"><i className="h-0.5 w-5 rounded bg-accent" /> Actual</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-0 w-5 border-t-2 border-dashed border-accent-bright" /> Forecast</span>
            <span className="inline-flex items-center gap-1.5"><i className="h-3 w-5 rounded-sm bg-accent-bright/20" /> Confidence range</span>
          </div>
        </Card>
        <HealthCard score={data.healthScore} change={data.healthChange} factors={data.healthFactors} />
      </div>

      <div className="rise grid gap-6 [animation-delay:180ms] xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Top opportunities"
          subtitle="Ranked by estimated impact"
          action={
            <Link to="/dashboard/opportunities" className="inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
              View all <ArrowRight size={14} />
            </Link>
          }
        >
          <div className="divide-y divide-line-soft">
            {open.slice(0, 3).map((o) => (
              <OpportunityRow key={o.id} item={o} compact />
            ))}
          </div>
        </Card>
        <Card title="Recent activity" subtitle="Model and data events">
          <ActivityFeed items={data.activity} />
        </Card>
      </div>

      <div className="rise grid gap-6 [animation-delay:240ms] xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          title="Weekday demand versus potential"
          subtitle="Average daily sales against what the model expects you can reach"
        >
          <DemandChart data={data.demand} />
        </Card>
        <Card title="Model" subtitle={data.model.name}>
          <dl className="space-y-3 text-[13.5px]">
            {[
              ['Version', data.model.version],
              ['Architecture', data.model.architecture],
              ['Context window', `${data.model.contextMonths} months`],
              ['Forecast horizon', `${data.model.horizonDays} days`],
              ['Last trained', data.model.lastTrained],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-3 last:border-0 last:pb-0">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
          <Link to="/dashboard/model" className="mt-4 inline-flex items-center gap-1 text-[13px] font-medium text-accent hover:underline">
            Model details <ArrowRight size={14} />
          </Link>
        </Card>
      </div>
    </div>
  )
}
