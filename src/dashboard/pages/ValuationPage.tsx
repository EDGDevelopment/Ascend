import { useState } from 'react'
import { AlertTriangle, ChevronDown, Play } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Field } from '@/components/ui/Field'
import { defaultInput } from '@/valuation/defaults'
import type { ModelInput, OrgType } from '@/valuation/engine'
import { downloadTemplate, parseSpreadsheet } from '@/valuation/spreadsheet'
import { useValuation } from '@/valuation/useValuation'
import { monthLabel } from '@/data/useDashboardData'
import { Card } from '../components/Card'
import { Alerts } from '../valuation/Alerts'
import { BreakEven } from '../valuation/BreakEven'
import { CashSafety } from '../valuation/CashSafety'
import { Customers } from '../valuation/Customers'
import { Tabs, type TabDef } from '../valuation/Tabs'
import { WhatIf } from '../valuation/WhatIf'
import { ForecastNotes, ForecastStage } from '../valuation/ForecastPanel'
import { LocalHero, NonprofitHero } from '../valuation/Hero'
import { Insights } from '../valuation/Insights'
import { LocalMore, LocalQuestions } from '../valuation/LocalInputs'
import { LocalDetails } from '../valuation/LocalResults'
import { MonthlyTable } from '../valuation/MonthlyTable'
import { NonprofitMore, NonprofitQuestions } from '../valuation/NonprofitInputs'
import { NonprofitCashStage, NonprofitDetails } from '../valuation/NonprofitResults'
import { Step } from '../valuation/Step'
import { UploadCard } from '../valuation/UploadCard'

const TYPES: { id: OrgType; label: string; blurb: string }[] = [
  { id: 'local', label: 'Local business', blurb: 'Shop, café, salon, trades, studio' },
  { id: 'nonprofit', label: 'Non-profit', blurb: 'Charity, club, community group' },
]

const LOCAL_TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', hint: 'Forecast and value' },
  { id: 'whatif', label: 'What if', hint: 'Try a change' },
  { id: 'breakeven', label: 'Break-even', hint: 'How much to sell' },
  { id: 'cash', label: 'Cash safety', hint: 'Will cash last?' },
  { id: 'alerts', label: 'Alerts', hint: 'Unusual months' },
  { id: 'customers', label: 'Customers', hint: 'Worth winning?' },
  { id: 'details', label: 'Details', hint: 'How it was worked out' },
]
const NONPROFIT_TABS: TabDef[] = [
  { id: 'overview', label: 'Overview', hint: 'Money and forecast' },
  { id: 'whatif', label: 'What if', hint: 'Try a change' },
  { id: 'alerts', label: 'Alerts', hint: 'Unusual months' },
  { id: 'details', label: 'Details', hint: 'How it was worked out' },
]

/** A native disclosure styled to match the page. Closed by default so the page stays short. */
function More({ title, hint, children }: { title: string; hint?: string; children: React.ReactNode }) {
  return (
    <details className="group mt-5 rounded-card border border-line bg-surface">
      <summary className="flex cursor-pointer list-none items-center justify-between gap-3 rounded-card px-5 py-4 has-[:focus-visible]:ring-2 [&::-webkit-details-marker]:hidden">
        <span>
          <span className="block text-[15px] font-semibold">{title}</span>
          {hint && <span className="block text-[13px] text-ink-muted">{hint}</span>}
        </span>
        <ChevronDown size={18} aria-hidden="true" className="shrink-0 text-ink-muted transition-transform group-open:rotate-180" />
      </summary>
      <div className="border-t border-line-soft p-5">{children}</div>
    </details>
  )
}

