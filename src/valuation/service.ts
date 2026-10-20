import { supabase } from '@/lib/supabase'
import { registerPatchModel, runModel, validateModel, type ModelInput, type ModelOutput, type PatchWeightsFile } from './engine'

export type ComputeSource = 'server' | 'browser'

let patchLoad: Promise<void> | null = null

/**
 * Loads the Ascend Patch Forecaster's weights (a couple of megabytes) the first time the engine runs in the
 * browser, not at page load. If they cannot be loaded the engine falls back to the statistical methods.
 */
function ensurePatchModel(): Promise<void> {
  patchLoad ??= import('../../supabase/functions/_shared/valuation/patch-weights.json')
    .then((m) => registerPatchModel(m.default as unknown as PatchWeightsFile))
    .catch(() => undefined)
  return patchLoad
}

/**
 * Runs the model on the Supabase Edge Function when a project is configured, otherwise (or if the
 * function is unreachable or not deployed yet) in the browser. Both execute the same engine files,
 * so the numbers are identical for a given seed.
 */
export async function computeModel(input: ModelInput): Promise<{ output: ModelOutput; source: ComputeSource }> {
  const problems = validateModel(input)
  if (problems.length) throw new Error(problems.join(' '))

  if (supabase) {
    try {
      const { data, error } = await supabase.functions.invoke('valuation', { body: input })
      if (!error && data?.output) return { output: data.output as ModelOutput, source: 'server' }
    } catch {
      // Fall through to the browser engine.
    }
  }
  await ensurePatchModel()
  return { output: runModel(input), source: 'browser' }
}

interface StoredModel {
  input: ModelInput
  output: ModelOutput | null
}

// v3: adds the owner tools to the output. Older saved shapes are ignored rather than migrated.
const key = (userId: string) => `ascend.model.v3.${userId}`
const isCurrent = (m: unknown): m is StoredModel => !!m && typeof m === 'object' && !!(m as StoredModel).input && Array.isArray((m as StoredModel).input.monthly) && ((m as StoredModel).output === null || !!(m as StoredModel).output?.tools)

export function loadLocal(userId: string): StoredModel | null {
  try {
    const raw = localStorage.getItem(key(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    return isCurrent(parsed) ? parsed : null
  } catch {
    return null
  }
}

export function saveLocal(userId: string, model: StoredModel) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(model))
  } catch {
    // Storage can be full or blocked. The in-memory copy still works for this session.
  }
}

export async function loadRemote(userId: string): Promise<StoredModel | null> {
  if (!supabase) return null
  const { data, error } = await supabase.from('valuation_models').select('input, output').eq('owner_id', userId).maybeSingle()
  if (error || !data) return null
  const model = { input: data.input, output: data.output ?? null }
  return isCurrent(model) ? model : null
}

/** Returns an error message, or null on success. A missing table (migration not run) is reported, not thrown. */
export async function saveRemote(userId: string, model: StoredModel): Promise<string | null> {
  if (!supabase) return null
  const { error } = await supabase.from('valuation_models').upsert({
    owner_id: userId,
    input: model.input,
    output: model.output,
    computed_at: model.output?.computedAt ?? null,
  })
  return error ? error.message : null
}
