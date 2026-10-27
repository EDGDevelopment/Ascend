import { useState } from 'react'
import { Download, FileSpreadsheet } from 'lucide-react'
import { Button } from '@/components/ui/Button'

interface Props {
  onFile: (file: File | undefined) => void
  onTemplate: () => void
  message: { text: string; bad?: boolean } | null
  busy?: boolean
  /** Shown under the card when there is no message. */
  summary?: string
}

/** Drag a spreadsheet here, or click to browse. Works with the keyboard: the file input is real and focusable. */
export function UploadCard({ onFile, onTemplate, message, busy, summary }: Props) {
  const [over, setOver] = useState(false)
  return (
    <div>
      <label
        onDragOver={(e) => { e.preventDefault(); setOver(true) }}
        onDragLeave={() => setOver(false)}
        onDrop={(e) => { e.preventDefault(); setOver(false); onFile(e.dataTransfer.files?.[0]) }}
        className={`flex cursor-pointer flex-col items-center gap-2 rounded-card border-2 border-dashed px-5 py-8 text-center transition-colors has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent-bright ${over ? 'border-accent-bright bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'}`}
      >
        <span aria-hidden="true" className="ramp-bg grid size-11 place-items-center rounded-full text-[#0b1310]"><FileSpreadsheet size={22} /></span>
        <span className="text-base font-semibold">{busy ? 'Reading your spreadsheet and working out the forecast...' : 'Drop your spreadsheet here, or click to choose a file'}</span>
        <span className="text-sm text-ink-muted">Excel (.xlsx) or CSV. One row per month, with revenue and, if you can, expenses.</span>
        <input type="file" accept=".xlsx,.csv" disabled={busy} className="sr-only" aria-label="Upload a spreadsheet" onChange={(e) => { onFile(e.target.files?.[0]); e.target.value = '' }} />
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
