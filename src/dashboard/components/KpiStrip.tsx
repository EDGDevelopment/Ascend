import { formatPercent, formatUsd } from '@/lib/format'
import type { Kpi } from '@/data/types'

interface KpiStripProps {
  kpis: Kpi[]
  openValue: number
  openCount: number
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
export function KpiStrip({ kpis, openValue, openCount }: KpiStripProps) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-card border border-line bg-line-soft lg:grid-cols-4 [&>div]:bg-surface">
      {kpis.map((k) => {
        const rising = k.change >= 0
        const good = k.inverse ? !rising : rising
        return (
          <Stat
            key={k.key}
            label={k.label}
            value={formatUsd(k.value)}
            note={`${formatPercent(k.change)} vs last month`}
            tone={good ? 'good' : 'bad'}
          />
        )
      })}
      <Stat label="Open opportunities" value={formatUsd(openValue)} note={`${openCount} findings per month`} />
    </dl>
  )
}
