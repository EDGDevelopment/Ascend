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
  above: { text: 'Ahead of the forecast', cls: 'bg-accent-soft text-accent-ink' },
  'in-line': { text: 'In line with the forecast', cls: 'bg-warn-soft text-warn' },
  below: { text: 'Behind the forecast', cls: 'bg-down-soft text-down' },
}

function GoalCard({ goal, monthly }: { goal: Goal; monthly: { month: string; revenue: number }[] }) {
  const { setGoalStatus, removeGoal } = useValuation()
  const readOnly = useReadOnly()
  const r = useMemo(() => scoreGoal(goal, monthly), [goal, monthly])
  const v = VERDICT[r.verdict]
  const open = goal.status === 'active'

  return (
    <li className={`py-5 first:pt-0 last:pb-0 ${open ? '' : 'opacity-70'}`}>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
        <h3 className="text-[15px] font-semibold">{goal.title}</h3>
        {goal.targetPct !== null && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">Aim: {goal.targetPct > 0 ? '+' : ''}{goal.targetPct}% revenue</span>}
        {goal.status !== 'active' && <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-muted">{goal.status === 'done' ? 'Done' : 'Dropped'}</span>}
      </div>
      {goal.note && <p className="mt-1 text-sm text-ink-muted">{goal.note}</p>}
      <p className="mt-1 text-xs text-ink-faint">Started counting {monthLabel(goal.startMonth)}. Compared with the forecast made on {new Date(goal.createdAt).toLocaleDateString()}.</p>

      <div className="mt-3 flex flex-wrap items-center gap-3 text-sm">
        <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${v.cls}`}>{v.text}</span>
        {r.months === 0 ? (
          <span className="text-ink-muted">No real months since the start yet. Add each new month and run the forecast again.</span>
        ) : (
          <span className="tabular text-ink-muted">
            {r.months} month{r.months === 1 ? '' : 's'}: <span className="font-semibold text-ink">{formatUsd(r.actual)}</span> against {formatUsd(r.expected)} expected
            {r.lift !== null && <> ({signed(r.lift)})</>}
            {r.targetMet !== null && <> · {r.targetMet ? 'target reached' : 'target not reached yet'}</>}
          </span>
        )}
      </div>
      {r.months > 0 && r.months < MIN_MONTHS && <p className="mt-1.5 text-xs text-ink-faint">Needs {MIN_MONTHS} months before this means much.</p>}

      {!readOnly && (
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-[13px] font-medium">
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
        <Card title="Track a change" subtitle="Pick something you are about to do. Ascend freezes today's forecast, then compares real months against it." explain="How does the goal tracker judge whether a change worked, and what can it not tell me?">
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
            You can also track a move straight from your <Link to="/dashboard/opportunities" className="font-medium text-accent-ink hover:underline">growth plan</Link>.
          </p>
        </Card>
      )}

      <Card title="Your goals" subtitle="Real revenue since each goal started, against what the forecast expected if nothing changed.">
        {goals.length === 0 ? (
          <p className="text-[15px] text-ink-muted">No goals yet.</p>
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
