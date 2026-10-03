import { Database, LineChart, Radar, Sparkles } from 'lucide-react'
import type { ActivityItem } from '@/data/types'

const icons = { forecast: LineChart, signal: Radar, data: Database, opportunity: Sparkles }

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map(({ id, kind, text, time }) => {
        const Icon = icons[kind]
        return (
          <li key={id} className="flex gap-3">
            <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-accent-soft text-accent">
              <Icon size={15} />
            </span>
            <div className="min-w-0">
              <p className="text-[13.5px] leading-snug text-ink-soft">{text}</p>
              <p className="mt-0.5 text-xs text-ink-faint">{time}</p>
            </div>
          </li>
        )
      })}
    </ul>
  )
}
