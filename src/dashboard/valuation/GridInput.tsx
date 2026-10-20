/** Compact uncontrolled input for table cells. Remount it (change its key) to replace the value from outside. */
export function GridInput({ value, label, onCommit, align = 'right', placeholder }: { value: string | number | undefined; label: string; onCommit: (raw: string) => void; align?: 'left' | 'right'; placeholder?: string }) {
  return (
    <input
      aria-label={label}
      inputMode={align === 'right' ? 'decimal' : 'text'}
      defaultValue={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => onCommit(e.target.value)}
      className={`h-9 w-full min-w-[84px] rounded-md border border-line bg-surface px-2.5 text-sm tabular-nums text-ink placeholder:text-ink-faint hover:border-ink-faint focus:border-accent-bright focus:outline-none focus:ring-2 focus:ring-accent-bright/25 ${align === 'right' ? 'text-right' : 'text-left'}`}
    />
  )
}
