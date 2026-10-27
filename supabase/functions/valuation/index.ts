// Supabase Edge Function: POST a ModelInput (monthly figures + organisation details), get back { output }.
// JWT verification is on by default, so only signed-in Ascend users can call it.
import { registerPatchModel, runModel, type ModelInput, type PatchWeightsFile } from '../_shared/valuation/model.ts'
import patchWeights from '../_shared/valuation/patch-weights.json' with { type: 'json' }

// The Ascend Patch Forecaster is loaded once when the function starts, not on every request.
registerPatchModel(patchWeights as unknown as PatchWeightsFile)

// Set ALLOWED_ORIGINS (comma-separated, e.g. "https://app.ascend.com") in the function's secrets. Local dev
// origins are always allowed. A request from any other origin gets no CORS headers, so browsers block it.
const allowed = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean),
])

const baseCors = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const corsFor = (req: Request): Record<string, string> => {
  const origin = req.headers.get('Origin')
  return origin && allowed.has(origin) ? { ...baseCors, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}
}

// Best-effort rate limit per signed-in user: 10 runs a minute. State lives in this isolate's memory, so it
// resets when the function cold-starts and is not shared between instances. It stops a tight loop, not a
// determined abuser; use a database counter if you need a hard guarantee.
const WINDOW_MS = 60_000
const MAX_RUNS = 10
const hits = new Map<string, number[]>()

function userKey(req: Request): string {
  // The platform has already verified the JWT; we only read the subject from it.
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.sub ?? 'anon')
  } catch {
    return 'anon'
  }
}

function limited(key: string): boolean {
  const now = Date.now()
  const recent = (hits.get(key) ?? []).filter((t) => now - t < WINDOW_MS)
  if (recent.length >= MAX_RUNS) {
    hits.set(key, recent)
    return true
  }
  recent.push(now)
  hits.set(key, recent)
  if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= WINDOW_MS)) hits.delete(k)
  return false
}

Deno.serve(async (req) => {
  const cors = corsFor(req)
  const json = (body: unknown, status = 200, extra: Record<string, string> = {}) =>
    new Response(JSON.stringify(body), { status, headers: { ...cors, ...extra, 'Content-Type': 'application/json' } })

  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  if (req.method !== 'POST') return json({ error: 'Use POST.' }, 405)
  if (limited(userKey(req))) return json({ error: 'Too many runs. Wait a minute and try again.' }, 429, { 'Retry-After': '60' })

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
