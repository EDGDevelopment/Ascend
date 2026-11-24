import { useMemo, useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import { Target } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { monthLabel } from '@/data/useDashboardData'
import { formatUsd } from '@/lib/format'
import { useValuation } from '@/valuation/useValuation'
import { MIN_MONTHS, scoreGoal, type Goal, type Verdict } from '../../../supabase/functions/_shared/valuation/goals'
import { Card } from '../components/Card'
import { NeedsData } from '../components/NeedsData'
import { useReadOnly } from '../readOnly'

const signed = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`

const VERDICT: Record<Verdict, { text: string; cls: string }> = {
  'too-early': { text: 'Too early to tell', cls: 'bg-sunken text-ink-muted' },
  above: { text: 'Running above forecast', cls: 'bg-accent-soft text-accent-ink' },
  'in-line': { text: 'Close to forecast', cls: 'bg-sunken text-ink-soft' },
  below: { text: 'Running below forecast', cls: 'bg-warn-soft text-warn' },
}

function Figure({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div>
      <dt className="text-xs text-ink-faint">{label}</dt>
      <dd className={`tabular mt-0.5 text-base font-semibold ${tone ?? ''}`}>{value}</dd>
    </div>
  )
}

function GoalCard({ goal, monthly }: { goal: Goal; monthly: { month: string; revenue: number }[] }) {
  const { setGoalStatus, removeGoal } = useValuation()
  const readOnly = useReadOnly()
  const r = useMemo(() => scoreGoal(goal, monthly), [goal, monthly])
  const v = VERDICT[r.verdict]
  const open = goal.status === 'active'

  return (
    <li className={`py-5 first:pt-0 last:pb-0 ${open ? '' : 'opacity-60'}`}>
      <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
        <div className="min-w-0">
          <h3 className="text-[15px] font-semibold leading-snug">{goal.title}</h3>
          <p className="mt-0.5 text-xs text-ink-faint">
            From {monthLabel(goal.startMonth)}
            {goal.targetPct !== null && <> · aiming for {goal.targetPct > 0 ? '+' : ''}{goal.targetPct}% revenue</>}
            {goal.status !== 'active' && <> · {goal.status === 'done' ? 'done' : 'dropped'}</>}
          </p>
        </div>
        <span className={`shrink-0 rounded-full px-2.5 py-1 text-xs font-medium ${v.cls}`}>{v.text}</span>
      </div>

      {goal.note && <p className="mt-2 text-sm text-ink-muted">{goal.note}</p>}

      {r.months === 0 ? (
        <p className="mt-3 rounded-lg bg-sunken px-3 py-2.5 text-sm text-ink-muted">No real months since the start yet. Add each new month, or upload your updated file, and this fills in.</p>
      ) : (
        <>
          <dl className="mt-3 grid grid-cols-2 gap-x-6 gap-y-3 rounded-lg bg-sunken px-4 py-3 sm:grid-cols-4">
            <Figure label={`Real, ${r.months} month${r.months === 1 ? '' : 's'}`} value={formatUsd(r.actual)} />
            <Figure label="Forecast expected" value={formatUsd(r.expected)} />
            <Figure label="Difference" value={r.lift === null ? 'n/a' : signed(r.lift)} tone={r.lift === null ? '' : r.lift >= 0 ? 'text-up' : 'text-down'} />
            <Figure label="Target" value={r.targetMet === null ? 'None set' : r.targetMet ? 'Reached' : 'Not yet'} tone={r.targetMet ? 'text-up' : ''} />
          </dl>
          {r.months < MIN_MONTHS && <p className="mt-1.5 text-xs text-ink-faint">Needs {MIN_MONTHS} months before this means much.</p>}
        </>
      )}

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium print:hidden">
          {open ? (
            <>
              <button type="button" onClick={() => setGoalStatus(goal.id, 'done')} className="text-accent-ink hover:underline">Mark done</button>
              <button type="button" onClick={() => setGoalStatus(goal.id, 'dropped')} className="text-ink-muted hover:underline">Drop</button>
            </>
          ) : (
            <button type="button" onClick={() => setGoalStatus(goal.id, 'active')} className="text-accent-ink hover:underline">Reopen</button>
          )}
          <button type="button" onClick={() => removeGoal(goal.id)} className="text-down hover:underline">Delete</button>
        </div>
      )}
    </li>
  )
}

export default function GoalsPage() {
  const { active, output, addGoal } = useValuation()
  const readOnly = useReadOnly()
  const [title, setTitle] = useState('')
  const [target, setTarget] = useState('')
  if (!active || !output) return <NeedsData />

  const goals = active.goals ?? []
  const monthly = active.input.monthly

  function submit(e: FormEvent) {
    e.preventDefault()
    const pct = target.trim() === '' ? null : Number(target)
    if (addGoal({ title, source: 'custom', targetPct: pct !== null && Number.isFinite(pct) ? pct : null })) {
      setTitle('')
      setTarget('')
    }
  }

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      {!readOnly && (
        <Card className="print:hidden" title="Track a change" subtitle="Pick something you are about to do. Ascend freezes today's forecast, then compares real months against it." explain="How does the goal tracker judge whether a change worked, and what can it not tell me?">
          <form onSubmit={submit} className="flex flex-wrap items-end gap-3">
            <label className="min-w-[220px] flex-1 text-sm">
              <span className="mb-1 block font-medium">What are you changing?</span>
              <input value={title} onChange={(e) => setTitle(e.target.value)} maxLength={120} placeholder="Raise prices by 5%" className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm" />
            </label>
            <label className="w-[170px] text-sm">
              <span className="mb-1 block font-medium">Revenue lift aimed for, %</span>
              <input value={target} onChange={(e) => setTarget(e.target.value)} inputMode="decimal" placeholder="optional" className="h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm" />
            </label>
            <Button type="submit" disabled={!title.trim()}>
              <Target size={16} aria-hidden="true" /> Start tracking
            </Button>
          </form>
          <p className="mt-3 text-xs text-ink-faint">
            You can also track a move straight from your <Link to="/dashboard/growth" className="font-medium text-accent-ink hover:underline">growth plan</Link>.
          </p>
        </Card>
      )}

      <Card title="Your goals" subtitle="Real revenue since each goal started, against what the forecast expected if nothing changed.">
        {goals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line px-4 py-8 text-center">
            <p className="text-[15px] font-medium">No goals yet</p>
            <p className="mx-auto mt-1 max-w-[44ch] text-sm text-ink-muted">Add a change above, or track a move from your growth plan. Ascend will show whether results move away from the forecast afterwards.</p>
          </div>
        ) : (
          <ul className="divide-y divide-line-soft">
            {goals.map((g) => (
              <GoalCard key={g.id} goal={g} monthly={monthly} />
            ))}
          </ul>
        )}
        <p className="mt-5 text-xs text-ink-faint">
          This shows whether results moved away from the forecast after you made the change. It cannot prove the change caused it: prices, weather, staff and the economy all move too.
        </p>
      </Card>
    </div>
  )
}
