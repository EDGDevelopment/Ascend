import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { monthLabel } from '@/data/useDashboardData'
import { formatUsd } from '@/lib/format'
import { useValuation } from '@/valuation/useValuation'
import { EXPECTED_IN_RANGE, scoreTrackRecord } from '../../../supabase/functions/_shared/valuation/track'
import { Card } from '../components/Card'
import { NeedsData } from '../components/NeedsData'

const pct = (n: number, digits = 0) => `${(n * 100).toFixed(digits)}%`
const signed = (n: number) => `${n > 0 ? '+' : ''}${(n * 100).toFixed(1)}%`

function Stat({ label, value, note }: { label: string; value: string; note: string }) {
  return (
    <div className="rounded-lg border border-line-soft px-4 py-3">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="mt-1 text-2xl font-semibold tracking-tight">{value}</p>
      <p className="mt-1 text-[13px] text-ink-muted">{note}</p>
    </div>
  )
}

export default function TrackRecordPage() {
  const { active, output } = useValuation()
  const record = useMemo(() => (active ? scoreTrackRecord(active.snapshots ?? [], active.input.monthly) : null), [active])
  if (!active || !output || !record) return <NeedsData />

  const latest = active.snapshots?.[active.snapshots.length - 1]
  const withMonths = record.snapshots.filter((s) => s.months.length > 0)

  return (
    <div className="mx-auto max-w-[900px] space-y-6">
      <Card
        title="Forecast track record"
        subtitle="Each forecast is saved when it is made. When real months arrive, Ascend checks them against what it said."
        explain="What does my forecast track record show, and how should I read it?"
      >
        {record.scored === 0 ? (
          <div className="space-y-3 text-[15px] text-ink-muted">
            <p>
              Nothing to check yet. {latest ? `Your latest forecast looks ahead from ${monthLabel(latest.lastMonth)}, to ${monthLabel(latest.months[latest.months.length - 1])}.` : 'Your forecast has not been saved yet.'}
            </p>
            <p>
              To fill this page, add each new month of results on the <Link to="/dashboard/valuation" className="font-medium text-accent-ink hover:underline">Financial model</Link> page and run the forecast again. The new month is scored against the forecast you had before.
            </p>
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-3">
            <Stat
              label="Months landed inside the range"
              value={pct(record.inRangeShare ?? 0)}
              note={`Aim is about ${pct(EXPECTED_IN_RANGE)}. Across ${record.scored} month${record.scored === 1 ? '' : 's'} checked.`}
            />
            <Stat label="Typical miss" value={pct(record.typicalError ?? 0, 1)} note="Average gap between real revenue and the middle forecast." />
            <Stat
              label="Leaning"
              value={signed(record.bias ?? 0)}
              note={(record.bias ?? 0) >= 0 ? 'Real months have tended to beat the forecast.' : 'Real months have tended to fall short of the forecast.'}
            />
          </div>
        )}
        {record.scored > 0 && record.scored < 6 && <p className="mt-4 text-[13px] text-ink-faint">Only {record.scored} month{record.scored === 1 ? '' : 's'} so far, so treat these figures as early. They firm up as more months arrive.</p>}
      </Card>

      {withMonths.map((s) => (
        <Card key={s.lastMonth} title={`Forecast from ${monthLabel(s.lastMonth)}`} subtitle={`Made ${new Date(s.madeAt).toLocaleDateString()}. ${s.months.length} of ${s.horizon} months have real results.`} action={<span className="rounded-full bg-sunken px-2.5 py-1 text-xs font-medium text-ink-soft">{s.months.filter((m) => m.inRange).length} of {s.months.length} inside range</span>}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead>
                <tr className="border-b border-line-soft text-xs text-ink-faint">
                  <th scope="col" className="py-2 font-medium">Month</th>
                  <th scope="col" className="py-2 text-right font-medium">Forecast range</th>
                  <th scope="col" className="py-2 text-right font-medium">Actual</th>
                  <th scope="col" className="py-2 text-right font-medium">Versus middle</th>
                  <th scope="col" className="py-2 text-right font-medium">Result</th>
                </tr>
              </thead>
              <tbody>
                {s.months.map((m) => (
                  <tr key={m.month} className="border-b border-line-soft last:border-0">
                    <th scope="row" className="py-2.5 font-medium">{monthLabel(m.month)}</th>
                    <td className="py-2.5 text-right text-ink-muted">{formatUsd(m.p10)} to {formatUsd(m.p90)}</td>
                    <td className="py-2.5 text-right font-semibold">{formatUsd(m.actual)}</td>
                    <td className="py-2.5 text-right">{signed(m.error)}</td>
                    <td className={`py-2.5 text-right font-medium ${m.inRange ? 'text-up' : 'text-down'}`}>{m.inRange ? 'Inside range' : m.actual > m.p90 ? 'Above range' : 'Below range'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      ))}

      <p className="text-[13px] text-ink-faint">Checks revenue only. A range is meant to hold the real figure about {pct(EXPECTED_IN_RANGE)} of the time, so the odd miss is expected.</p>
    </div>
  )
}
