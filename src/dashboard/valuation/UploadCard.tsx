import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthLabel } from '@/data/useDashboardData'
import type { UploadReview } from '@/valuation/useUpload'

interface Props {
  onFile: (file: File | undefined) => void
  onTemplate: () => void
  message: { text: string; bad?: boolean } | null
  busy?: boolean
  /** Shown under the card when there is no message. */
  summary?: string
  /** A file that looks like an update to a saved business, waiting for the owner's choice. */
  review?: UploadReview
}

/** Drag a spreadsheet here, or click to browse. Works with the keyboard: the file input is real and focusable. */
export function UploadCard({ onFile, onTemplate, message, busy, summary, review }: Props) {
  const [over, setOver] = useState(false)
  const p = review?.pending ?? null
  return (
    <div>
      {p && review && (
        <div role="alertdialog" aria-label="Update an existing business?" className="mb-3 rounded-card border border-accent-bright bg-accent-soft px-5 py-4">
          <h3 className="text-[15px] font-semibold">This looks like a newer copy of {p.matchName}</h3>
          {p.merge.error ? (
            <p className="mt-1 text-sm text-down">It cannot be joined to what you have saved. {p.merge.error}</p>
          ) : (
            <p className="mt-1 text-sm text-ink-muted">
              {p.fileName} adds <span className="font-semibold text-ink">{p.merge.added} new month{p.merge.added === 1 ? '' : 's'}</span> (now through {monthLabel(p.merge.monthly[p.merge.monthly.length - 1].month)})
              {p.merge.changed > 0 && <> and corrects {p.merge.changed} you already had</>}. Updating keeps its forecast history, track record and goals, so last time's forecast can be checked against the new months.
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-2">
            {!p.merge.error && <Button size="sm" onClick={() => void review.choose('update')}>Update {p.matchName}</Button>}
            <Button size="sm" variant="secondary" onClick={() => void review.choose('new')}>Add as a separate business</Button>
            <Button size="sm" variant="ghost" onClick={review.cancel}>Cancel</Button>
          </div>
        </div>
      )}
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]) }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-5 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-bright ${over ? 'border-accent-bright bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'}`}
      >
        <span aria-hidden="true" className="ramp-bg grid size-11 place-items-center rounded-full text-[#0b1310]"><FileSpreadsheet size={22} /></span>
        <span className="text-base font-semibold">{busy ? 'Reading your spreadsheet and working out the forecast...' : 'Drop your spreadsheet here, or click to choose a file'}</span>
        <span className="text-sm text-ink-muted">Excel (.xlsx) or CSV. One row per month, with revenue and, if you can, expenses.</span>
        <input type="file" accept=".xlsx,.csv" disabled={busy || !!p} className="sr-only" aria-label="Upload a spreadsheet" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
      </label>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <Button variant="secondary" size="sm" onClick={onTemplate}>
          <Download size={14} aria-hidden="true" /> Get the Excel template
        </Button>
      </div>
      <p role="status" className={`mt-2 text-sm ${message?.bad ? 'text-down' : 'text-ink-muted'}`}>{message?.text ?? summary}</p>
    </div>
  )
}
