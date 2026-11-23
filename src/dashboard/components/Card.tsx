import type { ReactNode } from 'react'
import { ExplainButton } from '@/chat/ExplainButton'

interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  /** A question for the assistant. Adds an "Explain this" button that asks it. */
  explain?: string
  children: ReactNode
  className?: string
  padded?: boolean
}

/** Elevation is the 1px border alone. No shadow on top of it. */
export function Card({ title, subtitle, action, explain, children, className = '', padded = true }: CardProps) {
  return (
    <section className={`rounded-card border border-line bg-surface ${className}`}>
      {(title || action || explain) && (
        // "Explain this" always sits top-right of the header. Tabs or other actions drop to their own row below the title.
        <header className={`flex justify-between gap-3 px-5 pt-4 ${explain ? 'items-start' : 'flex-wrap items-center'}`}>
          <div className={explain ? 'min-w-0 flex-1' : undefined}>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-faint">{subtitle}</p>}
            {explain && action && <div className="mt-3">{action}</div>}
          </div>
          {explain ? <ExplainButton question={explain} /> : action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}
