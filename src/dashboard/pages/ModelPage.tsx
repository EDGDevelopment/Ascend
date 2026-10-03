import { useEffect, useRef, useState } from 'react'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { Play } from 'lucide-react'
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
    ['Context window', `${model.contextMonths} months`],
    ['Horizon', `${model.horizonDays} days`],
    ['Parameters', model.parameters],
    ['Last trained', model.lastTrained],
  ]

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold tracking-tight">{model.name}</h2>
          <p className="text-sm text-ink-muted">{model.version}</p>
        </div>
        <div className="flex items-center gap-4">
          <p role="status" className="text-xs text-ink-faint">
            {lastRun ? `Sample run at ${lastRun}` : 'Production model not connected'}
          </p>
          <Button onClick={runForecast} disabled={running}>
            <Play size={15} aria-hidden="true" /> {running ? 'Running...' : 'Run sample forecast'}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Configuration">
          <dl className="divide-y divide-line-soft text-[13.5px]">
            {specs.map(([k, v]) => (
              <div key={k} className="flex justify-between gap-4 py-2.5 first:pt-0 last:pb-0">
                <dt className="text-ink-faint">{k}</dt>
                <dd className="text-right font-medium">{v}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card title="Forecast error" subtitle="Mean absolute percentage error, lower is better">
          <div className="h-[210px]" role="img" aria-label="Forecast error rises from 3.1 percent at 30 days to 6.7 percent at 90 days">
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
                <Bar dataKey="error" fill="var(--color-accent)" radius={[4, 4, 0, 0]} maxBarSize={56} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      <Card title="Training runs" padded={false}>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[560px] text-left text-sm">
            <caption className="sr-only">Recent model training runs</caption>
            <thead>
              <tr className="border-y border-line-soft bg-page text-xs text-ink-faint">
                <th scope="col" className="px-5 py-2.5 font-medium">Run</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Date</th>
                <th scope="col" className="px-5 py-2.5 text-right font-medium">MAPE</th>
                <th scope="col" className="px-5 py-2.5 font-medium">Notes</th>
              </tr>
            </thead>
            <tbody>
              {data.trainingRuns.map((r) => (
                <tr key={r.id} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="px-5 py-3 font-mono text-[13px] font-medium">{r.id}</th>
                  <td className="px-5 py-3 text-ink-muted">{r.date}</td>
                  <td className="px-5 py-3 text-right font-semibold">{r.mape}%</td>
                  <td className="px-5 py-3 text-ink-muted">{r.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
