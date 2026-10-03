import { Card } from './Card'
import type { HealthFactor } from '@/data/types'

function Ring({ score }: { score: number }) {
  const r = 52
  const c = 2 * Math.PI * r
  return (
    <div className="relative h-32 w-32 shrink-0">
      <svg viewBox="0 0 128 128" className="h-full w-full -rotate-90" aria-hidden="true">
        <circle cx="64" cy="64" r={r} fill="none" stroke="var(--color-sunken)" strokeWidth="11" />
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke="var(--color-accent)"
          strokeWidth="11"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c * (1 - score / 100)}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-center">
        <div>
          <p className="tabular text-3xl font-semibold leading-none">{score}</p>
          <p className="mt-1 text-[11px] text-ink-faint">of 100</p>
        </div>
      </div>
    </div>
  )
}

export function HealthCard({ score, change, factors }: { score: number; change: number; factors: HealthFactor[] }) {
  return (
    <Card title="Business health" subtitle={`Up ${change} points since last month`}>
      <div className="flex flex-col gap-6">
        <div role="img" aria-label={`Health score ${score} out of 100`} className="mx-auto">
          <Ring score={score} />
        </div>
        <ul className="flex-1 space-y-3.5">
          {factors.map((f) => (
            <li key={f.name}>
              <div className="flex items-baseline justify-between text-[13px]">
                <span className="font-medium text-ink-soft">{f.name}</span>
                <span className="tabular font-semibold">{f.score}</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken">
                <div className="h-full rounded-full bg-accent-bright" style={{ width: `${f.score}%` }} />
              </div>
              <p className="mt-1 text-xs text-ink-faint">{f.note}</p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  )
}
