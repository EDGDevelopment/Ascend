import { useState } from 'react'
import type { OrgType } from '@/valuation/engine'
import { downloadTemplate } from '@/valuation/spreadsheet'
import { useUpload } from '@/valuation/useUpload'
import { UploadCard } from './UploadCard'

const TYPES: { id: OrgType; label: string; blurb: string }[] = [
  { id: 'local', label: 'Local business', blurb: 'Shop, café, salon, trades, studio' },
  { id: 'nonprofit', label: 'Non-profit', blurb: 'Charity, club, community group' },
]

/** The first thing a new client sees: pick the kind of organisation and upload a spreadsheet. Nothing else shows until they do. */
export function UploadPrompt({ title = 'Upload your data to get started', hint = 'Ascend only shows figures from your own spreadsheet. Add your monthly revenue (and spending, if you have it) and your forecast appears in a few seconds.' }: { title?: string; hint?: string }) {
  const [orgType, setOrgType] = useState<OrgType>('local')
  const { upload, message, busy } = useUpload()

  return (
    <div className="mx-auto max-w-[720px] space-y-6 py-4">
      <div>
        <h2 className="text-xl font-semibold tracking-tight">{title}</h2>
        <p className="mt-1 text-[15px] text-ink-muted">{hint}</p>
      </div>
      <div role="radiogroup" aria-label="What kind of organisation is this?" className="grid gap-3 sm:grid-cols-2">
        {TYPES.map((t) => {
          const on = orgType === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => setOrgType(t.id)}
              className={`relative overflow-hidden rounded-card border p-4 text-left transition-colors ${on ? 'border-accent-bright bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'}`}
            >
              {on && <span aria-hidden="true" className="ramp-bg absolute inset-x-0 top-0 h-1" />}
              <span className={`block text-base font-semibold ${on ? 'text-accent-ink' : ''}`}>{t.label}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{t.blurb}</span>
            </button>
          )
        })}
      </div>
      <UploadCard onFile={(f) => void upload(f, orgType)} onTemplate={() => void downloadTemplate(orgType)} message={message} busy={busy} />
      <p className="text-xs text-ink-faint">At least 12 months in a row; two years or more gives much better forecasts. Non-profits need spending for every month.</p>
    </div>
  )
}
