import type { MetricKey } from '@/data/types'
import { metricLabels } from '@/data/metrics'

export function MetricTabs({ value, onChange }: { value: MetricKey; onChange: (m: MetricKey) => void }) {
  return (
    <div role="tablist" aria-label="Metric" className="inline-flex rounded-lg bg-sunken p-1">
      {(Object.keys(metricLabels) as MetricKey[]).map((m) => (
        <button
          key={m}
          role="tab"
          type="button"
          aria-selected={value === m}
          onClick={() => onChange(m)}
          className={`rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
            value === m ? 'bg-surface text-ink shadow-sm' : 'text-ink-muted hover:text-ink'
          }`}
        >
          {metricLabels[m]}
        </button>
      ))}
    </div>
  )
}
