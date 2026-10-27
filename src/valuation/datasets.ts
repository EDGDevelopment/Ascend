import { supabase } from '@/lib/supabase'
import type { ModelInput, ModelOutput } from './engine'

/** One uploaded spreadsheet with the details and result that go with it. */
export interface Dataset {
  id: string
  name: string
  /** The uploaded file's name, or null if the dataset was not made from a file. */
  fileName: string | null
  createdAt: string
  updatedAt: string
  input: ModelInput
  output: ModelOutput | null
}

export interface Library {
  datasets: Dataset[]
  activeId: string | null
}

const key = (userId: string) => `ascend.datasets.v1.${userId}`

const isDataset = (d: unknown): d is Dataset => {
  const x = d as Dataset
  return !!x && typeof x.id === 'string' && typeof x.name === 'string' && !!x.input && Array.isArray(x.input.monthly) && (x.output === null || !!x.output?.tools)
}

export function loadLibrary(userId: string): Library {
  try {
    const raw = localStorage.getItem(key(userId))
    const parsed = raw ? (JSON.parse(raw) as Partial<Library>) : null
    const datasets = Array.isArray(parsed?.datasets) ? parsed.datasets.filter(isDataset) : []
    const activeId = datasets.some((d) => d.id === parsed?.activeId) ? (parsed?.activeId as string) : (datasets[0]?.id ?? null)
    return { datasets, activeId }
  } catch {
    return { datasets: [], activeId: null }
  }
}

export function saveLibrary(userId: string, lib: Library) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(lib))
  } catch {
    // Storage can be full or blocked. The in-memory copy still works for this session.
  }
}

export async function loadRemoteDatasets(userId: string): Promise<Dataset[]> {
  if (!supabase) return []
  const { data, error } = await supabase
    .from('valuation_datasets')
    .select('id, name, file_name, input, output, created_at, updated_at')
    .eq('owner_id', userId)
    .order('created_at', { ascending: false })
  if (error || !data) return []
  return data
    .map((r) => ({ id: r.id, name: r.name, fileName: r.file_name, createdAt: r.created_at, updatedAt: r.updated_at, input: r.input, output: r.output ?? null }))
    .filter(isDataset)
}

/** Returns an error message, or null on success. A missing table (migration not run) is reported, not thrown. */
export async function saveRemoteDataset(userId: string, d: Dataset): Promise<string | null> {
  if (!supabase) return null
  const { error } = await supabase.from('valuation_datasets').upsert({
    id: d.id,
    owner_id: userId,
    name: d.name,
    file_name: d.fileName,
    input: d.input,
    output: d.output,
    updated_at: d.updatedAt,
  })
  return error ? error.message : null
}

export async function deleteRemoteDataset(userId: string, id: string): Promise<string | null> {
  if (!supabase) return null
  const { error } = await supabase.from('valuation_datasets').delete().eq('id', id).eq('owner_id', userId)
  return error ? error.message : null
}

/** Keeps every dataset from both lists; where one appears in both, the more recently updated copy wins. */
export function mergeDatasets(local: Dataset[], remote: Dataset[]): Dataset[] {
  const byId = new Map(local.map((d) => [d.id, d]))
  for (const r of remote) {
    const l = byId.get(r.id)
    if (!l || r.updatedAt > l.updatedAt) byId.set(r.id, r)
  }
  return [...byId.values()].sort((a, b) => (a.createdAt < b.createdAt ? 1 : -1))
}

/** The monthly table as CSV text, for downloading a dataset back out. */
export function toCsv(input: ModelInput): string {
  const withExp = input.monthly.every((r) => r.expenses !== undefined)
  const lines = [withExp ? 'Month,Revenue,Expenses' : 'Month,Revenue']
  for (const r of input.monthly) lines.push(withExp ? `${r.month},${r.revenue},${r.expenses}` : `${r.month},${r.revenue}`)
  return lines.join('\n') + '\n'
}
