import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, Link2, Trash2, X } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Button } from '@/components/ui/Button'
import { useValuation } from '@/valuation/useValuation'
import { createShare, listShares, revokeShare, shareUrl, sharesAreOnline, type ShareLink } from './shares'

const EXPIRY: { label: string; days: number | null }[] = [
  { label: '7 days', days: 7 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
  { label: 'Never', days: null },
]

const expires = (l: ShareLink) => (l.expiresAt ? `Expires ${new Date(l.expiresAt).toLocaleDateString()}` : 'Never expires')

/** Makes read-only links to a frozen copy of the open spreadsheet's whole report, and lets the owner switch them off. */
export function ShareDialog({ onClose }: { onClose: () => void }) {
  const { user } = useAuth()
  const { active, output } = useValuation()
  const userId = user?.id ?? null
  const [links, setLinks] = useState<ShareLink[]>([])
  const [days, setDays] = useState<number | null>(30)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  // The link just made, shown in a box so it can be copied by hand if the browser blocks the clipboard.
  const [fresh, setFresh] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (userId) setLinks(await listShares(userId))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    let live = true
    void listShares(userId).then((l) => live && setLinks(l))
    return () => {
      live = false
    }
  }, [userId])

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy(token: string) {
    try {
      await navigator.clipboard.writeText(shareUrl(token))
      setCopied(token)
      setTimeout(() => setCopied((c) => (c === token ? null : c)), 2000)
    } catch {
      // Clipboard blocked: the link stays visible in its box to select and copy.
    }
  }

  async function create() {
    if (!userId || !active || busy) return
    setBusy(true)
    setError(null)
    try {
      const link = await createShare(userId, active, days)
      setFresh(link.token)
      await refresh()
      await copy(link.token)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The link could not be made.')
    } finally {
      setBusy(false)
    }
  }

  async function revoke(token: string) {
    if (!userId) return
    await revokeShare(userId, token)
    setFresh((f) => (f === token ? null : f))
    await refresh()
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="share-title">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative max-h-[90vh] w-full max-w-[520px] overflow-y-auto rounded-card border border-line bg-surface p-6 shadow-pop">
        <button type="button" aria-label="Close" onClick={onClose} className="absolute right-3 top-3 grid h-9 w-9 place-items-center rounded-lg text-ink-muted hover:bg-sunken">
          <X size={18} />
        </button>
        <h2 id="share-title" className="text-lg font-semibold">Share a read-only link</h2>
        <p className="mt-1 text-sm text-ink-muted">
          Anyone with the link can view <span className="font-medium text-ink">{active?.name ?? 'this report'}</span> without signing in: overview, forecasts, funding snapshot, track record and goals. They cannot change anything.
        </p>

        {!output || !active ? (
          <p className="mt-4 rounded-lg bg-sunken px-3 py-2 text-sm text-ink-muted">Upload a spreadsheet and run the forecast first.</p>
        ) : (
          <>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="text-sm">
                <span className="mb-1 block font-medium">Link works for</span>
                <select value={days ?? 'never'} onChange={(e) => setDays(e.target.value === 'never' ? null : Number(e.target.value))} className="h-10 rounded-lg border border-line bg-surface px-3 text-sm">
                  {EXPIRY.map((x) => (
                    <option key={x.label} value={x.days ?? 'never'}>{x.label}</option>
                  ))}
                </select>
              </label>
              <Button onClick={() => void create()} disabled={busy}>
                <Link2 size={16} aria-hidden="true" /> {busy ? 'Making link...' : 'Create and copy link'}
              </Button>
            </div>
            <p className="mt-3 text-xs text-ink-faint">
              The link shows a copy of today's figures, including your monthly numbers. Later changes do not appear, so make a new link to share newer ones. Delete a link below to switch it off.
            </p>
            {!sharesAreOnline() && <p className="mt-2 rounded-lg bg-warn-soft px-3 py-2 text-xs text-warn">Demo mode: links only open in this browser. Connect Supabase to share with other people.</p>}
          </>
        )}

        {fresh && (
          <div className="mt-4 rounded-lg border border-accent-bright bg-accent-soft p-3">
            <p className="flex items-center gap-1.5 text-sm font-medium text-accent-ink">
              <Check size={15} aria-hidden="true" /> {copied === fresh ? 'Link copied' : 'Link ready'}
            </p>
            <div className="mt-2 flex gap-2">
              <input readOnly value={shareUrl(fresh)} aria-label="Share link" onFocus={(e) => e.currentTarget.select()} className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-surface px-3 text-[13px] text-ink-soft" />
              <Button size="sm" className="h-9" onClick={() => void copy(fresh)}>
                <Copy size={14} aria-hidden="true" /> Copy
              </Button>
            </div>
          </div>
        )}

        {error && <p role="alert" className="mt-3 rounded-lg bg-down-soft px-3 py-2 text-sm text-down">{error}</p>}

        {links.length > 0 && (
          <div className="mt-5">
            <h3 className="text-sm font-semibold">Your links</h3>
            <ul className="mt-2 divide-y divide-line-soft">
              {links.map((l) => (
                <li key={l.token} className="flex items-center gap-3 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{l.name}</p>
                    <p className="text-xs text-ink-faint">Made {new Date(l.createdAt).toLocaleDateString()} · {expires(l)}</p>
                  </div>
                  <button type="button" onClick={() => void copy(l.token)} className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[13px] font-medium hover:bg-sunken">
                    {copied === l.token ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
                    {copied === l.token ? 'Copied' : 'Copy'}
                  </button>
                  <button type="button" onClick={() => void revoke(l.token)} aria-label={`Delete link to ${l.name}`} title="Delete link" className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-down">
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  )
}
