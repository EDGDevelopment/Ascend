import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Download, Pencil, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthLabel } from '@/data/useDashboardData'
import { toCsv, type Dataset } from '@/valuation/datasets'
import { downloadTemplate } from '@/valuation/spreadsheet'
import { useUpload } from '@/valuation/useUpload'
import { useValuation } from '@/valuation/useValuation'
import { Card } from '../components/Card'
import { NeedsData } from '../components/NeedsData'
import { UploadCard } from '../valuation/UploadCard'
import { UploadPrompt } from '../valuation/UploadPrompt'

function download(d: Dataset) {
  const url = URL.createObjectURL(new Blob([toCsv(d.input)], { type: 'text/csv' }))
  const a = document.createElement('a')
  a.href = url
  a.download = `${d.name.replace(/[^\w.-]+/g, '-') || 'data'}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function Row({ d, isActive }: { d: Dataset; isActive: boolean }) {
  const { selectDataset, renameDataset, deleteDataset } = useValuation()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(d.name)
  const [confirming, setConfirming] = useState(false)
  const rows = d.input.monthly
  const range = rows.length ? `${monthLabel(rows[0].month)} to ${monthLabel(rows[rows.length - 1].month)}` : 'no months'

  function commit() {
    renameDataset(d.id, name)
    setEditing(false)
  }

  return (
    <li className={`px-5 py-4 ${isActive ? 'bg-accent-soft/50' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          {editing ? (
            <form onSubmit={(e) => { e.preventDefault(); commit() }} className="flex items-center gap-2">
              <input aria-label="Dataset name" autoFocus value={name} onChange={(e) => setName(e.target.value)} onKeyDown={(e) => e.key === 'Escape' && (setName(d.name), setEditing(false))} className="h-9 w-64 max-w-full rounded-lg border border-line bg-surface px-3 text-[15px]" />
              <Button type="submit" size="sm" variant="secondary"><Check size={14} aria-hidden="true" /> Save</Button>
            </form>
          ) : (
            <p className="flex flex-wrap items-center gap-2 text-[15px] font-semibold">
              <span className="truncate">{d.name}</span>
              {isActive && <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-ink">In use</span>}
              {!d.output && <span className="rounded-full bg-warn-soft px-2 py-0.5 text-xs font-medium text-warn">Not worked out yet</span>}
            </p>
          )}
          <p className="mt-0.5 text-[13px] text-ink-muted">
            {d.input.orgType === 'nonprofit' ? 'Non-profit' : 'Local business'} · {rows.length} months, {range} · {rows.every((r) => r.expenses !== undefined) ? 'with expenses' : 'revenue only'}
          </p>
          <p className="mt-0.5 text-xs text-ink-faint">
            {d.fileName ? `${d.fileName} · ` : ''}Added {new Date(d.createdAt).toLocaleDateString()}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!isActive && <Button size="sm" variant="secondary" onClick={() => selectDataset(d.id)}>Use this</Button>}
          <Button size="sm" variant="secondary" onClick={() => { setName(d.name); setEditing(true) }} aria-label={`Rename ${d.name}`}><Pencil size={14} aria-hidden="true" /> Rename</Button>
          <Button size="sm" variant="secondary" onClick={() => download(d)} aria-label={`Download ${d.name} as CSV`}><Download size={14} aria-hidden="true" /> CSV</Button>
          {confirming ? (
            <>
              <Button size="sm" onClick={() => deleteDataset(d.id)} className="!bg-down !text-white">Delete for good</Button>
              <Button size="sm" variant="secondary" onClick={() => setConfirming(false)}>Keep it</Button>
            </>
          ) : (
            <Button size="sm" variant="secondary" onClick={() => setConfirming(true)} aria-label={`Delete ${d.name}`}><Trash2 size={14} aria-hidden="true" /> Delete</Button>
          )}
        </div>
      </div>
    </li>
  )
}

export default function DataSourcesPage() {
  const { ready, datasets, active, saveWarning, error, input } = useValuation()
  const { upload, message, busy } = useUpload()

  if (!ready) return <NeedsData />
  if (datasets.length === 0) return <UploadPrompt hint="Your uploaded spreadsheets are listed here, where you can rename, switch between, download or delete them. Upload your first one to begin." />

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Card title="Add another spreadsheet" subtitle="It is added to your list and becomes the one the dashboards use.">
        <UploadCard onFile={(f) => void upload(f, input.orgType)} onTemplate={() => void downloadTemplate(input.orgType)} message={message} busy={busy} />
      </Card>

      {error && (
        <p role="alert" className="rounded-lg border border-line bg-down-soft px-4 py-3 text-sm text-down">
          {active?.name ?? 'Your spreadsheet'} was added but its forecast could not be worked out: {error}{' '}
          <Link to="/dashboard/valuation" className="font-medium underline">Fix it on the Financial model page</Link>.
        </p>
      )}

      <Card title="Your spreadsheets" subtitle="The dashboards show whichever one is marked In use." padded={false}>
        <ul className="mt-3 divide-y divide-line-soft border-t border-line-soft">
          {datasets.map((d) => (
            <Row key={d.id} d={d} isActive={d.id === active?.id} />
          ))}
        </ul>
      </Card>
      {saveWarning && <p role="status" className="text-sm text-warn">Not saved to your account yet ({saveWarning}). Your spreadsheets are kept in this browser.</p>}
      <p className="text-sm text-ink-muted">
        To correct figures or change details for the one in use, open the <Link to="/dashboard/valuation" className="font-medium text-accent-ink hover:underline">Financial model</Link> page.
      </p>
    </div>
  )
}
