import { TrendingDown, TrendingUp } from 'lucide-react'
import { formatPercent, formatUsd } from '@/lib/format'
import type { Kpi } from '@/data/types'
import { Sparkline } from './Sparkline'

export function KpiCard({ kpi }: { kpi: Kpi }) {
  const rising = kpi.change >= 0
  const good = kpi.inverse ? !rising : rising
  const Icon = rising ? TrendingUp : TrendingDown

  return (
    <div className="rounded-card border border-line bg-surface p-5 shadow-card">
      <p className="text-[13px] font-medium text-ink-muted">{kpi.label}</p>
      <div className="mt-2 flex items-end justify-between gap-3">
        <p className="tabular text-[1.75rem] font-semibold leading-none tracking-tight">{formatUsd(kpi.value)}</p>
        <Sparkline values={kpi.spark} />
      </div>
      <p className={`mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium ${good ? 'text-up' : 'text-down'}`}>
        <Icon size={14} />
        {formatPercent(kpi.change)}
        <span className="font-normal text-ink-faint">vs last month</span>
      </p>
    </div>
  )
}
