import { useRef, useState } from 'react'
import { Upload } from 'lucide-react'
import { useDashboardData } from '@/data/useDashboardData'
import type { DataSource } from '@/data/types'
import { formatNumber } from '@/lib/format'
import { Button } from '@/components/ui/Button'
import { SourceBadge } from '../components/Badges'
import { Card } from '../components/Card'

export default function DataSourcesPage() {
  const data = useDashboardData()
  const [sources, setSources] = useState<DataSource[]>(data.sources)
  const [message, setMessage] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  // Mock upload: nothing leaves the browser. The file is listed, then "validated" after a short delay.
  function onFile(file: File | undefined) {
    if (!file) return
    const id = `upload-${Date.now()}`
    setSources((s) => [
      { id, name: file.name, type: 'CSV upload', status: 'Syncing', lastSync: 'Just now', records: 0, coverage: 'Checking' },
      ...s,
    ])
    setMessage(`Validating ${file.name}. In this demo the file is not uploaded anywhere.`)
    window.setTimeout(() => {
      setSources((s) =>
        s.map((x) => (x.id === id ? { ...x, status: 'Healthy', records: 1200 + (file.size % 800), coverage: '12 months' } : x)),
      )
      setMessage(`${file.name} passed validation with sample results.`)
    }, 1600)
    if (input.current) input.current.value = ''
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p className="max-w-xl text-sm text-ink-muted">
          Ascend learns from 12 to 24 months of history. Connect the systems you already use or drop in a CSV export.
        </p>
        <div>
          <input
            ref={input}
            type="file"
            accept=".csv"
            className="sr-only"
            id="csv-upload"
            onChange={(e) => onFile(e.target.files?.[0])}
          />
          <Button onClick={() => input.current?.click()}>
            <Upload size={16} /> Upload CSV
          </Button>
        </div>
      </div>

      {message && (
        <p role="status" className="rounded-lg border border-accent/20 bg-accent-soft px-4 py-3 text-[13px] text-accent-strong">
          {message}
        </p>
      )}

      <Card title="Connected sources" padded={false}>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Connected data sources</caption>
            <thead>
              <tr className="border-y border-line-soft bg-page text-xs uppercase tracking-wide text-ink-faint">
                <th scope="col" className="px-5 py-3 font-medium">Source</th>
                <th scope="col" className="px-5 py-3 font-medium">Type</th>
                <th scope="col" className="px-5 py-3 font-medium">Status</th>
                <th scope="col" className="px-5 py-3 text-right font-medium">Records</th>
                <th scope="col" className="px-5 py-3 font-medium">Coverage</th>
                <th scope="col" className="px-5 py-3 font-medium">Last sync</th>
              </tr>
            </thead>
            <tbody>
              {sources.map((s) => (
                <tr key={s.id} className="border-b border-line-soft last:border-0">
                  <th scope="row" className="px-5 py-3.5 font-medium">{s.name}</th>
                  <td className="px-5 py-3.5 text-ink-muted">{s.type}</td>
                  <td className="px-5 py-3.5"><SourceBadge status={s.status} /></td>
                  <td className="tabular px-5 py-3.5 text-right">{s.records ? formatNumber(s.records) : '...'}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{s.coverage}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{s.lastSync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card title="What the model needs" subtitle="Minimum coverage for dependable forecasts">
        <ul className="grid gap-4 sm:grid-cols-3">
          {[
            ['Revenue and transactions', '12 months or more, daily or weekly'],
            ['Expenses and payroll', '12 months or more, monthly is fine'],
            ['Inventory (optional)', 'Improves turnover and demand signals'],
          ].map(([t, d]) => (
            <li key={t} className="rounded-xl bg-page p-4">
              <p className="text-sm font-semibold">{t}</p>
              <p className="mt-1 text-[13px] text-ink-muted">{d}</p>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  )
}
