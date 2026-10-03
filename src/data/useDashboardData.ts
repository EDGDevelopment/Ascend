import { useMemo } from 'react'
import { useAuth } from '@/auth/useAuth'
import { mockDashboard } from './mockDashboard'
import type { DashboardData } from './types'

/**
 * Single seam for dashboard data. Today it returns bundled mock data; later
 * this is where Supabase queries or the model API will be called.
 */
export function useDashboardData(): DashboardData {
  const { user } = useAuth()
  const businessName = user?.businessName?.trim()
  return useMemo(
    () =>
      businessName
        ? { ...mockDashboard, business: { ...mockDashboard.business, name: businessName } }
        : mockDashboard,
    [businessName],
  )
}
