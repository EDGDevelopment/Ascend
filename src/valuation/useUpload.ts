import { useCallback, useState } from 'react'
import { blankInput } from './defaults'
import type { ModelInput, OrgType } from './engine'
import { parseSpreadsheet } from './spreadsheet'
import { useValuation } from './useValuation'

export interface UploadMessage {
  text: string
  bad?: boolean
}

/** Reads a spreadsheet and adds it to the client's datasets. Shared by every place a file can be dropped. */
export function useUpload() {
  const { addDataset } = useValuation()
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
    [addDataset],
  )

  return { upload, message, busy }
}
