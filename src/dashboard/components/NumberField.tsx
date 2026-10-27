import { useId, useState } from 'react'

interface NumberFieldProps {
  label: string
  /** Stored value. For `pct` this is a decimal (0.08), shown as 8. */
  value: number | undefined
  onCommit: (value: number | undefined) => void
  kind: 'pct' | 'num' | 'int'
  hint?: string
  /** When true, clearing the box commits `undefined` instead of being ignored. */
  optional?: boolean
}

const show = (v: number | undefined, kind: NumberFieldProps['kind']) => {
  if (v === undefined || Number.isNaN(v)) return ''
  return String(kind === 'pct' ? Math.round(v * 1e6) / 1e4 : v)
}

/**
 * Text input that keeps what the user is typing. It only reads `value` on mount, so remount it
 * (change its `key`) when the value is replaced from outside, such as after a file upload.
 */
export function NumberField({ label, value, onCommit, kind, hint, optional }: NumberFieldProps) {
  const id = useId()
  const [text, setText] = useState(() => show(value, kind))

  function change(raw: string) {
    setText(raw)
    const t = raw.trim()
    if (t === '') {
      if (optional) onCommit(undefined)
      return
    }
    const n = Number(t)
    if (!Number.isFinite(n)) return
    onCommit(kind === 'pct' ? n / 100 : kind === 'int' ? Math.round(n) : n)
  }

  return (
    <div>
      <label htmlFor={id} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          inputMode="decimal"
          value={text}
          onChange={(e) => change(e.target.value)}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`h-10 w-full rounded-lg border border-line bg-surface px-3 text-sm text-ink transition-colors hover:border-ink-faint focus:border-accent-bright focus:outline-none focus:ring-2 focus:ring-accent-bright/25 ${kind === 'pct' ? 'pr-8' : ''}`}
        />
        {kind === 'pct' && <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-ink-faint">%</span>}
      </div>
      {hint && (
        <p id={`${id}-hint`} className="mt-1 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  )
}
