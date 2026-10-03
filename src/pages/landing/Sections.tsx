import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowRight,
  Check,
  Database,
  Eye,
  Layers,
  LineChart,
  Network,
  Radar,
  Rocket,
  Sparkles,
  X,
} from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { LogoMark } from '@/components/Logo'
import { ButtonLink } from '@/components/ui/Button'

function SectionHeader({ eyebrow, title, children, light = false }: { eyebrow: string; title: string; children?: ReactNode; light?: boolean }) {
  return (
    <div className="max-w-2xl">
      <p className={`eyebrow ${light ? '!text-[#7fd1ad]' : ''}`}>{eyebrow}</p>
      <h2 className={`mt-3 text-3xl font-semibold leading-tight tracking-tight sm:text-4xl ${light ? 'text-white' : ''}`}>{title}</h2>
      {children && <p className={`mt-4 text-[17px] leading-relaxed ${light ? 'text-white/65' : 'text-ink-muted'}`}>{children}</p>}
    </div>
  )
}

const shell = 'mx-auto max-w-6xl px-5 sm:px-8'

const steps = [
  { n: '01', icon: Eye, name: 'Understand', q: 'What changed?', text: 'Ascend reads your revenue, expenses, payroll and inventory together and surfaces the shifts that matter, not just the totals.' },
  { n: '02', icon: LineChart, name: 'Predict', q: 'What happens next?', text: 'A forecast for each series, with an honest range around it, so you can plan cash and staffing with confidence.' },
  { n: '03', icon: Rocket, name: 'Grow', q: 'Where is the opportunity?', text: 'Changes are translated into specific, ranked actions written for a business owner rather than a data scientist.' },
]

