// Supabase Edge Function: POST a ModelInput (monthly figures + organisation details), get back { output }.
// JWT verification is on by default, so only signed-in Ascend users can call it.
import { registerPatchModel, runModel, type ModelInput, type PatchWeightsFile } from '../_shared/valuation/model.ts'
import patchWeights from '../_shared/valuation/patch-weights.json' with { type: 'json' }

// The Ascend Patch Forecaster is loaded once when the function starts, not on every request.
registerPatchModel(patchWeights as unknown as PatchWeightsFile)

const cors = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)

  const text = await req.text()
  if (text.length > 200_000) return json({ error: 'Request too large.' }, 413)

  let input: ModelInput
  try {
    input = JSON.parse(text)
  } catch {
    return json({ error: 'Body must be JSON.' }, 400)
  }

  try {
    return json({ output: runModel(input) })
  } catch (e) {
    // runModel throws validation messages meant for the user.
    return json({ error: e instanceof Error ? e.message : 'Valuation failed.' }, 400)
  }
})
