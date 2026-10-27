export interface ColoredStat {
  label: string
  value: string
  /** A CSS color, usually an outcome token. */
  color: string
  note?: string
}

/** A row of big colored figures, like the summary strip under a simulation chart. Color is never the only cue: each has a label. */
export function ColoredStats({ stats }: { stats: ColoredStat[] }) {
  return (
    <dl style={{ ['--n' as string]: stats.length }} className="mt-5 grid grid-cols-1 gap-x-4 gap-y-4 border-t border-line-soft pt-5 sm:[grid-template-columns:repeat(var(--n),minmax(0,1fr))]">
      {stats.map((s) => (
        <div key={s.label}>
          <dt className="flex items-center gap-1.5 text-[13px] text-ink-muted">
            <span aria-hidden="true" className="inline-block size-2 rounded-full" style={{ background: s.color }} />
            {s.label}
          </dt>
          <dd className="tabular mt-1 text-3xl font-semibold tracking-tight" style={{ color: s.color }}>{s.value}</dd>
          {s.note && <dd className="mt-0.5 text-[13px] text-ink-muted">{s.note}</dd>}
        </div>
      ))}
    </dl>
  )
}