export default function ValuationPage() {
  const { input, output, source, running, error, saveWarning, loadId, setInput, replaceInput, run } = useValuation()
  const [fileMessage, setFileMessage] = useState<{ text: string; bad?: boolean } | null>(null)
  const [tab, setTab] = useState('overview')

  async function onFile(file: File | undefined) {
    if (!file) return
    try {
      const parsed = await parseSpreadsheet(file)
      if (parsed.monthly.length < 12) {
        setFileMessage({ text: parsed.warnings[0] ?? `Found ${parsed.monthly.length} usable months. Ascend needs at least 12.`, bad: true })
        return
      }
      const next: ModelInput = {
        ...input,
        orgType: parsed.orgType ?? input.orgType,
        companyName: parsed.companyName ?? input.companyName,
        monthly: parsed.monthly,
        // Anything the file leaves out keeps its current value, so a CSV only replaces the months.
        local: { ...input.local, ...parsed.local },
        nonprofit: { ...input.nonprofit, ...parsed.nonprofit, mix: { ...input.nonprofit.mix, ...parsed.nonprofit.mix } },
      }
      replaceInput(next)
      const details = Object.keys(parsed.local).length + Object.keys(parsed.nonprofit).length
      setFileMessage({ text: `Loaded ${parsed.monthly.length} months from ${file.name}${details ? ` and ${details} details` : ''}.${parsed.warnings.length ? ` ${parsed.warnings.join(' ')}` : ''}` })
    } catch (e) {
      setFileMessage({ text: e instanceof Error ? e.message : 'That file could not be read.', bad: true })
    }
  }

  const rows = input.monthly
  const isSample = JSON.stringify(rows) === JSON.stringify(defaultInput().monthly)
  const summary = `${rows.length} months loaded, ${monthLabel(rows[0].month)} to ${monthLabel(rows[rows.length - 1].month)}${rows.every((r) => r.expenses !== undefined) ? ', with expenses' : ', revenue only'}.`

  const current = output && output.input.orgType === input.orgType ? output : null
  const stale = current !== null && JSON.stringify(current.input) !== JSON.stringify(input)

  return (
    <div className="mx-auto max-w-[1040px] space-y-10">
      <div role="radiogroup" aria-label="What kind of organisation is this?" className="grid gap-3 sm:grid-cols-2">
        {TYPES.map((t) => {
          const on = input.orgType === t.id
          return (
            <button
              key={t.id}
              type="button"
              role="radio"
              aria-checked={on}
              onClick={() => {
                if (on) return
                setInput({ ...input, orgType: t.id })
                setTab('overview')
              }}
              className={`relative overflow-hidden rounded-card border p-4 text-left transition-colors ${on ? 'border-accent-bright bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'}`}
            >
              {on && <span aria-hidden="true" className="ramp-bg absolute inset-x-0 top-0 h-1" />}
              <span className={`block text-base font-semibold ${on ? 'text-accent-ink' : ''}`}>{t.label}</span>
              <span className="mt-0.5 block text-sm text-ink-muted">{t.blurb}</span>
            </button>
          )
        })}
      </div>

      <Step n={1} title="Add your months" hint="Revenue for each month, and spending if you have it. Two years or more gives the best forecast.">
        <UploadCard onFile={(f) => void onFile(f)} onTemplate={() => void downloadTemplate(input.orgType)} message={fileMessage} isSample={isSample} summary={summary} />
        <More title="Review or edit your months" hint="Type over any figure, or add and remove months.">
          <MonthlyTable input={input} loadId={loadId} setInput={setInput} replaceInput={replaceInput} />
        </More>
      </Step>

      <Step n={2} title={input.orgType === 'local' ? 'A few quick questions' : 'One quick question'} hint="Anything you skip gets a sensible default.">
        <div className="max-w-md pb-5">
          <Field label={input.orgType === 'nonprofit' ? 'Organisation name' : 'Business name'} value={input.companyName} onChange={(e) => setInput({ ...input, companyName: e.target.value })} placeholder="Shown on your dashboards" />
        </div>
        {input.orgType === 'local' ? <LocalQuestions input={input} loadId={loadId} setInput={setInput} /> : <NonprofitQuestions input={input} loadId={loadId} setInput={setInput} replaceInput={replaceInput} />}
        <More title="More detail" hint="Optional. Makes the answer sharper if you know these.">
          {input.orgType === 'local' ? <LocalMore input={input} loadId={loadId} setInput={setInput} /> : <NonprofitMore input={input} loadId={loadId} setInput={setInput} replaceInput={replaceInput} />}
        </More>
      </Step>

      <Step n={3} title="See your forecast">
        <div className="flex flex-wrap items-center gap-4">
          <Button size="lg" className="ramp-bg !text-[#0b1310] shadow-none hover:brightness-110" onClick={() => void run()} disabled={running}>
            <Play size={18} aria-hidden="true" /> {running ? 'Working it out...' : current ? 'Run again' : 'Show my forecast'}
          </Button>
          {stale && !running && <span className="text-sm text-warn">You changed something. Run again to update.</span>}
          {current && !stale && !running && (
            <span className="text-sm text-ink-muted">Saved. Your dashboards now use these figures{source ? ` (worked out ${source === 'server' ? 'on the server' : 'in your browser'})` : ''}.</span>
          )}
        </div>
        {error && (
          <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg border border-line bg-down-soft px-4 py-3 text-sm text-down">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" aria-hidden="true" /> {error}
          </p>
        )}
        {saveWarning && !error && <p role="status" className="mt-3 text-sm text-warn">Worked out, but not saved to your account yet ({saveWarning}). It is kept in this browser.</p>}
      </Step>

      {current && (() => {
        const tabs = current.input.orgType === 'local' ? LOCAL_TABS : NONPROFIT_TABS
        const active = tabs.some((t) => t.id === tab) ? tab : 'overview'
        return (
          <div className={stale ? 'opacity-60' : ''} aria-live="polite">
            <Tabs tabs={tabs} active={active} onChange={setTab} label="Your toolkit">
              {active === 'overview' && (
                <div className="space-y-6">
                  {current.input.orgType === 'local' ? <LocalHero output={current} /> : <NonprofitHero output={current} />}
                  {current.input.orgType === 'local' ? <ForecastStage output={current} /> : <NonprofitCashStage output={current} />}
                  <Insights output={current} />
                </div>
              )}
              {active === 'whatif' && <WhatIf output={current} />}
              {active === 'breakeven' && <BreakEven output={current} />}
              {active === 'cash' && <CashSafety output={current} />}
              {active === 'alerts' && <Alerts output={current} />}
              {active === 'customers' && <Customers />}
              {active === 'details' && (
                <div className="space-y-8 rounded-card border border-line bg-surface p-5">
                  {current.input.orgType === 'local' ? <LocalDetails output={current} /> : <NonprofitDetails output={current} />}
                  {current.input.orgType === 'nonprofit' && (
                    <Card title="Income and spending forecast"><ForecastStage output={current} /></Card>
                  )}
                  <ForecastNotes output={current} />
                </div>
              )}
            </Tabs>
            <p className="mt-6 text-xs text-ink-muted">
              An estimate built only from the figures you entered, not financial or legal advice. Forecasts assume the future behaves like your past; a new competitor, a lost contract or a one-off event will not be in them.
            </p>
          </div>
        )
      })()}
    </div>
  )
}
