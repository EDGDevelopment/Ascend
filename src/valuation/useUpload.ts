import { useCallback, useState } from 'react'
import { findMatch, mergeMonths, type MergeResult } from '../../supabase/functions/_shared/valuation/merge'
import { blankInput } from './defaults'
import type { ModelInput, OrgType } from './engine'
import { parseSpreadsheet } from './spreadsheet'
import { useValuation } from './useValuation'

/** A file that looks like a newer copy of a business already saved. Waits for the owner to choose. */
export interface PendingUpload {
  fileName: string
  name: string
  input: ModelInput
  /** The saved business it appears to update. */
  matchId: string
  matchName: string
  merge: MergeResult
  /** Shown with the choice, for example when the file has details Ascend will not overwrite. */
  warnings: string[]
}

export interface UploadReview {
  pending: PendingUpload | null
  choose: (what: 'update' | 'new') => Promise<void>
  cancel: () => void
}

export interface UploadMessage {
  text: string
  bad?: boolean
}

/** Reads a spreadsheet and adds it to the client's datasets. Shared by every place a file can be dropped. */
export function useUpload() {
  const { datasets, addDataset, updateDataset } = useValuation()
  const [pending, setPending] = useState<PendingUpload | null>(null)
  const [message, setMessage] = useState<UploadMessage | null>(null)
  const [busy, setBusy] = useState(false)

  const upload = useCallback(
    async (file: File | undefined, orgType: OrgType): Promise<boolean> => {
      if (!file) return false
      setBusy(true)
      try {
        const parsed = await parseSpreadsheet(file)
        if (parsed.monthly.length < 12) {
          setMessage({ text: parsed.warnings[0] ?? `Found ${parsed.monthly.length} usable months. Ascend needs at least 12.`, bad: true })
          return false
        }
        const base = blankInput(parsed.orgType ?? orgType)
        const input: ModelInput = {
          ...base,
          companyName: parsed.companyName ?? '',
          monthly: parsed.monthly,
          local: { ...base.local, ...parsed.local },
          nonprofit: { ...base.nonprofit, ...parsed.nonprofit, mix: { ...base.nonprofit.mix, ...parsed.nonprofit.mix } },
        }
        const name = parsed.companyName?.trim() || file.name.replace(/\.[^.]+$/, '')
        const match = findMatch(datasets, input.orgType, [parsed.companyName, name])
        if (match) {
          const merge = mergeMonths(match.input.monthly, parsed.monthly)
          if (!merge.error && merge.added === 0 && merge.changed === 0) {
            setMessage({ text: `${match.name} already has every month in ${file.name}. Nothing new to add.` })
            return true
          }
          setPending({ fileName: file.name, name, input, matchId: match.id, matchName: match.name, merge, warnings: parsed.warnings })
          setMessage(null)
          return true
        }
        const details = Object.keys(parsed.local).length + Object.keys(parsed.nonprofit).length
        setMessage({ text: `Added ${parsed.monthly.length} months from ${file.name}${details ? ` and ${details} details` : ''}.${parsed.warnings.length ? ` ${parsed.warnings.join(' ')}` : ''}` })
        await addDataset({ name, fileName: file.name, input })
        return true
      } catch (e) {
        setMessage({ text: e instanceof Error ? e.message : 'That file could not be read.', bad: true })
        return false
      } finally {
        setBusy(false)
      }
    },
    [addDataset, datasets],
  )

  const choose = useCallback(
    async (what: 'update' | 'new') => {
      if (!pending) return
      const p = pending
      setPending(null)
      setBusy(true)
      try {
        if (what === 'update' && !p.merge.error) {
          const bits = [`${p.merge.added} new month${p.merge.added === 1 ? '' : 's'}`, p.merge.changed ? `${p.merge.changed} corrected` : ''].filter(Boolean).join(', ')
          setMessage({ text: `Updated ${p.matchName} with ${bits} from ${p.fileName}.${p.merge.droppedExpenses ? ' Some months had no expenses, so expenses were left out of the forecast.' : ''}` })
          await updateDataset(p.matchId, { fileName: p.fileName, monthly: p.merge.monthly })
        } else {
          setMessage({ text: `Added ${p.input.monthly.length} months from ${p.fileName} as a separate business.` })
          await addDataset({ name: p.name, fileName: p.fileName, input: p.input })
        }
      } finally {
        setBusy(false)
      }
    },
    [pending, addDataset, updateDataset],
  )

  const review: UploadReview = { pending, choose, cancel: () => setPending(null) }
  return { upload, message, busy, review }
}
