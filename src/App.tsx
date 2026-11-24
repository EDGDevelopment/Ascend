import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { ValuationProvider } from '@/valuation/ValuationProvider'
import { FullPageLoader, ProtectedRoute } from '@/auth/ProtectedRoute'
import { SectionTabs, type SectionTab } from '@/dashboard/components/SectionTabs'
import AuthPage from '@/pages/auth/AuthPage'
import LandingPage from '@/pages/landing/LandingPage'
const DashboardLayout = lazy(() => import('@/dashboard/DashboardLayout'))
const OverviewPage = lazy(() => import('@/dashboard/pages/OverviewPage'))
const ForecastsPage = lazy(() => import('@/dashboard/pages/ForecastsPage'))
const OpportunitiesPage = lazy(() => import('@/dashboard/pages/OpportunitiesPage'))
const DataSourcesPage = lazy(() => import('@/dashboard/pages/DataSourcesPage'))
const ModelPage = lazy(() => import('@/dashboard/pages/ModelPage'))
const TrackRecordPage = lazy(() => import('@/dashboard/pages/TrackRecordPage'))
const SharedReportPage = lazy(() => import('@/dashboard/pages/SharedReportPage'))
const GoalsPage = lazy(() => import('@/dashboard/pages/GoalsPage'))
const FundingPage = lazy(() => import('@/dashboard/pages/FundingPage'))
const ValuationPage = lazy(() => import('@/dashboard/pages/ValuationPage'))

const GROWTH: SectionTab[] = [
  { to: '/dashboard/growth', label: 'Growth plan', end: true },
  { to: '/dashboard/growth/goals', label: 'Goals' },
]
const REPORTS: SectionTab[] = [
  { to: '/dashboard/reports', label: 'Funding snapshot', end: true },
  { to: '/dashboard/reports/track-record', label: 'Track record' },
  { to: '/dashboard/reports/model', label: 'How it works' },
]

export default function App() {
  return (
    <ThemeProvider>
    <AuthProvider>
      <ValuationProvider>
      <BrowserRouter>
        <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<AuthPage mode="login" />} />
          <Route path="/signup" element={<AuthPage mode="signup" />} />
          <Route path="/forgot-password" element={<AuthPage mode="forgot" />} />
          <Route path="/reset-password" element={<AuthPage mode="reset" />} />

          <Route path="/shared/:token" element={<SharedReportPage />} />

          <Route element={<ProtectedRoute />}>
            <Route path="/dashboard" element={<DashboardLayout />}>
              <Route index element={<OverviewPage />} />
              <Route path="forecasts" element={<ForecastsPage />} />
              <Route path="valuation" element={<ValuationPage />} />
              <Route path="data" element={<DataSourcesPage />} />

              <Route path="growth" element={<SectionTabs label="Growth" tabs={GROWTH} />}>
                <Route index element={<OpportunitiesPage />} />
                <Route path="goals" element={<GoalsPage />} />
              </Route>
              <Route path="reports" element={<SectionTabs label="Reports" tabs={REPORTS} />}>
                <Route index element={<FundingPage />} />
                <Route path="track-record" element={<TrackRecordPage />} />
                <Route path="model" element={<ModelPage />} />
              </Route>

              {/* The old addresses, so bookmarks and earlier links still land in the right place. */}
              <Route path="opportunities" element={<Navigate to="/dashboard/growth" replace />} />
              <Route path="goals" element={<Navigate to="/dashboard/growth/goals" replace />} />
              <Route path="funding" element={<Navigate to="/dashboard/reports" replace />} />
              <Route path="track-record" element={<Navigate to="/dashboard/reports/track-record" replace />} />
              <Route path="model" element={<Navigate to="/dashboard/reports/model" replace />} />
            </Route>
          </Route>

          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        </Suspense>
      </BrowserRouter>
      </ValuationProvider>
    </AuthProvider>
    </ThemeProvider>
  )
}
