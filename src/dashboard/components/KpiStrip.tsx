import { formatPercent, formatUsd } from '@/lib/format'
import type { Kpi } from '@/data/types'

interface KpiStripProps {
  kpis: Kpi[]
  /** Expected revenue over the next 12 months. */
  next12: number
  /** Expected growth over the next 12 months versus the last 12, as a decimal. */
  growth: number
}

function Stat({ label, value, note, tone }: { label: string; value: string; note: string; tone?: 'good' | 'bad' }) {
  const color = tone === 'good' ? 'text-up' : tone === 'bad' ? 'text-down' : 'text-ink-faint'
  return (
    <div className="px-5 py-4">
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="tabular mt-1 text-2xl font-semibold tracking-tight">{value}</dd>
      <dd className={`tabular mt-0.5 text-[13px] font-medium ${color}`}>{note}</dd>
    </div>
  )
}

/** One flat strip of headline figures instead of a row of separate cards. */
export function KpiStrip({ kpis, next12, growth }: KpiStripProps) {
  return (
    <dl className={`grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line-soft [&>div]:bg-surface ${kpis.length > 1 ? 'lg:grid-cols-4' : 'lg:grid-cols-2'}`}>
      {kpis.map((k) => {
        const rising = k.change >= 0
        const good = k.inverse ? !rising : rising
        return <Stat key={k.key} label={`${k.label} last month`} value={formatUsd(k.value)} note={`${formatPercent(k.change)} vs the month before`} tone={good ? 'good' : 'bad'} />
      })}
      <Stat label="Revenue, next 12 months" value={formatUsd(Math.round(next12))} note={`${formatPercent(growth * 100)} vs the last 12`} tone={growth >= 0 ? 'good' : 'bad'} />
    </dl>
  )
}
