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

