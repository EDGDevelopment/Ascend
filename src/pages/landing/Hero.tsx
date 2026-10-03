import { lazy, Suspense, useState, type FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/auth/useAuth'
import { Button, ButtonLink } from '@/components/ui/Button'
import { metricLabels } from '@/data/metrics'
import { mockSeries } from '@/data/mockSeries'
import type { MetricKey } from '@/data/types'
import { formatPercent, formatUsdCompact } from '@/lib/format'

// Recharts loads after first paint. The static chart below holds the space meanwhile.
const ForecastChart = lazy(() =>
  import('@/dashboard/components/ForecastChart').then((m) => ({ default: m.ForecastChart })),
)

const metrics: MetricKey[] = ['revenue', 'expenses', 'cashFlow']

function latestChange(metric: MetricKey) {
  const actuals = mockSeries[metric].filter((p) => p.actual !== null).map((p) => p.actual as number)
  const value = actuals[actuals.length - 1]
  const prev = actuals[actuals.length - 2]
  return { value, change: ((value - prev) / prev) * 100 }
}

/** A headline figure that also switches the chart below it. */
function Figure({ metric, active, onSelect }: { metric: MetricKey; active: boolean; onSelect: () => void }) {
  const { value, change } = latestChange(metric)
  // Rising expenses are bad news, so they read red.
  const good = metric === 'expenses' ? change <= 0 : change >= 0
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={active}
      className={`flex-1 rounded-lg px-3 py-2 text-left transition-colors ${active ? 'bg-sunken' : 'hover:bg-sunken/60'}`}
    >
      <span className={`block text-xs ${active ? 'font-medium text-ink-soft' : 'text-ink-faint'}`}>{metricLabels[metric]}</span>
      <span className="tabular mt-0.5 block text-xl font-semibold">{formatUsdCompact(value)}</span>
      <span className={`tabular block text-xs font-medium ${good ? 'text-up' : 'text-down'}`}>{formatPercent(change)}</span>
    </button>
  )
}

function StaticChart() {
  return (
    <svg viewBox="0 0 400 140" className="h-36 w-full" role="img" aria-label="Revenue climbing, with a forecast range continuing upward">
      <g stroke="#e6ebe7">
        <line x1="0" x2="400" y1="35" y2="35" />
        <line x1="0" x2="400" y1="80" y2="80" />
        <line x1="0" x2="400" y1="125" y2="125" />
      </g>
      <path d="M250 62 L290 50 L330 40 L370 28 L400 18 L400 70 L370 76 L330 80 L290 82 L250 78 Z" fill="#2e8a67" fillOpacity="0.14" />
      <path
        d="M0 104 L32 96 L64 100 L96 84 L128 90 L160 72 L192 80 L224 64 L250 70"
        fill="none"
        stroke="#1f6b4f"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M250 70 L290 64 L330 56 L370 46 L400 38" fill="none" stroke="#2e8a67" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
      <line x1="250" x2="250" y1="6" y2="134" stroke="#66716c" strokeDasharray="3 4" strokeOpacity="0.45" />
    </svg>
  )
}

/** The dashboard forecast in miniature. Pick a figure to switch the chart, hover it for values. */
function HeroPlate() {
  const [metric, setMetric] = useState<MetricKey>('revenue')

  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Bella's Cafe</p>
        <p className="text-sm text-ink-faint">
          Health <span className="tabular text-lg font-semibold text-accent">82</span>
        </p>
      </div>

      <div className="-mx-1 mt-4 flex gap-1" role="group" aria-label="Choose a metric">
        {metrics.map((m) => (
          <Figure key={m} metric={m} active={metric === m} onSelect={() => setMetric(m)} />
        ))}
      </div>

      <div className="mt-5 h-36">
        <Suspense fallback={<StaticChart />}>
          <ForecastChart points={mockSeries[metric]} height={144} minimal />
        </Suspense>
      </div>

      <p className="mt-4 border-t border-line-soft pt-4 text-sm text-ink-soft">
        <span className="font-medium text-accent-strong">Opportunity:</span> weekday sales are 18% below potential.
      </p>
    </div>
  )
}

/** Starts sign-up with the email already filled in. The address travels in router state, never in the URL. */
function StartForm() {
  const navigate = useNavigate()
  const [email, setEmail] = useState('')

  function onSubmit(e: FormEvent) {
    e.preventDefault()
    navigate('/signup', { state: { email: email.trim() } })
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-md flex-col gap-2 sm:flex-row">
      <label htmlFor="hero-email" className="sr-only">
        Email
      </label>
      <input
        id="hero-email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@business.com"
        className="h-12 min-w-0 flex-1 rounded-lg border border-line bg-surface px-4 text-[15px] placeholder:text-ink-faint hover:border-ink-faint focus:border-accent-bright focus:outline-none focus:ring-2 focus:ring-accent-bright/25"
      />
      <Button type="submit" size="lg">
        Get started
      </Button>
    </form>
  )
}

export function Hero() {
  const { user } = useAuth()
  return (
    <section>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1.15fr_1fr] lg:gap-16 lg:pb-28">
        <div className="settle">
          <h1 className="headline text-[2.25rem] leading-[1.08] sm:text-[3.25rem]">
            See what changed.
            <br />
            <span className="text-accent">Understand why.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
            Forecasts, change alerts and growth opportunities, learned from your own business data.
          </p>
          <div className="mt-9">
            {user ? (
              <ButtonLink to="/dashboard" size="lg">
                Open dashboard
              </ButtonLink>
            ) : (
              <StartForm />
            )}
          </div>
          <a href="#how" className="mt-4 inline-block text-sm font-medium text-accent hover:underline">
            See how it works
          </a>
        </div>

        <div className="settle [animation-delay:150ms]">
          <HeroPlate />
        </div>
      </div>
    </section>
  )
}
