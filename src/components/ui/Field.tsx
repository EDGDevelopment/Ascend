import { useId, type InputHTMLAttributes, type ReactNode } from 'react'

interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  hint?: ReactNode
  trailing?: ReactNode
}

/** Labelled text input with an optional hint and a trailing slot (e.g. a show/hide toggle). */
export function Field({ label, hint, trailing, id, className = '', ...rest }: FieldProps) {
  const autoId = useId()
  const inputId = id ?? autoId
  const hintId = hint ? `${inputId}-hint` : undefined

  return (
    <div>
      <label htmlFor={inputId} className="mb-1.5 block text-[13px] font-medium text-ink-soft">
        {label}
      </label>
      <div className="relative">
        <input
          id={inputId}
          aria-describedby={hintId}
          className={`h-11 w-full rounded-lg border border-line bg-surface px-3.5 text-sm text-ink placeholder:text-ink-faint transition-colors hover:border-ink-faint focus:border-accent-bright focus:outline-none focus:ring-2 focus:ring-accent-bright/25 ${trailing ? 'pr-11' : ''} ${className}`}
          {...rest}
        />
        {trailing && <div className="absolute inset-y-0 right-1.5 flex items-center">{trailing}</div>}
      </div>
      {hint && (
        <p id={hintId} className="mt-1.5 text-xs text-ink-faint">
          {hint}
        </p>
      )}
    </div>
  )
}
