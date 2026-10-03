import { ArrowRight } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { ButtonAnchor, ButtonLink } from '@/components/ui/Button'

function Figure({ label, value, delta, bad }: { label: string; value: string; delta: string; bad?: boolean }) {
  return (
    <div className="flex-1 px-4 first:pl-0 last:pr-0">
      <p className="text-xs text-ink-faint">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
      <p className={`tabular text-xs font-medium ${bad ? 'text-down' : 'text-up'}`}>{delta}</p>
    </div>
  )
}

/** A faithful miniature of the dashboard forecast: history, a dashed projection and its range. */
function HeroPlate() {
  return (
    <div className="rounded-xl border border-line bg-surface p-5 sm:p-6">
      <div className="flex items-baseline justify-between">
        <p className="text-sm font-medium">Bella's Cafe</p>
        <p className="text-sm text-ink-faint">
          Health <span className="tabular text-lg font-semibold text-accent">82</span>
        </p>
      </div>

      <div className="mt-5 flex divide-x divide-line-soft">
        <Figure label="Revenue" value="$50.6k" delta="+8.4%" />
        <Figure label="Expenses" value="$32.1k" delta="+3.1%" bad />
        <Figure label="Cash flow" value="$14.6k" delta="+11.2%" />
      </div>

      <svg viewBox="0 0 400 140" className="mt-6 h-36 w-full" role="img" aria-label="Revenue climbing, with a forecast range continuing upward">
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

      <p className="mt-4 border-t border-line-soft pt-4 text-sm text-ink-soft">
        <span className="font-medium text-accent-strong">Opportunity:</span> weekday sales are 18% below potential.
      </p>
    </div>
  )
}

export function Hero() {
  const { user } = useAuth()
  return (
    <section>
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-14 sm:px-8 md:pt-20 lg:grid-cols-[1.3fr_1fr] lg:gap-16 lg:pb-28">
        <div className="settle">
          <h1 className="font-display text-[2.8rem] leading-[1.02] sm:text-[3.7rem]">
            See what changed.
            <br />
            <span className="text-accent">Understand why.</span>
          </h1>
          <p className="mt-6 max-w-md text-lg leading-relaxed text-ink-muted">
            Forecasts, change alerts and growth opportunities, learned from your own business data.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <ButtonLink to={user ? '/dashboard' : '/signup'} size="lg">
              {user ? 'Open dashboard' : 'Get started'} <ArrowRight size={17} />
            </ButtonLink>
            <ButtonAnchor href="#how" variant="secondary" size="lg">
              How it works
            </ButtonAnchor>
          </div>
        </div>

        <div className="settle [animation-delay:150ms]">
          <HeroPlate />
        </div>
      </div>
    </section>
  )
}
