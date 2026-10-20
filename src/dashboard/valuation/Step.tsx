import { useId, type ReactNode } from 'react'

/** A numbered section of the page. The number sits on the same teal-to-coral ramp as the charts. */
export function Step({ n, title, hint, children }: { n: number; title: string; hint?: string; children: ReactNode }) {
  const id = useId()
  return (
    <section aria-labelledby={id}>
      <div className="flex items-start gap-3">
        <span aria-hidden="true" className="ramp-bg grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold text-[#0b1310]">{n}</span>
        <div>
          <h2 id={id} className="text-lg font-semibold tracking-tight">{title}</h2>
          {hint && <p className="mt-0.5 text-sm text-ink-muted">{hint}</p>}
        </div>
      </div>
      <div className="mt-4 sm:pl-11">{children}</div>
    </section>
  )
}
