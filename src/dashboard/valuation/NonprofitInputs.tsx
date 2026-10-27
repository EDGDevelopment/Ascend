import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { MIX_LABELS, addMonths, type FundingMix, type ModelInput, type NonprofitProfile, type PipelineItem } from '@/valuation/engine'
import { NumberField } from '../components/NumberField'
import { GridInput } from './GridInput'
import { typedNumber } from './typedNumber'

interface Props {
  input: ModelInput
  loadId: number
  setInput: (next: ModelInput) => void
  replaceInput: (next: ModelInput) => void
}

/** The one question everyone answers. */
export function NonprofitQuestions({ input, loadId, setInput }: Props) {
  const p = input.nonprofit
  return (
    <div className="max-w-md">
      <NumberField key={`cash-${loadId}`} label="How much money is in the bank today?" kind="num" hint="Your cash balance across accounts." value={p.cashOnHand} onCommit={(v) => v !== undefined && setInput({ ...input, nonprofit: { ...p, cashOnHand: v } })} />
    </div>
  )
}

/** Everything optional. */
export function NonprofitMore({ input, loadId, setInput, replaceInput }: Props) {
  const p = input.nonprofit
  const set = (patch: Partial<NonprofitProfile>) => setInput({ ...input, nonprofit: { ...p, ...patch } })
  const mixKeys = Object.keys(MIX_LABELS) as (keyof FundingMix)[]
  const mixTotal = mixKeys.reduce((s, k) => s + p.mix[k], 0)
  const lastMonth = input.monthly[input.monthly.length - 1].month
  const setItem = (i: number, patch: Partial<PipelineItem>) => set({ pipeline: p.pipeline.map((it, j) => (j === i ? { ...it, ...patch } : it)) })

  return (
    <div className="space-y-7">
      <section>
        <h3 className="text-sm font-semibold">Reserves</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2">
          <NumberField key={`target-${loadId}`} label="Reserve target, in months of spending" kind="num" hint="Three to six months is the usual advice." value={p.reserveTargetMonths} onCommit={(v) => v !== undefined && set({ reserveTargetMonths: v })} />
          <NumberField key={`una-${loadId}`} label="Savings with no strings attached" kind="num" optional hint="Unrestricted net assets. Blank uses your cash." value={p.unrestrictedNetAssets} onCommit={(v) => set({ unrestrictedNetAssets: v })} />
        </div>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Where your income comes from</h3>
        <p className="mt-0.5 text-xs text-ink-faint">Share of a typical year. Shows how exposed you are to losing one funder.</p>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {mixKeys.map((k) => (
            <NumberField key={`${k}-${loadId}`} label={MIX_LABELS[k]} kind="pct" value={p.mix[k]} onCommit={(v) => v !== undefined && set({ mix: { ...p.mix, [k]: v } })} />
          ))}
          <NumberField key={`ret-${loadId}`} label="Donors who give again" kind="pct" optional hint="Share of last year's donors who returned." value={p.donorRetention} onCommit={(v) => set({ donorRetention: v })} />
        </div>
        <p className={`mt-2 text-xs ${Math.abs(mixTotal - 1) > 0.02 && mixTotal > 0 ? 'text-down' : 'text-ink-faint'}`}>Adds up to {(mixTotal * 100).toFixed(0)}%{mixTotal > 0 && Math.abs(mixTotal - 1) > 0.02 ? '. It needs to be 100%, or set every source to 0 to skip this.' : '.'}</p>
      </section>

      <section>
        <h3 className="text-sm font-semibold">Grants and campaigns in progress</h3>
        <p className="mt-0.5 text-xs text-ink-faint">Money you have applied for or planned that is not already in your months. Each one lands in full or not at all.</p>
        {p.pipeline.length > 0 && (
          <div className="mt-3 overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <caption className="sr-only">Funding pipeline</caption>
              <thead>
                <tr className="text-xs text-ink-faint">
                  <th scope="col" className="pb-2 pr-3 font-medium">Name</th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">Amount</th>
                  <th scope="col" className="pb-2 pr-3 text-right font-medium">Chance it comes in (%)</th>
                  <th scope="col" className="pb-2 pr-3 font-medium">Expected month</th>
                  <th scope="col" className="w-10 pb-2"><span className="sr-only">Remove</span></th>
                </tr>
              </thead>
              <tbody>
                {p.pipeline.map((it, i) => (
                  <tr key={`${loadId}-${i}`}>
                    <td className="py-1 pr-3"><GridInput align="left" label={`Name, item ${i + 1}`} value={it.name} placeholder="Community grant" onCommit={(raw) => setItem(i, { name: raw })} /></td>
                    <td className="py-1 pr-3"><GridInput label={`Amount, item ${i + 1}`} value={it.amount} onCommit={(raw) => { const n = typedNumber(raw); if (n !== null) setItem(i, { amount: n }) }} /></td>
                    <td className="py-1 pr-3"><GridInput label={`Chance, item ${i + 1}`} value={Math.round(it.probability * 100)} onCommit={(raw) => { const n = typedNumber(raw); if (n !== null) setItem(i, { probability: n / 100 }) }} /></td>
                    <td className="py-1 pr-3"><GridInput align="left" label={`Month, item ${i + 1}`} value={it.month} placeholder="2026-12" onCommit={(raw) => /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.trim()) && setItem(i, { month: raw.trim() })} /></td>
                    <td className="py-1 text-center">
                      <button type="button" aria-label={`Remove ${it.name || `item ${i + 1}`}`} onClick={() => replaceInput({ ...input, nonprofit: { ...p, pipeline: p.pipeline.filter((_, j) => j !== i) } })} className="rounded-md p-1.5 text-ink-faint hover:bg-sunken hover:text-ink">
                        <Trash2 size={15} aria-hidden="true" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        <Button variant="secondary" size="sm" className="mt-3" disabled={p.pipeline.length >= 50} onClick={() => replaceInput({ ...input, nonprofit: { ...p, pipeline: [...p.pipeline, { name: '', amount: 0, probability: 0.5, month: addMonths(lastMonth, 3) }] } })}>
          <Plus size={14} aria-hidden="true" /> Add a grant or campaign
        </Button>
      </section>
    </div>
  )
}
