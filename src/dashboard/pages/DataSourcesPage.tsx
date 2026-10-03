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
    setMessage(`Validating ${file.name}...`)
    window.setTimeout(() => {
      setSources((s) =>
        s.map((x) => (x.id === id ? { ...x, status: 'Healthy', records: 1200 + (file.size % 800), coverage: '12 months' } : x)),
      )
      setMessage(`${file.name} passed validation.`)
    }, 1600)
    if (input.current) input.current.value = ''
  }

  return (
    <div className="mx-auto max-w-[1100px] space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <p role="status" className="text-sm text-ink-muted">
          {message ?? 'Ascend needs 12 to 24 months of history.'}
        </p>
        <div>
          <input ref={input} type="file" accept=".csv" className="sr-only" id="csv-upload" aria-label="Upload a CSV file" onChange={(e) => onFile(e.target.files?.[0])} />
          <Button onClick={() => input.current?.click()}>
            <Upload size={16} aria-hidden="true" /> Upload CSV
          </Button>
        </div>
      </div>

      <Card padded={false}>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px] text-left text-sm">
            <caption className="sr-only">Connected data sources</caption>
            <thead>
              <tr className="border-b border-line-soft text-xs text-ink-faint">
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
                  <td className="px-5 py-3.5 text-right">{s.records ? formatNumber(s.records) : '...'}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{s.coverage}</td>
                  <td className="px-5 py-3.5 text-ink-muted">{s.lastSync}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}