export function HowItWorks() {
  return (
    <section id="how" className="scroll-mt-20 border-y border-line-soft bg-surface">
      <div className={`${shell} py-20 sm:py-24`}>
        <SectionHeader eyebrow="How it works" title="Small businesses have data. They do not have a data team.">
          Spreadsheets show what happened. Ascend adds the two things owners actually ask: what is going to happen, and what should I do about it.
        </SectionHeader>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {steps.map(({ n, icon: Icon, name, q, text }) => (
            <li key={n} className="rounded-2xl border border-line-soft bg-page p-6">
              <div className="flex items-center justify-between">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-accent-soft text-accent">
                  <Icon size={20} />
                </span>
                <span className="tabular text-sm font-medium text-ink-faint">{n}</span>
              </div>
              <h3 className="mt-5 text-lg font-semibold">{name}</h3>
              <p className="text-sm font-medium text-accent">{q}</p>
              <p className="mt-3 text-[15px] leading-relaxed text-ink-muted">{text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

function PipelineNode({ icon: Icon, title, items, accent = false }: { icon: typeof Database; title: string; items: string[]; accent?: boolean }) {
  return (
    <div className={`rounded-2xl border p-5 ${accent ? 'border-[#7fd1ad]/40 bg-[#7fd1ad]/10' : 'border-white/10 bg-white/[0.05]'}`}>
      <div className="flex items-center gap-2.5">
        <Icon size={18} className="text-[#7fd1ad]" />
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <ul className="mt-3 flex flex-wrap gap-1.5">
        {items.map((i) => (
          <li key={i} className="rounded-md bg-white/10 px-2 py-1 text-xs text-white/75">
            {i}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function ModelSection() {
  return (
    <section id="model" className="scroll-mt-20 bg-[#10261d]">
      <div className={`${shell} py-20 sm:py-24`}>
        <SectionHeader light eyebrow="The model" title="A neural network that learns one business at a time">
          Ascend is built around a custom time-series transformer. It splits history into patches, learns how your numbers move together, and projects them forward.
        </SectionHeader>

        <div className="mt-12 grid items-stretch gap-4 lg:grid-cols-[1fr_auto_1fr_auto_1fr]">
          <PipelineNode icon={Database} title="Your history" items={['Revenue', 'Expenses', 'Cash flow', 'Payroll', 'Inventory', 'Customers']} />
          <div className="grid place-items-center text-[#7fd1ad]" aria-hidden="true">
            <ArrowRight size={22} className="rotate-90 lg:rotate-0" />
          </div>
          <PipelineNode accent icon={Network} title="Ascend time-series model" items={['Patching', 'Transformer encoder', 'Per-business fine tuning']} />
          <div className="grid place-items-center text-[#7fd1ad]" aria-hidden="true">
            <ArrowRight size={22} className="rotate-90 lg:rotate-0" />
          </div>
          <PipelineNode icon={Radar} title="Signals" items={['Forecast', 'Change signal', 'Growth signal']} />
        </div>

        <div className="mt-10 grid gap-4 sm:grid-cols-3">
          {[
            ['12 to 24 months', 'of history is enough to learn seasonality and trend.'],
            ['Deviation, not averages', 'Compares you to your own pattern instead of a generic benchmark.'],
            ['Explained in plain words', 'Every signal comes with the reasoning an owner can act on.'],
          ].map(([h, t]) => (
            <div key={h} className="rounded-2xl border border-white/10 p-5">
              <p className="text-base font-semibold text-white">{h}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-white/60">{t}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-xs text-white/40">The production model is in development.</p>
      </div>
    </section>
  )
}

export function ProductSection() {
  const rows: [string, string][] = [
    ['Shows revenue', 'Forecasts revenue'],
    ['Shows expenses', 'Detects unusual changes'],
    ['Static monthly reports', 'Continuous predictions'],
    ['Generic benchmarks', 'Patterns specific to your business'],
    ['A dashboard of numbers', 'Ranked growth opportunities'],
  ]
  return (
    <section id="product" className="scroll-mt-20">
      <div className={`${shell} py-20 sm:py-24`}>
        <SectionHeader eyebrow="Product" title="From raw data to one clear picture">
          One workspace for the health of your business, the next 90 days, and the moves worth making.
        </SectionHeader>

        <div className="mt-12 grid gap-5 md:grid-cols-2">
          {[
            { icon: Layers, t: 'One health score', d: 'Revenue, cash, costs and demand rolled into a single 0 to 100 score, with every contributing factor visible.' },
            { icon: LineChart, t: 'Forecasts with a range', d: 'Projected revenue, expenses and cash flow with confidence bands, and scenarios you can explore.' },
            { icon: Radar, t: 'Change detection', d: 'Spots when a metric drifts from its historical pattern, such as inventory turnover falling or weekdays softening.' },
            { icon: Sparkles, t: 'Opportunities, ranked', d: 'Each finding is sized by estimated impact and confidence, so the first thing you read is the most valuable.' },
          ].map(({ icon: Icon, t, d }) => (
            <div key={t} className="flex gap-4 rounded-2xl border border-line bg-surface p-6 shadow-card">
              <span className="grid h-11 w-11 shrink-0 place-items-center rounded-xl bg-accent-soft text-accent">
                <Icon size={21} />
              </span>
              <div>
                <h3 className="text-base font-semibold">{t}</h3>
                <p className="mt-1.5 text-[15px] leading-relaxed text-ink-muted">{d}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="mt-14 overflow-hidden rounded-2xl border border-line bg-surface">
          <div className="grid grid-cols-2 border-b border-line text-sm font-semibold">
            <div className="px-5 py-3.5 text-ink-faint">Traditional business software</div>
            <div className="bg-accent-soft px-5 py-3.5 text-accent-strong">Ascend</div>
          </div>
          {rows.map(([a, b]) => (
            <div key={a} className="grid grid-cols-2 border-b border-line-soft text-[15px] last:border-b-0">
              <div className="flex items-center gap-2.5 px-5 py-3.5 text-ink-muted">
                <X size={15} className="shrink-0 text-ink-faint" /> {a}
              </div>
              <div className="flex items-center gap-2.5 bg-accent-soft/40 px-5 py-3.5 font-medium">
                <Check size={15} className="shrink-0 text-accent" /> {b}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export function RoadmapSection() {
  const stages = [
    { n: '1', t: 'Business', d: 'Individual growth intelligence for a single business, trained on its own history.' },
    { n: '2', t: 'Industry', d: 'Industry-specific models for restaurants, retail, services and e-commerce.' },
    { n: '3', t: 'Platform', d: 'An API so accounting and business software can embed Ascend intelligence.' },
  ]
  return (
    <section id="roadmap" className="scroll-mt-20 border-t border-line-soft bg-surface">
      <div className={`${shell} py-20 sm:py-24`}>
        <SectionHeader eyebrow="Roadmap" title="Start with one business. Grow into an intelligence network.">
          Privacy and data governance shape each stage. Patterns can be learned without businesses exposing sensitive financials to one another.
        </SectionHeader>
        <ol className="mt-12 grid gap-5 md:grid-cols-3">
          {stages.map((s) => (
            <li key={s.n} className="relative rounded-2xl border border-line-soft bg-page p-6">
              <span className="tabular grid h-9 w-9 place-items-center rounded-full bg-accent text-sm font-semibold text-white">{s.n}</span>
              <h3 className="mt-4 text-lg font-semibold">{s.t}</h3>
              <p className="mt-2 text-[15px] leading-relaxed text-ink-muted">{s.d}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function FinalCta() {
  const { user } = useAuth()
  return (
    <section className="px-5 py-20 sm:px-8 sm:py-24">
      <div className="mx-auto max-w-4xl rounded-3xl bg-accent px-6 py-14 text-center text-white sm:px-12">
        <h2 className="text-3xl font-semibold tracking-tight sm:text-4xl">Grow with data, not guesswork.</h2>
        <p className="mx-auto mt-4 max-w-xl text-[17px] text-white/75">
          Explore the Ascend preview, from forecasts to ranked opportunities.
        </p>
        <div className="mt-8 flex justify-center">
          <ButtonLink to={user ? '/dashboard' : '/signup'} size="lg" variant="secondary" className="!border-transparent">
            {user ? 'Open dashboard' : 'Create an account'} <ArrowRight size={17} />
          </ButtonLink>
        </div>
      </div>
    </section>
  )
}

export function Footer() {
  return (
    <footer className="border-t border-line-soft">
      <div className={`${shell} flex flex-col items-start justify-between gap-6 py-10 sm:flex-row sm:items-center`}>
        <div className="flex items-center gap-2.5">
          <LogoMark size={24} />
          <span className="font-semibold">Ascend</span>
        </div>
        <nav aria-label="Footer" className="flex gap-6 text-sm text-ink-muted">
          <Link to="/login" className="hover:text-ink">Sign in</Link>
          <Link to="/signup" className="hover:text-ink">Get started</Link>
          <a href="#how" className="hover:text-ink">How it works</a>
        </nav>
        <p className="text-xs text-ink-faint">&copy; 2026 Ascend. Early preview.</p>
      </div>
    </footer>
  )
}
