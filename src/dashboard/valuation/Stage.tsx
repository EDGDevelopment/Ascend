import type { ReactNode } from 'react'
import { ExplainButton } from '@/chat/ExplainButton'

/** A dark canvas for simulation charts and headline results. Looks the same in light and dark themes. */
export function Stage({ title, subtitle, action, explain, children, className = '' }: { title: string; subtitle?: string; action?: ReactNode; /** A question for the assistant. Adds an "Explain this" button that asks it. */ explain?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`stage-dark rounded-card p-5 sm:p-6 ${className}`}>
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2.5">
            <span aria-hidden="true" className="ramp-bg inline-block h-1.5 w-10 rounded-full" />
            <h2 className="text-base font-semibold">{title}</h2>
          </div>
          {subtitle && <p className="mt-1.5 text-sm text-ink-muted">{subtitle}</p>}
        </div>
        {(explain || action) && (
          <div className="flex flex-wrap items-center gap-2">
            {explain && <ExplainButton question={explain} />}
            {action}
          </div>
        )}
      </header>
      <div className="mt-5">{children}</div>
    </section>
  )
}
