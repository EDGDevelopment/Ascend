import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'
import { formatUsd } from '@/lib/format'
import type { Opportunity } from '@/data/types'
import { ImpactBadge, StatusBadge } from './Badges'

interface OpportunityRowProps {
  item: Opportunity
  expanded?: boolean
  onToggle?: () => void
  /** Compact rows are a single line: title, area and value. Used on the overview. */
  compact?: boolean
  children?: ReactNode
}

export function OpportunityRow({ item, expanded = false, onToggle, compact = false, children }: OpportunityRowProps) {
  if (compact) {
    return (
      <div className="flex items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
        <div className="min-w-0">
          <p className="truncate text-[15px] font-medium">{item.title}</p>
          <p className="text-[13px] text-ink-faint">
            {item.area} · {Math.round(item.confidence * 100)}% confidence
          </p>
        </div>
        <p className="tabular shrink-0 text-[15px] font-semibold text-accent">{formatUsd(item.monthlyValue)}/mo</p>
      </div>
    )
  }

  return (
    <div className="rounded-card border border-line bg-surface">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="flex w-full items-start justify-between gap-4 rounded-card p-5 text-left">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <ImpactBadge impact={item.impact} />
            <StatusBadge status={item.status} />
            <span className="text-xs text-ink-faint">{item.area}</span>
          </div>
          <h3 className="mt-2 text-[15px] font-semibold leading-snug">{item.title}</h3>
          <p className="mt-1 text-[13.5px] text-ink-muted">{item.summary}</p>
        </div>
        <div className="flex shrink-0 items-start gap-3">
          <div className="text-right">
            <p className="tabular text-[15px] font-semibold text-accent">{formatUsd(item.monthlyValue)}/mo</p>
            <p className="tabular mt-0.5 text-xs text-ink-faint">{Math.round(item.confidence * 100)}% confidence</p>
          </div>
          <ChevronDown size={18} aria-hidden="true" className={`mt-0.5 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`} />
        </div>
      </button>
      {expanded && (
        <div className="border-t border-line-soft px-5 pb-5 pt-4">
          <p className="text-sm text-ink-soft">{item.detail}</p>
          {children}
        </div>
      )}
    </div>
  )
}
