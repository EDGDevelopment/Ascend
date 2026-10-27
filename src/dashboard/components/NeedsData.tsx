import { Link } from 'react-router-dom'
import { AlertTriangle, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { useValuation } from '@/valuation/useValuation'
import { UploadPrompt } from '../valuation/UploadPrompt'

/**
 * Shown by every dashboard page in place of its content until the client has uploaded a spreadsheet and the
 * forecast has been worked out from it.
 */
export function NeedsData() {
  const { ready, datasets, active, running, error, run } = useValuation()
  if (!ready) return <p role="status" className="py-10 text-center text-sm text-ink-muted">Loading your data...</p>
  if (datasets.length === 0) return <UploadPrompt />
  return (
    <div className="mx-auto max-w-[560px] space-y-4 py-10 text-center">
      <h2 className="text-xl font-semibold tracking-tight">{active ? `${active.name} has not been worked out yet` : 'Choose a spreadsheet to use'}</h2>
      {active ? (
        <>
          <p className="text-[15px] text-ink-muted">Your figures are saved. Work out the forecast to fill in this page.</p>
          <Button size="lg" onClick={() => void run()} disabled={running}>
            <Play size={18} aria-hidden="true" /> {running ? 'Working it out...' : 'Show my forecast'}
          </Button>
        </>
      ) : (
        <p className="text-[15px] text-ink-muted">Pick one of your uploads on the Your data page.</p>
      )}
      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-line bg-down-soft px-4 py-3 text-left text-sm text-down">
          <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> <span>{error} <Link to="/dashboard/valuation" className="font-medium underline">Fix it on the Financial model page</Link>.</span>
        </p>
      )}
      <p className="text-sm text-ink-muted">
        <Link to="/dashboard/data" className="font-medium text-accent-ink hover:underline">Manage your spreadsheets</Link>
        {' · '}
        <Link to="/dashboard/valuation" className="font-medium text-accent-ink hover:underline">Edit details</Link>
      </p>
    </div>
  )
}
