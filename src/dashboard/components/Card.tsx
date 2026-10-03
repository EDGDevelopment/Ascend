import type { ReactNode } from 'react'

interface CardProps {
  title?: string
  subtitle?: string
  action?: ReactNode
  children: ReactNode
  className?: string
  padded?: boolean
}

/** Elevation is the 1px border alone. No shadow on top of it. */
export function Card({ title, subtitle, action, children, className = '', padded = true }: CardProps) {
  return (
    <section className={`rounded-card border border-line bg-surface ${className}`}>
      {(title || action) && (
        <header className="flex flex-wrap items-center justify-between gap-3 px-5 pt-4">
          <div>
            {title && <h2 className="text-[15px] font-semibold">{title}</h2>}
            {subtitle && <p className="mt-0.5 text-[13px] text-ink-faint">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? 'p-5' : ''}>{children}</div>
    </section>
  )
}
