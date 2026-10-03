import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Cpu, Play } from 'lucide-react'
import { useDashboardData } from '@/data/useDashboardData'
import { Button } from '@/components/ui/Button'
import { Card } from '../components/Card'

export default function ModelPage() {
  const data = useDashboardData()
  const { model } = data
  const [running, setRunning] = useState(false)
  const [lastRun, setLastRun] = useState<string | null>(null)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  // Mock inference run. The real call will go to the model service.
  function runForecast() {
    setRunning(true)
    timer.current = window.setTimeout(() => {
      setRunning(false)
      setLastRun(new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }))
    }, 1800)
  }

  const specs: [string, string][] = [
    ['Architecture', model.architecture],
    ['Patch length', `${model.patchLength} months`],
    ['Stride', `${model.stride} month`],
    ['Context window', `${model.contextMonths} months`],
    ['Horizon', `${model.horizonDays} days`],
    ['Parameters', model.parameters],
    ['Last trained', model.lastTrained],
  ]

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-4 rounded-card border border-line bg-surface p-5 shadow-card sm:p-6">
        <div className="flex items-start gap-4">
          <span className="grid h-12 w-12 shrink-0 place-items-center rounded-xl bg-accent text-white">
            <Cpu size={24} />
          </span>
          <div>
            <h2 className="text-lg font-semibold tracking-tight">{model.name}</h2>
            <p className="mt-0.5 text-sm text-ink-muted">{model.version}</p>
            <span className="mt-2 inline-flex rounded-full bg-warn-soft px-2.5 py-0.5 text-xs font-medium text-warn">
              {model.status}
            </span>
          </div>
        </div>
        <div className="text-right">
          <Button onClick={runForecast} disabled={running}>
            <Play size={15} /> {running ? 'Running...' : 'Run sample forecast'}
          </Button>
          <p role="status" className="mt-2 text-xs text-ink-faint">
            {lastRun ? `Sample output generated at ${lastRun}` : 'The production model is not connected yet.'}
          </p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Configuration" subtitle="Current prototype settings">
          <dl className="space-y-3 text-[13.5px]">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 border-b border-line-soft pb-3 last:border-0 last:pb-0">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Forecast error by horizon" subtitle="Mean absolute percentage error, lower is better">
          <div className="h-[230px]" role="img" aria-label="Forecast error rises from 3.1 percent at 30 days to 6.7 percent at 90 days">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data.accuracy} margin={{ top: 8, right: 4, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="var(--color-line-soft)" vertical={false} />
                <XAxis dataKey="horizon" tickLine={false} axisLine={false} tick={{ fontSize: 12, fill: 'var(--color-ink-faint)' }} />
                <YAxis tickLine={false} axisLine={false} width={36} tick={{ fontSize: 12, fill: 'var(--color-ink-faint)' }} tickFormatter={(v) => `${v}%`} />
                <Tooltip
                  cursor={{ fill: 'var(--color-sunken)' }}
                  contentStyle={{ borderRadius: 10, border: '1px solid var(--color-line)', boxShadow: 'var(--shadow-pop)', fontSize: 13 }}
                  formatter={(v) => [`${v}%`, 'Error']}
                />
                <Bar dataKey="error" fill="var(--color-accent)" radius={[5, 5, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Training runs" padded={false}>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[620px] text-left text-sm">
            <caption className="sr-only">Recent model training runs</caption>
            <thead>
              <tr className="border-y border-line-soft bg-page text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="px-5 py-3 font-medium">Run</th>
                <th scope="col" className="px-5 py-3 font-medium">Date</th>
                <th scope="col" className="px-5 py-3 font-medium">Dataset</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">MAPE</th>
                <th scope="col" className="px-5 py-3 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.trainingRuns.map((r) => (
                <tr key={r.id} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="px-5 py-3.5 font-mono text-[13px] font-medium">{r.id}</th>
                  <td className="px-5 py-3.5 text-ink-muted">{r.date}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{r.dataset}</td>
                  <td className="tabular px-5 py-3.5 text-right font-semibold">{r.mape}%</td>
                  <td className="px-5 py-3.5 text-ink-muted">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
