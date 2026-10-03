import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  Database,
  LayoutDashboard,
  LineChart,
  LogOut,
  Menu,
  Network,
  Sparkles,
  X,
} from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Logo } from '@/components/Logo'
import { ThemeToggle } from '@/components/ThemeToggle'

const nav = [
  { to: '/dashboard', label: 'Overview', icon: LayoutDashboard, end: true },
  { to: '/dashboard/forecasts', label: 'Forecasts', icon: LineChart },
  { to: '/dashboard/opportunities', label: 'Opportunities', icon: Sparkles },
  { to: '/dashboard/data', label: 'Data sources', icon: Database },
  { to: '/dashboard/model', label: 'Model', icon: Network },
]

const titles: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/forecasts': 'Forecasts',
  '/dashboard/opportunities': 'Opportunities',
  '/dashboard/data': 'Data sources',
  '/dashboard/model': 'Model',
}

function initials(name: string) {
  return (
    name
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]?.toUpperCase())
      .join('') || 'A'
  )
}

function SidebarContent({ onNavigate }: { onNavigate?: () => void }) {
  const { user, signOut } = useAuth()
  const navigate = useNavigate()
  const name = user?.fullName || user?.email || 'Account'

  async function handleSignOut() {
    await signOut()
    navigate('/', { replace: true })
  }

  return (
    <div className="flex h-full flex-col">
      <div className="px-5 pb-4 pt-5">
        <Logo to="/dashboard" />
      </div>

      <nav aria-label="Dashboard" className="flex-1 space-y-1 px-3">
        {nav.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            onClick={onNavigate}
            className={({ isActive }) =>
              `flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                isActive ? 'bg-accent-soft text-accent-ink' : 'text-ink-muted hover:bg-sunken hover:text-ink'
              }`
            }
          >
            <Icon size={18} />
            {label}
          </NavLink>
        ))}
      </nav>


      <div className="border-t border-line-soft p-3">
        <div className="flex items-center gap-3 rounded-lg px-2 py-2">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-xs font-semibold text-white">
            {initials(name)}
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">{name}</p>
            <p className="truncate text-xs text-ink-faint">{user?.email}</p>
          </div>
          <button
            type="button"
            onClick={() => void handleSignOut()}
            aria-label="Sign out"
            title="Sign out"
            className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink"
          >
            <LogOut size={17} />
          </button>
        </div>
      </div>
    </div>
  )
}

export default function DashboardLayout() {
  const location = useLocation()
  const [drawer, setDrawer] = useState(false)
  const title = titles[location.pathname.replace(/\/$/, '')] ?? 'Dashboard'

  // Close the mobile drawer on Escape. Link clicks close it through onNavigate.
  useEffect(() => {
    if (!drawer) return
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setDrawer(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [drawer])

  return (
    <div className="min-h-screen lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-screen border-r border-line-soft bg-surface lg:block">
        <SidebarContent />
      </aside>

      {drawer && (
        <div className="fixed inset-0 z-50 lg:hidden" role="dialog" aria-modal="true" aria-label="Navigation">
          <button
            type="button"
            aria-label="Close navigation"
            className="absolute inset-0 bg-black/50"
            onClick={() => setDrawer(false)}
          />
          <div className="absolute inset-y-0 left-0 w-[280px] bg-surface shadow-pop">
            <button
              type="button"
              aria-label="Close navigation"
              onClick={() => setDrawer(false)}
              className="absolute right-3 top-4 grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sunken"
            >
              <X size={19} />
            </button>
            <SidebarContent onNavigate={() => setDrawer(false)} />
          </div>
        </div>
      )}

      <div className="min-w-0">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-line-soft bg-page px-4 sm:px-8">
          <button
            type="button"
            className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-sunken lg:hidden"
            aria-label="Open navigation"
            onClick={() => setDrawer(true)}
          >
            <Menu size={20} />
          </button>
          <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          <span className="ml-auto rounded-full border border-line px-2.5 py-0.5 text-xs font-medium text-ink-muted">Early preview</span>
          <ThemeToggle />
        </header>

        <main className="px-4 py-6 sm:px-8 sm:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
