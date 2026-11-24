import { lazy, Suspense } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AuthProvider } from '@/auth/AuthProvider'
import { ThemeProvider } from '@/theme/ThemeProvider'
import { ValuationProvider } from '@/valuation/ValuationProvider'
import { FullPageLoader, ProtectedRoute } from '@/auth/ProtectedRoute'
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
              <Route path="opportunities" element={<OpportunitiesPage />} />
              <Route path="data" element={<DataSourcesPage />} />
              <Route path="model" element={<ModelPage />} />
              <Route path="track-record" element={<TrackRecordPage />} />
              <Route path="goals" element={<GoalsPage />} />
              <Route path="funding" element={<FundingPage />} />
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
