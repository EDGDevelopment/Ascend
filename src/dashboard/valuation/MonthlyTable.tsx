import { Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { addMonths, type ModelInput } from '@/valuation/engine'
import { GridInput } from './GridInput'
import { typedNumber } from './typedNumber'

interface Props {
  input: ModelInput
  loadId: number
  setInput: (next: ModelInput) => void
  replaceInput: (next: ModelInput) => void
}

export function MonthlyTable({ input, loadId, setInput, replaceInput }: Props) {
  const rows = input.monthly
  const hasExpenses = rows.every((r) => r.expenses !== undefined)
  const need = input.orgType === 'nonprofit'

  const edit = (i: number, patch: Partial<ModelInput['monthly'][number]>) =>
    setInput({ ...input, monthly: rows.map((r, j) => (j === i ? { ...r, ...patch } : r)) })

  return (
    <div>
      <div className="max-h-[360px] overflow-auto rounded-lg border border-line-soft">
        <table className="w-full min-w-[460px] text-left text-sm">
          <caption className="sr-only">Monthly revenue and expenses</caption>
          <thead className="sticky top-0 bg-page">
            <tr className="border-y border-line-soft text-xs text-ink-faint">
              <th scope="col" className="px-3 py-2.5 pl-5 font-medium">Month</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Revenue</th>
              <th scope="col" className="px-3 py-2.5 text-right font-medium">Expenses{need ? '' : ' (optional)'}</th>
              <th scope="col" className="w-12 px-3 py-2.5"><span className="sr-only">Remove</span></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={`${loadId}-${i}`} className="border-b border-line-soft last:border-0">
                <td className="px-3 py-1.5 pl-5">
                  <GridInput align="left" label={`Month, row ${i + 1}`} value={r.month} placeholder="2025-03" onCommit={(raw) => /^\d{4}-(0[1-9]|1[0-2])$/.test(raw.trim()) && edit(i, { month: raw.trim() })} />
                </td>
                <td className="px-3 py-1.5">
                  <GridInput label={`Revenue, ${r.month}`} value={r.revenue} onCommit={(raw) => { const n = typedNumber(raw); if (n !== null) edit(i, { revenue: n }) }} />
                </td>
                <td className="px-3 py-1.5">
                  <GridInput
                    label={`Expenses, ${r.month}`}
                    value={r.expenses}
                    onCommit={(raw) => {
                      const n = typedNumber(raw)
                      if (n !== null) edit(i, { expenses: n })
                      else if (raw.trim() === '') edit(i, { expenses: undefined })
                    }}
                  />
                </td>
                <td className="px-3 py-1.5 text-center">
                  <button
                    type="button"
                    aria-label={`Remove ${r.month}`}
                    disabled={rows.length <= 12}
                    onClick={() => replaceInput({ ...input, monthly: rows.filter((_, j) => j !== i) })}
                    className="rounded-md p-1.5 text-ink-faint hover:bg-sunken hover:text-ink disabled:opacity-40"
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap items-center gap-3 pt-3">
        <Button
          variant="ghost"
          size="sm"
          disabled={rows.length >= 120}
          onClick={() => {
            const last = rows[rows.length - 1]
            replaceInput({ ...input, monthly: [...rows, { ...last, month: addMonths(last.month, 1) }] })
          }}
        >
          <Plus size={14} aria-hidden="true" /> Add next month
        </Button>
        {!hasExpenses && !need && <span className="text-xs text-ink-faint">Without expenses you still get a revenue forecast and value. Add them to forecast cash flow too.</span>}
      </div>
    </div>
  )
}
