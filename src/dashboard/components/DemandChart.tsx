import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatUsd, formatUsdCompact } from '@/lib/format'
import type { DemandPoint } from '@/data/types'

export function DemandChart({ data }: { data: DemandPoint[] }) {
  return (
    <div className="h-[230px]" role="img" aria-label="Average daily sales by weekday compared with model potential">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 4, bottom: 0, left: 0 }} barGap={3}>
          <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
          <XAxis dataKey="day" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink-faint)' }} />
          <YAxis tickLine={false} axisLine={false} width={44} tick={{ fontSize: 12, fill: 'var(--color-ink-faint)' }} tickFormatter={formatUsdCompact} />
          <Tooltip
            cursor={{ fill: 'var(--color-sunken)' }}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-pop)', fontSize: 13 }}
            formatter={(v, n) => [formatUsd(Number(v)), n === 'actual' ? 'Actual' : 'Potential']}
          />
          <Bar dataKey="potential" fill="var(--color-accent-soft)" stroke="var(--color-accent-bright)" strokeDasharray="3 3" radius={[4, 4, 0, 0]} />
          <Bar dataKey="actual" fill="var(--color-accent)" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
