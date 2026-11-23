/**
 * Pieces every AI Edge Function shares: which browsers may call it, a per-user rate limit, who is calling, and the
 * Azure OpenAI connection. Uses Deno's environment, so it only runs inside an Edge Function.
 */

const allowed = new Set([
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  ...(Deno.env.get('ALLOWED_ORIGINS') ?? '').split(',').map((o) => o.trim()).filter(Boolean),
])
const baseCors = {
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

/** CORS headers for an allowed origin, or none, so browsers block any other site from calling the function. */
export const corsFor = (req: Request): Record<string, string> => {
  const origin = req.headers.get('Origin')
  return origin && allowed.has(origin) ? { ...baseCors, 'Access-Control-Allow-Origin': origin, Vary: 'Origin' } : {}
}

/** The signed-in user's id. The platform has already verified the JWT; we only read the subject from it. */
export function userKey(req: Request): string {
  try {
    const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    return String(payload.sub ?? 'anon')
  } catch {
    return 'anon'
  }
}

/** Best-effort limit per user (in this instance's memory): `max` calls in `windowMs`. Returns true when over. */
export function createLimiter(max: number, windowMs: number) {
  const hits = new Map<string, number[]>()
  return (key: string): boolean => {
    const now = Date.now()
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs)
    if (recent.length >= max) {
      hits.set(key, recent)
      return true
    }
    recent.push(now)
    hits.set(key, recent)
    if (hits.size > 5000) for (const [k, v] of hits) if (v.every((t) => now - t >= windowMs)) hits.delete(k)
    return false
  }
}

export interface AzureConfig {
  url: string
  apiKey: string
}

/** The chat-completions URL and key from the function's secrets, or null when they are not set. */
export function azureConfig(): AzureConfig | null {
  const apiKey = Deno.env.get('AZURE_OPENAI_API_KEY')
  const endpoint = Deno.env.get('AZURE_OPENAI_ENDPOINT')
  const deployment = Deno.env.get('AZURE_OPENAI_DEPLOYMENT')
  if (!apiKey || !endpoint || !deployment) return null
  const version = Deno.env.get('AZURE_OPENAI_API_VERSION') ?? '2025-01-01-preview'
  return {
    apiKey,
    url: `${endpoint.replace(/\/+$/, '')}/openai/deployments/${encodeURIComponent(deployment)}/chat/completions?api-version=${encodeURIComponent(version)}`,
  }
}
