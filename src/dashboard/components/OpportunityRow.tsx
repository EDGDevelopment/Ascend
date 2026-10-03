import { ChevronDown } from 'lucide-react'
import { formatUsd } from '@/lib/format'
import type { Opportunity } from '@/data/types'
import { ImpactBadge, StatusBadge } from './Badges'

interface OpportunityRowProps {
  item: Opportunity
  expanded?: boolean
  onToggle?: () => void
  /** Compact rows omit the toggle and detail, for use on the overview. */
  compact?: boolean
  children?: React.ReactNode
}

export function OpportunityRow({ item, expanded = false, onToggle, compact = false, children }: OpportunityRowProps) {
  const body = (
    <div className="flex w-full items-start justify-between gap-4 text-left">
      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-2">
          <ImpactBadge impact={item.impact} />
          {!compact && <StatusBadge status={item.status} />}
          <span className="text-xs text-ink-faint">{item.area}</span>
        </div>
        <h3 className="mt-2 text-[15px] font-semibold leading-snug">{item.title}</h3>
        <p className="mt-1 text-[13.5px] leading-relaxed text-ink-muted">{item.summary}</p>
      </div>
      <div className="flex shrink-0 items-start gap-3">
        <div className="text-right">
          <p className="tabular text-[15px] font-semibold text-accent">{formatUsd(item.monthlyValue)}</p>
          <p className="text-xs text-ink-faint">per month</p>
          <p className="mt-1.5 text-xs text-ink-faint">{Math.round(item.confidence * 100)}% confidence</p>
        </div>
        {!compact && (
          <ChevronDown size={18} className={`mt-0.5 text-ink-faint transition-transform ${expanded ? 'rotate-180' : ''}`} />
        )}
      </div>
    </div>
  )

  if (compact) return <div className="py-4 first:pt-0 last:pb-0">{body}</div>

  return (
    <div className="rounded-card border border-line bg-surface shadow-card">
      <button type="button" onClick={onToggle} aria-expanded={expanded} className="w-full rounded-card p-5">
        {body}
      </button>
      {expanded && (
        <div className="border-t border-line-soft px-5 pb-5 pt-4">
          <p className="text-sm leading-relaxed text-ink-soft">{item.detail}</p>
          {children}
        </div>
      )}
    </div>
  )
}
