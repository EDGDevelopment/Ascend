import { useState } from 'react'
import { Check } from 'lucide-react'
import { useDashboardData } from '@/data/useDashboardData'
import type { OpportunityStatus } from '@/data/types'
import { formatUsd } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { OpportunityRow } from '../components/OpportunityRow'

const filters: ('All' | OpportunityStatus)[] = ['All', 'New', 'Reviewing', 'Done']

export default function OpportunitiesPage() {
  const data = useDashboardData()
  // Status changes live in component state only. They will move to Supabase later.
  const [statuses, setStatuses] = useState<Record<string, OpportunityStatus>>(
    () => Object.fromEntries(data.opportunities.map((o) => [o.id, o.status])),
  )
  const [filter, setFilter] = useState<(typeof filters)[number]>('All')
  const [openId, setOpenId] = useState<string | null>(data.opportunities[0]?.id ?? null)

  const items = data.opportunities
    .map((o) => ({ ...o, status: statuses[o.id] ?? o.status }))
    .filter((o) => filter === 'All' || o.status === filter)
  const total = items.filter((o) => o.status !== 'Done').reduce((s, o) => s + o.monthlyValue, 0)

  return (
    <div className="mx-auto max-w-[960px] space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Findings the model translated into actions. Each one is sized by estimated monthly value and the model's
          confidence in the pattern behind it.
        </p>
        <div className="text-right">
          <p className="tabular text-2xl font-semibold text-accent">{formatUsd(total)}</p>
          <p className="text-xs text-ink-faint">open value per month</p>
        </div>
      </div>

      <div role="tablist" aria-label="Filter by status" className="inline-flex rounded-lg bg-sunken p-1">
        {filters.map((f) => (
          <button
            key={f}
            role="tab"
            type="button"
            aria-selected={filter === f}
            onClick={() => setFilter(f)}
            className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
              filter === f ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="space-y-3">
        {items.length === 0 && (
          <p className="rounded-card border border-dashed border-line p-8 text-center text-sm text-ink-faint">
            Nothing here yet.
          </p>
        )}
        {items.map((o) => (
          <OpportunityRow key={o.id} item={o} expanded={openId === o.id} onToggle={() => setOpenId(openId === o.id ? null : o.id)}>
            <div className="mt-4 flex flex-wrap gap-2">
              {o.status !== 'Reviewing' && o.status !== 'Done' && (
                <Button size="sm" onClick={() => setStatuses((s) => ({ ...s, [o.id]: 'Reviewing' }))}>
                  Start review
                </Button>
              )}
              {o.status !== 'Done' ? (
                <Button size="sm" variant="secondary" onClick={() => setStatuses((s) => ({ ...s, [o.id]: 'Done' }))}>
                  <Check size={14} /> Mark done
                </Button>
              ) : (
                <Button size="sm" variant="secondary" onClick={() => setStatuses((s) => ({ ...s, [o.id]: 'New' }))}>
                  Reopen
                </Button>
              )}
            </div>
          </OpportunityRow>
        ))}
      </div>
    </div>
  )
}
