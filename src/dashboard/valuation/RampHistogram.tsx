import { outcomeColor } from './ramp'

interface Bin { from: number; to: number; count: number }

/** Distribution of simulated outcomes, each bar colored by where it sits from worst to best. */
export function RampHistogram({ bins, format, marks, ariaLabel }: { bins: Bin[]; format: (n: number) => string; marks?: { label: string; value: number; color: string }[]; ariaLabel: string }) {
  const W = 560
  const H = 200
  const m = { top: 22, bottom: 22, left: 6, right: 6 }
  const max = Math.max(...bins.map((b) => b.count), 1)
  const lo = bins[0].from
  const hi = bins[bins.length - 1].to
  const bw = (W - m.left - m.right) / bins.length
  const x = (v: number) => m.left + ((v - lo) / (hi - lo || 1)) * (W - m.left - m.right)
  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-auto w-full min-w-[420px]" role="img" aria-label={ariaLabel} fontFamily="inherit">
        {bins.map((b, i) => (
          <rect key={i} x={m.left + i * bw + 1} y={H - m.bottom - (b.count / max) * (H - m.top - m.bottom)} width={bw - 2} height={(b.count / max) * (H - m.top - m.bottom)} rx="2" style={{ fill: outcomeColor((i + 0.5) / bins.length) }} />
        ))}
        {marks?.map((k) => (
          <g key={k.label}>
            <line x1={x(k.value)} x2={x(k.value)} y1={m.top - 4} y2={H - m.bottom} strokeDasharray="3 3" strokeWidth="1.5" style={{ stroke: k.color }} />
            <text x={x(k.value)} y={12} textAnchor="middle" fontSize="11" fontWeight="600" style={{ fill: k.color }}>{k.label}</text>
          </g>
        ))}
        {[lo, (lo + hi) / 2, hi].map((v, i) => (
          <text key={i} x={i === 0 ? m.left : i === 2 ? W - m.right : W / 2} y={H - 6} textAnchor={i === 0 ? 'start' : i === 2 ? 'end' : 'middle'} fontSize="11" style={{ fill: 'var(--color-ink-faint)' }}>{format(v)}</text>
        ))}
      </svg>
    </div>
  )
}
