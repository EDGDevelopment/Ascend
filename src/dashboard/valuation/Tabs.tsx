import { useRef, type ReactNode } from 'react'

export interface TabDef {
  id: string
  label: string
}

/**
 * Accessible tabs: arrow keys, Home and End move between them, and only the active tab is in the tab order.
 * On a phone the list scrolls sideways instead of wrapping.
 */
export function Tabs({ tabs, active, onChange, label, children, variant = 'card' }: { tabs: TabDef[]; active: string; onChange: (id: string) => void; label: string; children: ReactNode; variant?: 'card' | 'pill' | 'line' }) {
  const refs = useRef<Record<string, HTMLButtonElement | null>>({})
  function onKey(e: React.KeyboardEvent, i: number) {
    const last = tabs.length - 1
    const next = e.key === 'ArrowRight' ? (i === last ? 0 : i + 1) : e.key === 'ArrowLeft' ? (i === 0 ? last : i - 1) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null
    if (next === null) return
    e.preventDefault()
    onChange(tabs[next].id)
    refs.current[tabs[next].id]?.focus()
  }
  return (
    <div>
      <div role="tablist" aria-label={label} className={variant === 'line' ? 'flex gap-6 overflow-x-auto border-b border-line' : variant === 'pill' ? 'inline-flex max-w-full gap-1 overflow-x-auto rounded-full border border-line bg-sunken p-1' : '-mx-1 flex gap-2 overflow-x-auto px-1 pb-2'}>
        {tabs.map((t, i) => {
          const on = t.id === active
          return (
            <button
              key={t.id}
              ref={(el) => { refs.current[t.id] = el }}
              role="tab"
              type="button"
              id={`tab-${t.id}`}
              aria-selected={on}
              aria-controls={`panel-${t.id}`}
              tabIndex={on ? 0 : -1}
              onClick={() => onChange(t.id)}
              onKeyDown={(e) => onKey(e, i)}
              className={variant === 'line'
                ? `relative -mb-px shrink-0 px-0.5 pb-2.5 text-sm font-semibold transition-colors ${on ? 'text-accent-ink' : 'text-ink-muted hover:text-ink'}`
                : variant === 'pill'
                ? `shrink-0 rounded-full px-6 py-2 text-sm font-semibold transition-all ${on ? 'ramp-bg text-[#0b1310] shadow-sm' : 'text-ink-muted hover:text-ink'}`
                : `relative shrink-0 rounded-lg border px-4 py-2.5 text-left transition-colors ${on ? 'border-accent-bright bg-accent-soft' : 'border-line bg-surface hover:bg-sunken'}`}
            >
              {on && variant === 'line' && <span aria-hidden="true" className="ramp-bg absolute inset-x-0 bottom-0 h-0.5 rounded-full" />}
              {on && variant === 'card' && <span aria-hidden="true" className="ramp-bg absolute inset-x-3 top-0 h-0.5 rounded-full" />}
              <span className={variant !== 'card' ? '' : `block text-sm font-semibold ${on ? 'text-accent-ink' : ''}`}>{t.label}</span>
            </button>
          )
        })}
      </div>
      <div role="tabpanel" id={`panel-${active}`} aria-labelledby={`tab-${active}`} tabIndex={0} className={`${variant === 'line' ? 'mt-5' : 'mt-6'} focus:outline-none`}>
        {children}
      </div>
    </div>
  )
}
