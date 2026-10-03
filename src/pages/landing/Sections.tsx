import { Link } from 'react-router-dom'
import { ArrowRight, Check, X } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { LogoMark } from '@/components/Logo'
import { ButtonLink } from '@/components/ui/Button'

const shell = 'mx-auto max-w-6xl px-5 sm:px-8'
const h2 = 'headline text-[1.75rem] leading-[1.15] sm:text-[2.25rem]'

const steps = [
  ['Understand', 'What changed, across revenue, costs, payroll and inventory.'],
  ['Predict', 'Where each number is heading, with an honest range.'],
  ['Grow', 'Ranked actions written for the owner, not an analyst.'],
]

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-16 border-y border-line-soft bg-surface">
      <div className={`${shell} grid gap-12 py-20 sm:py-24 lg:grid-cols-[1fr_1.2fr]`}>
        <h2 className={h2}>Small businesses have data. Now they have an analyst.</h2>
        <dl className="divide-y divide-line-soft self-center border-y border-line-soft">
          {steps.map(([name, text]) => (
            <div key={name} className="grid gap-1 py-5 sm:grid-cols-[130px_1fr] sm:gap-6">
              <dt className="text-lg font-semibold">{name}</dt>
              <dd className="text-ink-muted">{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}

function Stage({ title, items, strong = false }: { title: string; items: string[]; strong?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 ${strong ? 'border-[#7fd1ad]/50 bg-white/[0.07]' : 'border-white/15'}`}>
      <h3 className="text-sm font-semibold text-white">{title}</h3>
      <p className="mt-2 text-sm leading-relaxed text-white/70">{items.join('  ·  ')}</p>
    </div>
  )
}

export function ModelSection() {
  return (
    <section id="model" className="scroll-mt-16 bg-forest text-white">
      <div className={`${shell} py-20 sm:py-24`}>
        <h2 className={`${h2} max-w-2xl`}>A neural network that learns one business at a time.</h2>
        <p className="mt-5 max-w-xl text-lg text-white/70">
          Your history goes in. Forecasts, change signals and growth signals come out.
        </p>

        <div className="mt-12 grid items-center gap-3 lg:grid-cols-[1fr_auto_1.2fr_auto_1fr]">
          <Stage title="Your history" items={['Revenue', 'Expenses', 'Cash flow', 'Payroll', 'Inventory']} />
          <ArrowRight aria-hidden="true" size={20} className="mx-auto rotate-90 text-[#7fd1ad] lg:rotate-0" />
          <Stage strong title="Ascend time-series model" items={['Patches', 'Transformer', 'Per-business tuning']} />
          <ArrowRight aria-hidden="true" size={20} className="mx-auto rotate-90 text-[#7fd1ad] lg:rotate-0" />
          <Stage title="Signals" items={['Forecast', 'Change', 'Growth']} />
        </div>
        <p className="mt-6 text-sm text-white/55">Needs 12 to 24 months of history. Production model in development.</p>
      </div>
    </section>
  )
}

const features = [
  ['A single health score', 'Revenue, cash, costs and demand in one number you can track.'],
  ['Forecasts with a range', 'The next 90 days, plus scenarios to test.'],
  ['Change detection', 'Alerts when a metric drifts from its own pattern.'],
  ['Ranked opportunities', 'Sized by dollar impact and confidence.'],
]

const compare: [string, string][] = [
  ['Shows revenue', 'Forecasts revenue'],
  ['Static reports', 'Continuous predictions'],
  ['Generic benchmarks', 'Your own patterns'],
  ['A dashboard of numbers', 'Ranked growth opportunities'],
]

export function ProductSection() {
  return (
    <section id="product" className="scroll-mt-16">
      <div className={`${shell} py-20 sm:py-24`}>
        <h2 className={`${h2} max-w-2xl`}>From raw data to one clear picture.</h2>

        <dl className="mt-12 grid gap-x-12 gap-y-8 sm:grid-cols-2">
          {features.map(([t, d]) => (
            <div key={t}>
              <dt className="text-lg font-semibold">{t}</dt>
              <dd className="mt-1 text-ink-muted">{d}</dd>
            </div>
          ))}
        </dl>

        <div className="mt-16 overflow-hidden rounded-xl border border-line bg-surface">
          <div className="grid grid-cols-2 border-b border-line text-sm font-semibold">
            <div className="px-5 py-3 text-ink-faint">Traditional software</div>
            <div className="bg-accent-soft px-5 py-3 text-accent-ink">Ascend</div>
          </div>
          {compare.map(([a, b]) => (
            <div key={a} className="grid grid-cols-2 border-b border-line-soft last:border-b-0">
              <div className="flex items-center gap-2.5 px-5 py-3.5 text-ink-muted">
                <X size={15} aria-hidden="true" className="shrink-0 text-ink-faint" /> {a}
              </div>
              <div className="flex items-center gap-2.5 bg-accent-soft/40 px-5 py-3.5 font-medium">
                <Check size={15} aria-hidden="true" className="shrink-0 text-accent-ink" /> {b}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

const stages = [
  ['Business', 'Intelligence trained on one business.'],
  ['Industry', 'Models for restaurants, retail, services and e-commerce.'],
  ['Platform', 'An API for accounting and business software.'],
]

export function RoadmapSection() {
  return (
    <section id="roadmap" className="scroll-mt-16 border-t border-line-soft bg-surface">
      <div className={`${shell} pb-14 pt-20 sm:pb-16 sm:pt-24`}>
        <h2 className={`${h2} max-w-2xl`}>Start with one business. Grow into a network.</h2>
        <ol className="mt-12 grid gap-8 md:grid-cols-3">
          {stages.map(([t, d], i) => (
            <li key={t} className="border-t-2 border-ink pt-4" aria-label={`Stage ${i + 1}`}>
              <h3 className="text-lg font-semibold">{t}</h3>
              <p className="mt-1.5 text-ink-muted">{d}</p>
            </li>
          ))}
        </ol>
        <p className="mt-8 text-sm text-ink-faint">Privacy first: patterns are learned without businesses exposing financials to each other.</p>
      </div>
    </section>
  )
}

export function FinalCta() {
  const { user } = useAuth()
  return (
    <section className={`${shell} py-12 sm:py-14`}>
      <div className="flex flex-col items-start justify-between gap-6 rounded-2xl bg-accent px-8 py-10 text-white sm:flex-row sm:items-center sm:px-12">
        <h2 className="headline text-[1.75rem] leading-[1.15] sm:text-[2.25rem]">Grow with data, not guesswork.</h2>
        <ButtonLink to={user ? '/dashboard' : '/signup'} size="lg" variant="secondary" className="shrink-0 !border-transparent">
          {user ? 'Open dashboard' : 'Get started'} <ArrowRight size={17} />
        </ButtonLink>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line-soft">
      <div className={`${shell} flex flex-col items-start justify-between gap-5 py-8 sm:flex-row sm:items-center`}>
        <div className="flex items-center gap-2.5">
          <LogoMark size={22} />
          <span className="font-semibold">Ascend</span>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm text-ink-muted">
          <Link to="/login" className="hover:text-ink">Sign in</Link>
          <Link to="/signup" className="hover:text-ink">Get started</Link>
        </nav>
        <p className="text-xs text-ink-faint">&copy; 2026 Ascend. Early preview.</p>
      </div>
    </footer>
  )
}
