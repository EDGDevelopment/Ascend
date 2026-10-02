import { Navigate, Outlet, useLocation } from 'react-router-dom'
import { LogoMark } from '@/components/Logo'
import { useAuth } from './useAuth'

export function FullPageLoader() {
  return (
    <div role="status" aria-live="polite" className="grid min-h-screen place-items-center bg-page">
      <div className="flex flex-col items-center gap-3">
        <span className="animate-pulse">
          <LogoMark size={40} />
        </span>
        <p className="text-xs text-ink-faint">Loading...</p>
      </div>
    </div>
  )
}

/** Renders child routes for signed-in users, otherwise sends them to /login and remembers where they were going. */
export function ProtectedRoute() {
  const { user, loading } = useAuth()
  const location = useLocation()

  if (loading) return <FullPageLoader />
  if (!user) return <Navigate to="/login" replace state={{ from: location.pathname }} />
  return <Outlet />
}
