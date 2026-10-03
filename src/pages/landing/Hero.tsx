import { ArrowRight, Sparkles, TrendingDown, TrendingUp } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button'

function Stat({ label, value, delta, down }: { label: string; value: string; delta: string; down?: boolean }) {
  const Icon = down ? TrendingDown : TrendingUp
  return (
    <div className="rounded-xl border border-line-soft bg-page px-3.5 py-3">
      <p className="text-[11px] font-medium uppercase tracking-wide text-ink-faint">{label}</p>
      <p className="tabular mt-1 text-lg font-semibold">{value}</p>
      <p className={`mt-0.5 inline-flex items-center gap-1 text-xs font-medium ${down ? 'text-down' : 'text-up'}`}>
        <Icon size={12} /> {delta}
      </p>
    </div>
  )
}

function HeroPreview() {
  return (
    <div className="relative">
      <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-accent-soft/70 blur-2xl" aria-hidden="true" />
      <div className="rounded-2xl border border-line bg-surface p-5 shadow-pop sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium text-ink-faint">Bella's Cafe</p>
            <p className="mt-0.5 text-sm font-semibold">Business health</p>
          </div>
          <div className="flex items-baseline gap-1">
            <span className="tabular text-4xl font-semibold tracking-tight text-accent">82</span>
            <span className="text-sm text-ink-faint">/ 100</span>
          </div>
        </div>

        <div className="mt-4 grid grid-cols-3 gap-2.5">
          <Stat label="Revenue" value="$48.2k" delta="+8.4%" />
          <Stat label="Expenses" value="$31.6k" delta="+3.1%" down />
          <Stat label="Cash flow" value="$11.8k" delta="+11.2%" />
        </div>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between text-xs text-ink-faint">
            <span>Revenue, actual and forecast</span>
            <span className="inline-flex items-center gap-3">
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-0.5 w-4 rounded bg-accent" /> Actual
              </span>
              <span className="inline-flex items-center gap-1.5">
                <i className="inline-block h-0.5 w-4 rounded border-t-2 border-dashed border-accent-bright" /> Forecast
              </span>
            </span>
          </div>
          <svg viewBox="0 0 400 130" className="h-32 w-full" role="img" aria-label="Revenue rising through the forecast window">
            <defs>
              <linearGradient id="hero-band" x1="0" x2="0" y1="0" y2="1">
                <stop offset="0%" stopColor="#2e8a67" stopOpacity="0.22" />
                <stop offset="100%" stopColor="#2e8a67" stopOpacity="0.02" />
              </linearGradient>
            </defs>
            <g stroke="#e6ebe7">
              <line x1="0" x2="400" y1="30" y2="30" />
              <line x1="0" x2="400" y1="70" y2="70" />
              <line x1="0" x2="400" y1="110" y2="110" />
            </g>
            <path d="M240 56 L280 46 L320 38 L360 30 L400 20 L400 62 L360 70 L320 74 L280 76 L240 72 Z" fill="url(#hero-band)" />
            <path
              d="M0 96 L30 88 L60 92 L90 78 L120 82 L150 68 L180 74 L210 62 L240 64"
              fill="none"
              stroke="#1f6b4f"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
            <path
              d="M240 64 L280 60 L320 54 L360 48 L400 40"
              fill="none"
              stroke="#2e8a67"
              strokeWidth="2.5"
              strokeDasharray="6 5"
              strokeLinecap="round"
            />
            <line x1="240" x2="240" y1="8" y2="122" stroke="#6b7671" strokeDasharray="3 4" strokeOpacity="0.5" />
            <circle cx="240" cy="64" r="4.5" fill="#fff" stroke="#1f6b4f" strokeWidth="2.5" />
          </svg>
        </div>

        <div className="mt-3 flex gap-3 rounded-xl bg-accent-soft p-3.5">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-accent" />
          <div>
            <p className="text-[13px] font-semibold text-accent-strong">Opportunity detected</p>
            <p className="mt-0.5 text-[13px] leading-relaxed text-ink-muted">
              Weekday sales are 18% below your weekend-adjusted potential.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}

export function Hero() {
  const { user } = useAuth()
  return (
    <section className="relative overflow-hidden">
      <div className="bg-grid pointer-events-none absolute inset-0" aria-hidden="true" />
      <div className="relative mx-auto grid max-w-6xl items-center gap-14 px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1.05fr_1fr] lg:gap-12 lg:pb-28">
        <div className="rise">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent-soft px-3 py-1 text-xs font-medium text-accent-strong">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-bright" /> Early preview
          </span>
          <h1 className="mt-6 text-[2.6rem] font-semibold leading-[1.04] tracking-tight sm:text-6xl">
            See what changed.
            <br />
            <span className="text-accent">Understand why.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted">
            Ascend learns the rhythm of your business from its own history, then forecasts what comes next,
            flags unusual shifts, and points to where you can grow. It is the data analyst most small
            businesses never got to hire.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to={user ? '/dashboard' : '/signup'} size="lg">
              {user ? 'Open dashboard' : 'Get started'} <ArrowRight size={17} />
            </ButtonLink>
            <ButtonAnchor href="#how" variant="secondary" size="lg">
              See how it works
            </ButtonAnchor>
          </div>
          <p className="mt-6 text-sm text-ink-faint">
            Built for restaurants, retail, services and e-commerce teams with 12 to 24 months of history.
          </p>
        </div>

        <div className="rise [animation-delay:120ms]">
          <HeroPreview />
        </div>
      </div>
    </section>
  )
}
