import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/useAuth'
import { defaultInput } from './defaults'
import type { ModelInput, ModelOutput } from './engine'
import { computeModel, loadLocal, loadRemote, saveLocal, saveRemote, type ComputeSource } from './service'
import { ValuationContext } from './ValuationContext'

export function ValuationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [input, setInputState] = useState<ModelInput>(() => defaultInput())
  const [output, setOutput] = useState<ModelOutput | null>(null)
  const [source, setSource] = useState<ComputeSource | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [loadId, setLoadId] = useState(0)

  // Load the signed-in user's saved model: instantly from this browser, then from the database if it has one.
  useEffect(() => {
    let live = true
    const apply = (m: { input: ModelInput; output: ModelOutput | null }) => {
      setInputState(m.input)
      setOutput(m.output)
      setLoadId((n) => n + 1)
    }
    if (!userId) {
      apply({ input: defaultInput(), output: null })
      return
    }
    const local = loadLocal(userId)
    if (local) apply(local)
    loadRemote(userId).then((remote) => {
      if (live && remote) apply(remote)
    })
    return () => {
      live = false
    }
  }, [userId])

  const setInput = useCallback((next: ModelInput) => setInputState(next), [])
  const replaceInput = useCallback((next: ModelInput) => {
    setInputState(next)
    setLoadId((n) => n + 1)
  }, [])

  const run = useCallback(async () => {
    setRunning(true)
    setError(null)
    try {
      const res = await computeModel(input)
      setOutput(res.output)
      setSource(res.source)
      if (userId) {
        saveLocal(userId, { input, output: res.output })
        setSaveWarning(await saveRemote(userId, { input, output: res.output }))
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'The valuation could not be run.')
    } finally {
      setRunning(false)
    }
  }, [input, userId])

  const value = useMemo(
    () => ({ input, output, source, running, error, saveWarning, loadId, setInput, replaceInput, run }),
    [input, output, source, running, error, saveWarning, loadId, setInput, replaceInput, run],
  )
  return <ValuationContext.Provider value={value}>{children}</ValuationContext.Provider>
}
