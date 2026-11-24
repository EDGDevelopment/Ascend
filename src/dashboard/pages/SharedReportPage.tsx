import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Printer } from 'lucide-react'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'
import { Button } from '@/components/ui/Button'
import { fetchShared } from '@/share/shares'
import type { Dataset } from '@/valuation/datasets'
import { ValuationContext, type ValuationState } from '@/valuation/ValuationContext'
import { ReadOnlyContext } from '../readOnly'
import ForecastsPage from './ForecastsPage'
import FundingPage from './FundingPage'
import GoalsPage from './GoalsPage'
import OverviewPage from './OverviewPage'
import TrackRecordPage from './TrackRecordPage'

const TABS = [
  { id: 'overview', label: 'Overview', page: OverviewPage },
  { id: 'forecasts', label: 'Forecasts', page: ForecastsPage },
  { id: 'funding', label: 'Funding snapshot', page: FundingPage },
  { id: 'track', label: 'Track record', page: TrackRecordPage },
  { id: 'goals', label: 'Goals', page: GoalsPage },
]

const noop = () => undefined

/** Read-only view of a shared report. The same pages as the dashboard, fed from the frozen copy instead of the signed-in library. */
export default function SharedReportPage() {
  const { token = '' } = useParams()
  const [dataset, setDataset] = useState<Dataset | null | undefined>(undefined)
  const [tab, setTab] = useState('overview')

  useEffect(() => {
    let live = true
    void fetchShared(token).then((d) => live && setDataset(d))
    return () => {
      live = false
    }
  }, [token])

  const value = useMemo<ValuationState | null>(() => {
    if (!dataset) return null
    return {
      ready: true,
      datasets: [dataset],
      active: dataset,
      input: dataset.input,
      output: dataset.output,
      source: null,
      running: false,
      error: null,
      saveWarning: null,
      loadId: 0,
      setInput: noop,
      replaceInput: noop,
      run: async () => undefined,
      addDataset: async () => undefined,
      updateDataset: async () => undefined,
      selectDataset: noop,
      renameDataset: noop,
      deleteDataset: noop,
      addGoal: () => false,
      setGoalStatus: noop,
      removeGoal: noop,
    }
  }, [dataset])

  const Page = TABS.find((t) => t.id === tab)?.page ?? OverviewPage

  return (
    <div className="min-h-screen">
      <header className="flex h-16 items-center gap-3 border-b border-line-soft bg-page px-4 sm:px-8 print:hidden">
        <Logo to="/" />
        <span className="ml-auto rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-muted">Read-only</span>
        <Button variant="secondary" size="sm" onClick={() => window.print()}>
          <Printer size={15} aria-hidden="true" /> Print or PDF
        </Button>
        <ThemeToggle />
      </header>

      {dataset === undefined && <p role="status" className="py-16 text-center text-sm text-ink-muted">Loading the report...</p>}

      {dataset === null && (
        <div className="mx-auto max-w-[520px] px-4 py-20 text-center">
          <h1 className="text-xl font-semibold tracking-tight">This link is not available</h1>
          <p className="mt-2 text-[15px] text-ink-muted">It may have expired or been switched off by whoever shared it. Ask them for a new one.</p>
        </div>
      )}

      {value && dataset && (
        <ValuationContext.Provider value={value}>
          <ReadOnlyContext.Provider value={true}>
            <div className="px-4 pt-4 sm:px-8 print:hidden">
              <div className="mx-auto max-w-[960px]">
                <h1 className="text-lg font-semibold tracking-tight">{dataset.input.companyName.trim() || dataset.name}</h1>
                <p className="text-[13px] text-ink-faint">Figures as of {new Date(dataset.updatedAt).toLocaleDateString()}. A snapshot shared by the owner: it does not update.</p>
                <nav aria-label="Report sections" className="mt-3 flex flex-wrap gap-1.5">
                  {TABS.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTab(t.id)}
                      aria-current={tab === t.id ? 'page' : undefined}
                      className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${tab === t.id ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink'}`}
                    >
                      {t.label}
                    </button>
                  ))}
                </nav>
              </div>
            </div>
            <main className="px-4 py-6 sm:px-8">
              <Page />
            </main>
          </ReadOnlyContext.Provider>
        </ValuationContext.Provider>
      )}
    </div>
  )
}
