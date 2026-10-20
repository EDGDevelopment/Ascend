import { useEffect, useRef, useState } from 'react'
import { monthLabel } from '@/data/useDashboardData'
import { outcomeColor, OUTCOME } from './ramp'

interface FanChartProps {
  /** Simulated futures, each the same length as `futureMonths`. */
  paths: number[][]
  futureMonths: string[]
  /** Optional actual history drawn before "now", oldest first. */
  history?: { months: string[]; values: number[] }
  /** Where the fan starts. Defaults to the last history value. */
  startValue?: number
  /** The central forecast, one value per future month. */
  median: number[]
  format: (n: number) => string
  /** Label for the pills, e.g. "Best" and "Cautious". */
  ariaLabel: string
}

const W = 760
const H = 340
const M = { top: 12, right: 8, bottom: 26, left: 52 }
const PLOT_R = 540
const DIST = { x0: 548, x1: 640 }
const PILL_X = 648

const quantile = (sorted: number[], q: number) => sorted[Math.min(sorted.length - 1, Math.max(0, Math.round((sorted.length - 1) * q)))]

/**
 * The simulated futures as a fan of thin lines, each colored by how its year turns out, with the median
 * on top and the spread of year-end outcomes along the right edge.
 */
export function FanChart({ paths, futureMonths, history, startValue, median, format, ariaLabel }: FanChartProps) {
  // On a narrow screen drop the side distribution and labels (the numbers below the chart say the same) so the fan fits.
  const box = useRef<HTMLDivElement>(null)
  const [narrow, setNarrow] = useState(false)
  useEffect(() => {
    const el = box.current
    if (!el || typeof ResizeObserver === 'undefined') return
    const ro = new ResizeObserver(([e]) => setNarrow(e.contentRect.width < 600))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])
  const h = history?.values ?? []
  const nHist = h.length
  const nFut = futureMonths.length
  const x0 = nHist > 0 ? nHist - 1 : 0
  const start = startValue ?? (nHist > 0 ? h[nHist - 1] : paths[0][0])
  const xTotal = x0 + nFut
  const x = (i: number) => M.left + (i / xTotal) * (PLOT_R - M.left)

  const finals = paths.map((p) => p[nFut - 1]).sort((a, b) => a - b)
  const lo = Math.min(...h, start, quantile(finals, 0.01), ...median)
  const hi = Math.max(...h, start, quantile(finals, 0.99), ...median)
  const pad = (hi - lo || Math.abs(hi) || 1) * 0.06
  const yMin = lo - pad
  const yMax = hi + pad
  const y = (v: number) => M.top + (1 - (v - yMin) / (yMax - yMin)) * (H - M.top - M.bottom)

  // Color follows each path's rank by year-end value. They are drawn in their original (random) order so no color hides another.
  const order = paths.map((p, i) => ({ v: p[nFut - 1], i })).sort((a, b) => a.v - b.v)
  const rankOf = new Map(order.map((o, r) => [o.i, r]))
  const d = (p: number[]) => `M${x(x0)},${y(start)} ` + p.map((v, k) => `L${x(x0 + k + 1)},${y(v)}`).join(' ')

  // Distribution of year-end values along the right edge.
  const BINS = 26
  const binH = (H - M.top - M.bottom) / BINS
  const counts = new Array<number>(BINS).fill(0)
  for (const v of finals) {
    const b = Math.min(BINS - 1, Math.max(0, Math.floor(((yMax - v) / (yMax - yMin)) * BINS)))
    counts[b]++
  }
  const maxCount = Math.max(...counts, 1)

  const pillsRaw = [
    { key: 'best', label: 'P90', value: quantile(finals, 0.9), color: OUTCOME.best },
    { key: 'mid', label: 'Median', value: median[nFut - 1], color: 'var(--color-ink)' },
    { key: 'low', label: 'P10', value: quantile(finals, 0.1), color: OUTCOME.worst },
  ].sort((a, b) => y(a.value) - y(b.value))
  // Nudge apart so labels never overlap.
  const pills = pillsRaw.map((p) => ({ ...p, py: y(p.value) }))
  for (let i = 1; i < pills.length; i++) if (pills[i].py - pills[i - 1].py < 22) pills[i].py = pills[i - 1].py + 22

  const ticks = Array.from({ length: 5 }, (_, k) => yMin + ((yMax - yMin) * k) / 4)
  const labelEvery = Math.ceil((nHist + nFut) / 8)
  const allMonths = [...(history?.months ?? []), ...futureMonths]
  const xLabels = allMonths.map((m, i) => ({ m, i: nHist > 0 ? i : i + 1 })).filter((_, i) => i % labelEvery === 0)

  return (
    <div ref={box}>
      <svg viewBox={`0 0 ${narrow ? PLOT_R + 16 : W} ${H}`} className="block h-auto w-full" role="img" aria-label={ariaLabel} fontFamily="inherit">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={M.left} x2={PLOT_R} y1={y(t)} y2={y(t)} style={{ stroke: 'var(--color-line-soft)' }} />
            <text x={M.left - 8} y={y(t) + 4} textAnchor="end" fontSize="11" style={{ fill: 'var(--color-ink-faint)' }}>{format(t)}</text>
          </g>
        ))}
        {yMin < 0 && yMax > 0 && <line x1={M.left} x2={PLOT_R} y1={y(0)} y2={y(0)} strokeDasharray="4 4" style={{ stroke: 'var(--color-down)' }} />}

        {paths.map((p, i) => (
          <path key={i} d={d(p)} fill="none" strokeWidth="1" strokeLinejoin="round" opacity="0.55" className="fan-line" style={{ stroke: outcomeColor((rankOf.get(i) ?? 0) / Math.max(1, paths.length - 1)), ["--i" as string]: i }} />
        ))}

        {nHist > 1 && <path d={h.map((v, k) => `${k === 0 ? 'M' : 'L'}${x(k)},${y(v)}`).join(' ')} fill="none" strokeWidth="2.25" strokeLinejoin="round" style={{ stroke: 'var(--color-ink-soft)' }} />}
        <path d={`M${x(x0)},${y(start)} ` + median.map((v, k) => `L${x(x0 + k + 1)},${y(v)}`).join(' ')} fill="none" strokeWidth="2.75" strokeLinejoin="round" strokeLinecap="round" style={{ stroke: 'var(--color-ink)' }} />
        <circle cx={x(x0)} cy={y(start)} r="3.5" style={{ fill: 'var(--color-surface)', stroke: 'var(--color-ink)' }} strokeWidth="2" />

        <line x1={x(x0)} x2={x(x0)} y1={M.top} y2={H - M.bottom} strokeDasharray="3 4" style={{ stroke: 'var(--color-ink-faint)' }} />
        <text x={x(x0) - 6} y={M.top + 10} textAnchor="end" fontSize="11" style={{ fill: 'var(--color-ink-faint)' }}>Now</text>
        {xLabels.map(({ m, i }) => (
          <text key={m} x={x(i)} y={H - 8} textAnchor="middle" fontSize="11" style={{ fill: 'var(--color-ink-faint)' }}>{monthLabel(m)}</text>
        ))}

        {!narrow && (<>
        <g aria-hidden="true">
          {counts.map((c, b) => (
            <rect key={b} x={DIST.x0} y={M.top + b * binH + 0.5} width={Math.max(c > 0 ? 2 : 0, (c / maxCount) * (DIST.x1 - DIST.x0))} height={binH - 1} rx="1.5" style={{ fill: outcomeColor(1 - (b + 0.5) / BINS) }} />
          ))}
        </g>

        {pills.map((p) => (
          <g key={p.key}>
            <rect x={PILL_X} y={p.py - 10} width={104} height={20} rx="10" style={{ fill: 'var(--color-surface)', stroke: p.color }} strokeWidth="1.25" />
            <text x={PILL_X + 10} y={p.py + 4} fontSize="11" fontWeight="600" style={{ fill: p.color }}>{p.label}</text>
            <text x={PILL_X + 96} y={p.py + 4} fontSize="11" textAnchor="end" className="tabular" style={{ fill: 'var(--color-ink)' }}>{format(p.value)}</text>
          </g>
        ))}
        </>)}
      </svg>
    </div>
  )
}
