import { Area, CartesianGrid, ComposedChart, Line, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { formatUsd, formatUsdCompact } from '@/lib/format'
import type { SeriesPoint } from '@/data/types'

interface ForecastChartProps {
  points: SeriesPoint[]
  height?: number
  /** Multiplies forecast values, used by the scenario slider on the Forecasts page. */
  scenario?: number
}

export function ForecastChart({ points, height = 300, scenario = 1 }: ForecastChartProps) {
  const adjusted = points.map((p) =>
    p.actual !== null
      ? { ...p, band: null as [number, number] | null }
      : {
          ...p,
          forecast: p.forecast !== null ? Math.round(p.forecast * scenario) : null,
          band: p.low !== null && p.high !== null ? ([Math.round(p.low * scenario), Math.round(p.high * scenario)] as [number, number]) : null,
        },
  )
  // The last actual point also carries the forecast anchor so the lines join.
  const firstForecast = adjusted.find((p) => p.actual === null)?.month

  return (
    <div style={{ height }} role="img" aria-label="Chart of actual values followed by a forecast with a confidence range">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart data={adjusted} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
          <XAxis dataKey="month" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink-faint)' }} interval={2} />
          <YAxis tickLine={false} axisLine={false} width={52} tick={{ fontSize: 12, fill: 'var(--color-ink-faint)' }} tickFormatter={formatUsdCompact} domain={['dataMin - 2000', 'dataMax + 2000']} />
          <Tooltip
            cursor={{ stroke: 'var(--color-line)' }}
            contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-pop)', fontSize: 13 }}
            formatter={(value, name) => {
              if (name === 'band' && Array.isArray(value)) return [`${formatUsd(value[0])} to ${formatUsd(value[1])}`, 'Range']
              return [formatUsd(Number(value)), name === 'actual' ? 'Actual' : 'Forecast']
            }}
          />
          <Area dataKey="band" stroke="none" fill="var(--color-accent-bright)" fillOpacity={0.16} connectNulls isAnimationActive={false} />
          <Line dataKey="actual" stroke="var(--color-accent)" strokeWidth={2.5} dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          <Line dataKey="forecast" stroke="var(--color-accent-bright)" strokeWidth={2.5} strokeDasharray="6 5" dot={false} activeDot={{ r: 4 }} connectNulls={false} isAnimationActive={false} />
          {firstForecast && <ReferenceLine x={firstForecast} stroke="var(--color-ink-faint)" strokeDasharray="3 4" />}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  )
}
