import type { Impact, OpportunityStatus, SourceStatus } from '@/data/types'

const tone = {
  good: 'bg-accent-soft text-accent-ink',
  warn: 'bg-warn-soft text-warn',
  bad: 'bg-down-soft text-down',
  neutral: 'bg-sunken text-ink-muted',
}

function Pill({ tone: t, children }: { tone: keyof typeof tone; children: string }) {
  return <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tone[t]}`}>{children}</span>
}

export function ImpactBadge({ impact }: { impact: Impact }) {
  return <Pill tone={impact === 'High' ? 'good' : impact === 'Medium' ? 'warn' : 'neutral'}>{`${impact} impact`}</Pill>
}

export function StatusBadge({ status }: { status: OpportunityStatus }) {
  return <Pill tone={status === 'Done' ? 'neutral' : status === 'Reviewing' ? 'warn' : 'good'}>{status}</Pill>
}

export function SourceBadge({ status }: { status: SourceStatus }) {
  return <Pill tone={status === 'Healthy' ? 'good' : status === 'Syncing' ? 'warn' : 'bad'}>{status}</Pill>
}
