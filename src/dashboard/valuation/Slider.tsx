import { useId } from 'react'

/** A labelled slider with its current value spelled out, for what-if controls. */
export function Slider({ label, hint, value, min, max, step, onChange, format }: { label: string; hint?: string; value: number; min: number; max: number; step: number; onChange: (v: number) => void; format: (v: number) => string }) {
  const id = useId()
  const pct = ((value - min) / (max - min)) * 100
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <label htmlFor={id} className="text-sm font-medium">{label}</label>
        <output htmlFor={id} className="tabular text-base font-semibold" style={{ color: value === 0 ? 'var(--color-ink-muted)' : value > 0 ? 'var(--color-out-2)' : 'var(--color-out-3)' }}>{value === 0 ? 'No change' : format(value)}</output>
      </div>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        aria-valuetext={value === 0 ? 'No change' : format(value)}
        onChange={(e) => onChange(Number(e.target.value))}
        className="mt-2 h-2 w-full cursor-pointer appearance-none rounded-full accent-[var(--color-accent-bright)]"
        style={{ background: `linear-gradient(90deg, var(--color-accent-bright) ${pct}%, var(--color-sunken) ${pct}%)` }}
      />
      {hint && <p className="mt-1 text-xs text-ink-muted">{hint}</p>}
    </div>
  )
}
