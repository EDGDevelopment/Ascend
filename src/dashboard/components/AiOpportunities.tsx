import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, MessageCircle, RefreshCw, Sparkles, Target } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { askAscend } from '@/chat/chatBus'
import { AiError } from '@/chat/functionClient'
import { generatePlan, loadPlan, savePlan, type Opportunity, type SavedPlan } from '@/chat/opportunitiesService'
import { buildDigest } from '../../../supabase/functions/_shared/chat/digest'
import { useValuation } from '@/valuation/useValuation'
import { Card } from './Card'

const EFFORT: Record<Opportunity['effort'], { label: string; cls: string }> = {
  low: { label: 'Quick win', cls: 'bg-accent-soft text-accent-ink' },
  medium: { label: 'Some effort', cls: 'bg-warn-soft text-warn' },
  high: { label: 'Bigger project', cls: 'bg-down-soft text-down' },
}

const when = (iso: string) => new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })

/** A ranked growth plan written by the AI from the open spreadsheet's own figures and results. */
export function AiOpportunities() {
  const { active, output, addGoal } = useValuation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const datasetId = active?.id ?? null

  const [plan, setPlan] = useState<SavedPlan | null>(null)
  const [tracked, setTracked] = useState<Set<string>>(new Set())
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  // Which user and spreadsheet the plan on screen belongs to, so switching spreadsheets swaps in the right one.
  const [shownFor, setShownFor] = useState('')
  const abort = useRef<AbortController | null>(null)

  const scope = userId && datasetId ? `${userId}:${datasetId}` : ''
  if (shownFor !== scope) {
    setShownFor(scope)
    setPlan(userId && datasetId ? loadPlan(userId, datasetId) : null)
    setError(null)
  }

  useEffect(() => () => abort.current?.abort(), [])

  const context = useMemo(() => (active ? buildDigest([active], active.id) : ''), [active])

  async function write() {
    if (!userId || !datasetId || !output || loading) return
    abort.current?.abort()
    const ctl = new AbortController()
    abort.current = ctl
    setLoading(true)
    setError(null)
    try {
      const next = await generatePlan(context, output.computedAt, ctl.signal)
      if (ctl.signal.aborted) return
      setPlan(next)
      savePlan(userId, datasetId, next)
    } catch (e) {
      if (!ctl.signal.aborted) setError(e instanceof AiError ? e.message : 'The growth plan could not be written. Try again.')
    } finally {
      if (!ctl.signal.aborted) setLoading(false)
    }
  }

  const stale = plan !== null && output !== null && plan.basedOn !== output.computedAt

  return (
    <Card
      title="Your AI growth plan"
      subtitle="Specific ideas written from your own numbers, biggest first. Each one shows the figures behind it."
      action={
        plan ? (
          <button
            type="button"
            onClick={() => void write()}
            disabled={loading}
            className="inline-flex items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-ink disabled:opacity-50"
          >
            <RefreshCw size={14} aria-hidden="true" className={loading ? 'animate-spin' : ''} />
            {loading ? 'Writing…' : 'Write a new plan'}
          </button>
        ) : undefined
      }
    >
      {!plan && !loading && (
        <div className="flex flex-col items-start gap-3">
          <p className="max-w-[56ch] text-sm text-ink-muted">
            The assistant reads your months, forecast and results, then lists the moves that look most worthwhile for <span className="font-medium text-ink">{active?.name ?? 'your business'}</span>, with a first step for each.
          </p>
          <button
            type="button"
            onClick={() => void write()}
            className="inline-flex items-center gap-2 rounded-full bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-accent-strong"
          >
            <Sparkles size={16} aria-hidden="true" />
            Write my growth plan
          </button>
        </div>
      )}

      {loading && !plan && (
        <div role="status" className="space-y-3" aria-label="Writing your growth plan">
          <p className="text-sm text-ink-muted">Reading your numbers and writing your plan. This takes about 10 seconds.</p>
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-lg bg-sunken" />
          ))}
        </div>
      )}

      {error && (
        <p role="alert" className="mt-3 rounded-lg bg-down-soft px-3 py-2 text-sm text-down">
          {error}
        </p>
      )}

      {plan && (
        <>
          {stale && <p className="mb-4 rounded-lg bg-warn-soft px-3 py-2 text-sm text-warn">Your numbers have changed since this plan was written. Write a new plan to bring it up to date.</p>}
          <ol className="divide-y divide-line-soft">
            {plan.items.map((o, i) => (
              <li key={`${i}-${o.title}`} className={`py-5 first:pt-0 last:pb-0 ${loading ? 'opacity-50' : ''}`}>
                <div className="flex items-start gap-3">
                  <span aria-hidden="true" className="mt-0.5 grid size-7 shrink-0 place-items-center rounded-full bg-accent-soft text-[13px] font-semibold text-accent-ink">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                      <h3 className="text-[15px] font-semibold">{o.title}</h3>
                      <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">{o.category}</span>
                      <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${EFFORT[o.effort].cls}`}>{EFFORT[o.effort].label}</span>
                    </div>
                    <p className="mt-1.5 text-sm leading-relaxed">{o.why}</p>
                    {o.evidence && (
                      <p className="mt-2.5 rounded-lg bg-sunken px-3 py-2 text-[13px] leading-relaxed text-ink-soft">
                        <span className="font-semibold">Your numbers: </span>
                        {o.evidence}
                      </p>
                    )}
                    <dl className="mt-2.5 space-y-1 text-sm">
                      {o.impact && (
                        <div>
                          <dt className="inline font-semibold">What it could be worth: </dt>
                          <dd className="inline text-ink-muted">{o.impact}</dd>
                        </div>
                      )}
                      {o.firstStep && (
                        <div>
                          <dt className="inline font-semibold">Start this week: </dt>
                          <dd className="inline text-ink-muted">{o.firstStep}</dd>
                        </div>
                      )}
                    </dl>
                    <button
                      type="button"
                      onClick={() => askAscend(`Tell me more about this opportunity and how I would go about it, using my numbers: "${o.title}".`)}
                      className="mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline"
                    >
                      <MessageCircle size={14} aria-hidden="true" />
                      Ask about this
                    </button>
                    {tracked.has(o.title) || (active?.goals ?? []).some((g) => g.title === o.title) ? (
                      <Link to="/dashboard/growth/goals" className="ml-4 mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-ink-muted hover:underline">
                        <Check size={14} aria-hidden="true" />
                        Tracking this goal
                      </Link>
                    ) : (
                      <button
                        type="button"
                        onClick={() => addGoal({ title: o.title, note: o.firstStep, source: 'plan' }) && setTracked((t) => new Set(t).add(o.title))}
                        className="ml-4 mt-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-accent-ink hover:underline"
                      >
                        <Target size={14} aria-hidden="true" />
                        Track as a goal
                      </button>
                    )}
                  </div>
                </div>
              </li>
            ))}
          </ol>
          <p className="mt-5 text-xs text-ink-faint">
            Written by AI on {when(plan.generatedAt)} from your spreadsheet. Check the figures against your data. This is a starting point, not financial advice.
          </p>
        </>
      )}
    </Card>
  )
}
