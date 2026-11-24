import { NavLink, Outlet } from 'react-router-dom'

export interface SectionTab {
  to: string
  label: string
  /** Match this path exactly. True for the tab that is the section's index. */
  end?: boolean
}

/** One sidebar item that holds several related pages, switched with tabs along the top. */
export function SectionTabs({ label, tabs }: { label: string; tabs: SectionTab[] }) {
  return (
    <div className="mx-auto max-w-[960px]">
      <nav aria-label={label} className="mb-5 flex gap-1.5 overflow-x-auto pb-1 print:hidden">
        {tabs.map((t) => (
          <NavLink
            key={t.to}
            to={t.to}
            end={t.end}
            className={({ isActive }) =>
              `shrink-0 rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors ${isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink'}`
            }
          >
            {t.label}
          </NavLink>
        ))}
      </nav>
      <Outlet />
    </div>
  )
}
