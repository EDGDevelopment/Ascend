import { useDashboardData } from '@/data/useDashboardData'

export default function OverviewPage() {
  const data = useDashboardData()
  return <p className="text-ink-muted">Overview for {data.business.name} is coming together.</p>
}
