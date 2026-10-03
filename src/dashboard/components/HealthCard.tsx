import { Card } from './Card'
import type { HealthFactor } from '@/data/types'

export function HealthCard({ score, change, factors }: { score: number; change: number; factors: HealthFactor[] }) {
  return (
    <Card title="Business health">
      <p className="flex items-baseline gap-2">
        <span className="tabular text-5xl font-semibold leading-none tracking-tight text-accent-ink">{score}</span>
        <span className="text-sm text-ink-faint">/ 100</span>
        <span className="tabular ml-auto text-[13px] font-medium text-up">+{change} this month</span>
      </p>
      <ul className="mt-6 space-y-3.5">
        {factors.map((f) => (
          <li key={f.name} title={f.note}>
            <div className="flex items-baseline justify-between text-[13px]">
              <span className="text-ink-soft">{f.name}</span>
              <span className="tabular font-semibold">{f.score}</span>
            </div>
            <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-sunken" role="presentation">
              <div className="h-full rounded-full bg-accent-bright" style={{ width: `${f.score}%` }} />
            </div>
          </li>
        ))}
      </ul>
    </Card>
  )
}
