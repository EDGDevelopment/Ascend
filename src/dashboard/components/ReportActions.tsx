import { useState } from 'react'
import { Printer, Share2 } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { ShareDialog } from '@/share/ShareDialog'
import { useReadOnly } from '../readOnly'

/** Share a read-only link to the whole report, or print the page. Shown where a report is worth handing to someone else. */
export function ReportActions() {
  const [sharing, setSharing] = useState(false)
  // A shared link has its own print button and cannot be shared onward.
  if (useReadOnly()) return null
  return (
    <div className="flex shrink-0 gap-2 print:hidden">
      <Button variant="secondary" size="sm" onClick={() => setSharing(true)}>
        <Share2 size={14} aria-hidden="true" /> Share
      </Button>
      <Button variant="secondary" size="sm" onClick={() => window.print()}>
        <Printer size={14} aria-hidden="true" /> Print
      </Button>
      {sharing && <ShareDialog onClose={() => setSharing(false)} />}
    </div>
  )
}
