import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react'
import { useAuth } from '@/auth/useAuth'
import { blankInput } from './defaults'
import { deleteRemoteDataset, loadLibrary, loadRemoteDatasets, mergeDatasets, saveLibrary, saveRemoteDataset, type Dataset } from './datasets'
import type { ModelInput } from './engine'
import { computeModel, type ComputeSource } from './service'
import { ValuationContext } from './ValuationContext'

const now = () => new Date().toISOString()
const newId = () => (typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`)

export function ValuationProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth()
  const userId = user?.id ?? null

  const [datasets, setDatasets] = useState<Dataset[]>([])
  const [activeId, setActiveId] = useState<string | null>(null)
  const [ready, setReady] = useState(false)
  const [source, setSource] = useState<ComputeSource | null>(null)
  const [running, setRunning] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saveWarning, setSaveWarning] = useState<string | null>(null)
  const [loadId, setLoadId] = useState(0)
  // The user whose library is in memory. Stops one account's data being written under another's key.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined)

  // When the signed-in user changes, swap in their datasets from this browser straight away (adjusting state
  // while rendering, so nothing flashes), then merge in what the database has.
  if (loadedFor !== userId) {
    const local = userId ? loadLibrary(userId) : { datasets: [], activeId: null }
    setLoadedFor(userId)
    setDatasets(local.datasets)
    setActiveId(local.activeId)
    setError(null)
    setSaveWarning(null)
    setReady(true)
    setLoadId((n) => n + 1)
  }

  useEffect(() => {
    if (!userId) return
    let live = true
    void loadRemoteDatasets(userId).then((remote) => {
      if (!live || remote.length === 0) return
      setDatasets((cur) => mergeDatasets(cur, remote))
      setActiveId((cur) => cur ?? remote[0].id)
      setLoadId((n) => n + 1)
    })
    return () => {
      live = false
    }
  }, [userId])

  useEffect(() => {
    if (userId && loadedFor === userId) saveLibrary(userId, { datasets, activeId })
  }, [datasets, activeId, userId, loadedFor])

  const active = useMemo(() => datasets.find((d) => d.id === activeId) ?? null, [datasets, activeId])
  const blank = useMemo(() => blankInput(), [])
  const input = active?.input ?? blank
  const output = active?.output ?? null

  const patch = useCallback((id: string, change: (d: Dataset) => Dataset) => setDatasets((list) => list.map((d) => (d.id === id ? change(d) : d))), [])

  const setInput = useCallback(
    (next: ModelInput) => {
      if (activeId) patch(activeId, (d) => ({ ...d, input: next }))
    },
    [activeId, patch],
  )
  const replaceInput = useCallback(
    (next: ModelInput) => {
      setInput(next)
      setLoadId((n) => n + 1)
    },
    [setInput],
  )

  const execute = useCallback(
    async (ds: Dataset) => {
      setRunning(true)
      setError(null)
      try {
        const res = await computeModel(ds.input)
        const updatedAt = now()
        patch(ds.id, (d) => ({ ...d, output: res.output, updatedAt }))
        setSource(res.source)
        if (userId) setSaveWarning(await saveRemoteDataset(userId, { ...ds, output: res.output, updatedAt }))
      } catch (e) {
        setError(e instanceof Error ? e.message : 'The forecast could not be worked out.')
      } finally {
        setRunning(false)
      }
    },
    [patch, userId],
  )

  const run = useCallback(async () => {
    if (active) await execute(active)
  }, [active, execute])

  const addDataset = useCallback(
    async (d: { name: string; fileName: string | null; input: ModelInput }) => {
      const stamp = now()
      const ds: Dataset = { id: newId(), name: d.name, fileName: d.fileName, createdAt: stamp, updatedAt: stamp, input: d.input, output: null }
      setDatasets((list) => [ds, ...list])
      setActiveId(ds.id)
      setLoadId((n) => n + 1)
      setSaveWarning(null)
      await execute(ds)
    },
    [execute],
  )

  const selectDataset = useCallback((id: string) => {
    setActiveId(id)
    setError(null)
    setSaveWarning(null)
    setLoadId((n) => n + 1)
  }, [])

  const renameDataset = useCallback(
    (id: string, name: string) => {
      const clean = name.trim()
      const target = datasets.find((d) => d.id === id)
      if (!clean || !target) return
      const renamed = { ...target, name: clean, updatedAt: now() }
      patch(id, () => renamed)
      if (userId) void saveRemoteDataset(userId, renamed).then(setSaveWarning)
    },
    [datasets, patch, userId],
  )

  const deleteDataset = useCallback(
    (id: string) => {
      const rest = datasets.filter((d) => d.id !== id)
      setDatasets(rest)
      setActiveId((cur) => (cur === id ? (rest[0]?.id ?? null) : cur))
      setLoadId((n) => n + 1)
      setError(null)
      if (userId) void deleteRemoteDataset(userId, id).then(setSaveWarning)
    },
    [datasets, userId],
  )

  const value = useMemo(
    () => ({ ready, datasets, active, input, output, source, running, error, saveWarning, loadId, setInput, replaceInput, run, addDataset, selectDataset, renameDataset, deleteDataset }),
    [ready, datasets, active, input, output, source, running, error, saveWarning, loadId, setInput, replaceInput, run, addDataset, selectDataset, renameDataset, deleteDataset],
  )
  return <ValuationContext.Provider value={value}>{children}</ValuationContext.Provider>
}
