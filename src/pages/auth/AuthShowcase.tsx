import { Sparkles, TrendingUp } from 'lucide-react'

/** Decorative product preview shown beside the auth forms on large screens. */
export function AuthShowcase() {
  return (
    <aside
      aria-hidden="true"
      className="relative hidden overflow-hidden bg-[#10261d] text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16"
    >
      <div className="bg-grid pointer-events-none absolute inset-0 opacity-40" />
      <div className="pointer-events-none absolute -right-24 -top-24 h-96 w-96 rounded-full bg-accent-bright/25 blur-3xl" />

      <div className="relative">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#7fd1ad]">
          Growth intelligence
        </p>
        <h2 className="mt-4 max-w-md text-3xl font-semibold leading-tight tracking-tight xl:text-4xl">
          See what changed. Understand why. Find your next opportunity.
        </h2>
      </div>

      <div className="relative mx-auto w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.06] p-5 shadow-2xl backdrop-blur">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs text-white/60">Revenue forecast</p>
            <p className="tabular mt-1 text-2xl font-semibold">$48,240</p>
          </div>
          <span className="inline-flex items-center gap-1 rounded-full bg-[#7fd1ad]/15 px-2.5 py-1 text-xs font-medium text-[#7fd1ad]">
            <TrendingUp size={13} /> +8.4%
          </span>
        </div>

        <svg viewBox="0 0 360 120" className="mt-4 h-28 w-full" role="presentation">
          <defs>
            <linearGradient id="showcase-fill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#7fd1ad" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#7fd1ad" stopOpacity="0" />
            </linearGradient>
          </defs>
          <path
            d="M0 88 L30 80 L60 84 L90 66 L120 70 L150 52 L180 56 L210 40"
            fill="none"
            stroke="#7fd1ad"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M210 40 L240 34 L270 24 L300 28 L330 14 L360 10 L360 120 L210 120 Z"
            fill="url(#showcase-fill)"
          />
          <path
            d="M210 40 L240 34 L270 24 L300 28 L330 14 L360 10"
            fill="none"
            stroke="#7fd1ad"
            strokeWidth="2.5"
            strokeDasharray="5 5"
            strokeLinecap="round"
          />
          <line x1="210" x2="210" y1="0" y2="120" stroke="white" strokeOpacity="0.25" strokeDasharray="3 4" />
        </svg>
        <div className="mt-1 flex justify-between text-[11px] text-white/50">
          <span>Past 12 months</span>
          <span>Next 90 days</span>
        </div>

        <div className="mt-5 flex gap-3 rounded-xl bg-white/[0.07] p-3.5">
          <Sparkles size={18} className="mt-0.5 shrink-0 text-[#7fd1ad]" />
          <div>
            <p className="text-[13px] font-medium">Opportunity detected</p>
            <p className="mt-0.5 text-xs leading-relaxed text-white/65">
              Weekday demand is 18% below your weekend-adjusted potential.
            </p>
          </div>
        </div>
      </div>

      <p className="relative text-xs text-white/45">
        Forecasts powered by a custom time-series neural network.
      </p>
    </aside>
  )
}
