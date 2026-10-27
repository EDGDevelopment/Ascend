import { useMemo, useState } from 'react'
import { RotateCcw } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { NO_CHANGE, evaluateScenario, nonprofitScenario, rankLevers, type Adjustments, type ModelOutput } from '@/valuation/engine'
import { Card } from '../components/Card'
import { NumberField } from '../components/NumberField'
import { OUTCOME } from './ramp'
import { Slider } from './Slider'
import { Stage } from './Stage'
import { short } from './format'

const signed = (n: number) => `${n >= 0 ? '+' : '-'}${short(Math.abs(n))}`
const pct = (v: number) => `${v > 0 ? '+' : ''}${Math.round(v * 100)}%`

function Big({ label, value, delta, color }: { label: string; value: string; delta: string; color: string }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="tabular mt-1 text-4xl font-semibold tracking-tight">{value}</dd>
      <dd className="tabular mt-0.5 text-base font-semibold" style={{ color }}>{delta}</dd>
    </div>
  )
}

/** Where to focus: the same ten per cent change on each lever, ranked. Bars use the ramp, longest first. */
function Levers({ output }: { output: ModelOutput }) {
  const levers = useMemo(() => rankLevers(output, output.tools.costs), [output])
  const key = (l: (typeof levers)[number]) => l.deltaValue ?? l.deltaProfit
  const max = Math.max(...levers.map((l) => Math.abs(key(l))), 1)
  return (
    <Card title="Where to focus first" subtitle="The effect of a 10% move in each lever, on its own. Biggest first.">
      <ul className="space-y-4">
        {levers.map((l, i) => (
          <li key={l.id}>
            <div className="flex flex-wrap items-baseline justify-between gap-x-4 text-sm">
              <span className="font-medium">{i + 1}. {l.label}</span>
              <span className="tabular text-ink-muted">profit {signed(l.deltaProfit)} a year{l.deltaValue !== null ? `, value ${signed(l.deltaValue)}` : ''}</span>
            </div>
            <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-sunken" aria-hidden="true">
              <div className="h-full rounded-full" style={{ width: `${Math.max(3, (Math.abs(key(l)) / max) * 100)}%`, background: i === 0 ? OUTCOME.best : i === 1 ? OUTCOME.good : i === 2 ? OUTCOME.caution : OUTCOME.worst }} />
            </div>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-xs text-ink-muted">Each lever is tested alone and assumes nothing else changes. Raising prices usually costs some customers, so try it together with the volume slider.</p>
    </Card>
  )
}

export function WhatIf({ output }: { output: ModelOutput }) {
  const [adj, setAdj] = useState<Adjustments>(NO_CHANGE)
  const set = (patch: Partial<Adjustments>) => setAdj((a) => ({ ...a, ...patch }))
  const [income, setIncome] = useState(0)
  const [spending, setSpending] = useState(0)
  const [oneOff, setOneOff] = useState(0)
  const changed = adj.price !== 0 || adj.volume !== 0 || adj.unitCost !== 0 || adj.fixedCost !== 0 || adj.oneOff !== 0

  const local = useMemo(() => (output.local ? evaluateScenario(output, adj, output.tools.costs) : null), [output, adj])
  const np = useMemo(() => (output.nonprofit ? nonprofitScenario(output, income, spending, oneOff) : null), [output, income, spending, oneOff])

  if (np) {
    const base = output.nonprofit!.cash.p50[11]
    const target = output.input.nonprofit.reserveTargetMonths
    return (
      <div className="space-y-6">
        <Stage title="What if your income or spending changed?" subtitle="Move the sliders and see what it does to your bank balance a year from now.">
          <div className="grid gap-6 lg:grid-cols-2">
            <div className="space-y-6">
              <Slider label="Income" value={income} min={-0.3} max={0.3} step={0.01} onChange={setIncome} format={pct} hint="A lost grant or a good fundraising year." />
              <Slider label="Spending" value={spending} min={-0.3} max={0.3} step={0.01} onChange={setSpending} format={pct} hint="A new hire, a cut, a price rise." />
              <div className="max-w-xs"><NumberField label="One-off spend this year" kind="num" hint="New equipment, a move, a one-time project." value={oneOff} onCommit={(v) => setOneOff(v ?? 0)} /></div>
            </div>
            <dl className="grid content-start gap-6 sm:grid-cols-2 lg:grid-cols-1">
              <Big label="Bank balance in 12 months" value={short(np.endCash)} delta={`${signed(np.endCash - base)} versus the forecast`} color={np.endCash - base >= 0 ? OUTCOME.good : OUTCOME.worst} />
              <Big label="Months of spending that covers" value={Number.isFinite(np.monthsOfCash) ? np.monthsOfCash.toFixed(1) : '24+'} delta={`target ${target}`} color={np.monthsOfCash >= target ? OUTCOME.good : OUTCOME.caution} />
            </dl>
          </div>
          <div className="mt-5"><Button variant="secondary" size="sm" onClick={() => { setIncome(0); setSpending(0); setOneOff(0) }} disabled={income === 0 && spending === 0 && oneOff === 0}><RotateCcw size={14} aria-hidden="true" /> Reset</Button></div>
        </Stage>
      </div>
    )
  }

  const L = local!
  return (
    <div className="space-y-6">
      <Stage title="What if you changed something?" subtitle="Move a slider and watch the next 12 months of profit, and what the business is worth, change. Nothing is saved.">
        <div className="grid gap-8 lg:grid-cols-2">
          <div className="space-y-6">
            <Slider label="Prices" value={adj.price} min={-0.2} max={0.2} step={0.01} onChange={(v) => set({ price: v })} format={pct} hint="What you charge for each sale." />
            <Slider label="Customers or units sold" value={adj.volume} min={-0.3} max={0.3} step={0.01} onChange={(v) => set({ volume: v })} format={pct} hint="More or fewer sales at today's prices." />
            <Slider label="Cost of each sale" value={adj.unitCost} min={-0.2} max={0.2} step={0.01} onChange={(v) => set({ unitCost: v })} format={pct} hint="Stock, ingredients, card fees, hourly staff." />
            <Slider label="Fixed costs" value={adj.fixedCost} min={-0.3} max={0.3} step={0.01} onChange={(v) => set({ fixedCost: v })} format={pct} hint="Rent, salaries, insurance: paid whatever you sell." />
            <div className="max-w-xs"><NumberField label="One-off spend this year" kind="num" hint="New equipment or a hire's set-up. Hits cash, not yearly profit." value={adj.oneOff} onCommit={(v) => set({ oneOff: v ?? 0 })} /></div>
          </div>
          <dl className="grid content-start gap-7">
            <Big label="Profit, next 12 months" value={short(L.profit12)} delta={`${signed(L.deltaProfit)} versus the forecast`} color={L.deltaProfit >= 0 ? OUTCOME.good : OUTCOME.worst} />
            {L.value !== null && L.deltaValue !== null && <Big label="What the business is worth" value={short(L.value)} delta={`${signed(L.deltaValue)} versus today's estimate`} color={L.deltaValue >= 0 ? OUTCOME.good : OUTCOME.worst} />}
            {adj.oneOff > 0 && <Big label="Cash change over the year" value={signed(L.deltaCash)} delta="after the one-off spend" color={L.deltaCash >= 0 ? OUTCOME.good : OUTCOME.caution} />}
          </dl>
        </div>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Button variant="secondary" size="sm" onClick={() => setAdj(NO_CHANGE)} disabled={!changed}><RotateCcw size={14} aria-hidden="true" /> Reset</Button>
          <p className="text-[13px] text-ink-muted">
            {L.basis === 'fitted' ? 'Fixed and variable costs were worked out from your own months.' : 'Your months do not show clearly how costs move with sales, so 60% of costs are assumed to move with volume.'}
          </p>
        </div>
      </Stage>
      <Levers output={output} />
    </div>
  )
}
