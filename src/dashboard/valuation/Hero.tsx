import { OUTCOME } from './ramp'
import { Stage } from './Stage'
import { short } from './format'
import type { Backtest, LocalResult, ModelOutput, NonprofitResult } from '@/valuation/engine'

/** "96% accurate in testing": 100% minus the typical monthly miss when the model was tested on the client's own recent months. */
export function AccuracyBadge({ backtest }: { backtest: Backtest | null }) {
  if (!backtest || !Number.isFinite(backtest.mape)) {
    return <span className="rounded-full border border-line px-3 py-1 text-[13px] text-ink-muted">Add more months to test accuracy</span>
  }
  const acc = Math.max(0, 100 - backtest.mape * 100)
  const color = acc >= 95 ? OUTCOME.good : acc >= 90 ? OUTCOME.caution : OUTCOME.worst
  return (
    <span className="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[13px] font-medium" style={{ borderColor: color, color }}>
      <span aria-hidden="true" className="size-2 rounded-full" style={{ background: color }} />
      {acc.toFixed(0)}% accurate when tested on your last {backtest.months} months
    </span>
  )
}

function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div>
      <dt className="text-[13px] text-ink-muted">{label}</dt>
      <dd className="tabular mt-0.5 text-xl font-semibold" style={color ? { color } : undefined}>{value}</dd>
    </div>
  )
}

export function LocalHero({ output }: { output: ModelOutput }) {
  const L = output.local as LocalResult
  const span = Math.max(1, L.range.high - L.range.low)
  const at = Math.min(96, Math.max(4, ((L.range.mid - L.range.low) / span) * 100))
  return (
    <Stage title="What your business is worth" subtitle="A range, because nobody can pin a sale price down to the dollar.">
      <p className="ramp-text tabular text-5xl font-semibold tracking-tight sm:text-6xl">{short(L.range.mid)}</p>
      <p className="mt-1 text-sm text-ink-muted">most likely, before any money you owe</p>

      <div className="mt-6" role="img" aria-label={`Value range from ${short(L.range.low)} to ${short(L.range.high)}, most likely ${short(L.range.mid)}`}>
        <div className="relative h-3 rounded-full ramp-bg">
          <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0b1310] bg-white" style={{ left: `${at}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm font-semibold">
          <span style={{ color: OUTCOME.worst }}>{short(L.range.low)}</span>
          <span style={{ color: OUTCOME.best }}>{short(L.range.high)}</span>
        </div>
      </div>

      <p className="mt-4 flex items-center gap-2 text-sm text-ink-muted">
        <span aria-hidden="true" className="size-2 rounded-full" style={{ background: L.agreement.label === 'close' ? OUTCOME.good : L.agreement.label === 'moderate' ? OUTCOME.caution : OUTCOME.worst }} />
        {L.methods.length} valuation methods {L.agreement.label === 'close' ? 'agree closely' : L.agreement.label === 'moderate' ? 'agree roughly' : 'disagree widely, so treat the range with care'}.
      </p>

      <dl className="mt-6 grid gap-x-6 gap-y-4 border-t border-line-soft pt-5 sm:grid-cols-3">
        <Mini label={L.netDebt > 0 ? `You would keep after ${short(L.netDebt)} owed` : 'You would keep'} value={short(L.ownerRange.mid)} color={OUTCOME.good} />
        <Mini label="Owner earnings a year" value={short(L.sde)} />
        <div>
          <dt className="mb-1.5 text-[13px] text-ink-muted">How far to trust the forecast</dt>
          <dd><AccuracyBadge backtest={output.forecast.backtest} /></dd>
        </div>
      </dl>
    </Stage>
  )
}

export function NonprofitHero({ output }: { output: ModelOutput }) {
  const N = output.nonprofit as NonprofitResult
  const target = output.input.nonprofit.reserveTargetMonths
  const months = Number.isFinite(N.monthsOfCash) ? N.monthsOfCash : 24
  const level = months < 1 ? { label: 'Very low', color: OUTCOME.worst } : months < 3 ? { label: 'Getting low', color: OUTCOME.caution } : months < 6 ? { label: 'Healthy', color: OUTCOME.good } : { label: 'Strong', color: OUTCOME.best }
  const scale = Math.max(6, target * 1.5, months * 1.1)
  const pos = (m: number) => Math.min(98, Math.max(2, (m / scale) * 100))
  return (
    <Stage title="How long your money lasts" subtitle="Cash in the bank against what you spend in a typical month.">
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2">
        <p className="ramp-text tabular text-5xl font-semibold tracking-tight sm:text-6xl">{months >= 24 ? '24+' : months.toFixed(1)} <span className="text-2xl sm:text-3xl">months</span></p>
        <span className="rounded-full border px-3 py-1 text-sm font-semibold" style={{ borderColor: level.color, color: level.color }}>{level.label}</span>
      </div>

      <div className="mt-6" role="img" aria-label={`${months.toFixed(1)} months of cash. Your target is ${target} months.`}>
        <div className="relative h-3 rounded-full ramp-bg" style={{ opacity: 0.9 }}>
          <span className="absolute top-1/2 size-5 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-[#0b1310] bg-white" style={{ left: `${pos(months)}%` }} />
          <span className="absolute -top-1.5 h-6 w-0.5 -translate-x-1/2 bg-white/80" style={{ left: `${pos(target)}%` }} />
        </div>
        <div className="relative mt-2 h-5 text-[13px] text-ink-muted">
          <span className="absolute left-0">0</span>
          <span className="absolute -translate-x-1/2" style={{ left: `${pos(target)}%` }}>target {target}</span>
        </div>
      </div>

      <dl className="mt-4 grid gap-x-6 gap-y-4 border-t border-line-soft pt-5 sm:grid-cols-3">
        <Mini label="Chance of running dry this year" value={`${Math.round(N.probShortfall * 100)}%`} color={N.probShortfall >= 0.25 ? OUTCOME.worst : N.probShortfall >= 0.05 ? OUTCOME.caution : OUTCOME.good} />
        <Mini label="Chance of ending in surplus" value={`${Math.round(N.probSurplus * 100)}%`} color={N.probSurplus < 0.4 ? OUTCOME.caution : OUTCOME.good} />
        <div>
          <dt className="mb-1.5 text-[13px] text-ink-muted">How far to trust the forecast</dt>
          <dd><AccuracyBadge backtest={output.forecast.backtest} /></dd>
        </div>
      </dl>
    </Stage>
  )
}
