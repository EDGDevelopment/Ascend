import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

/** Thrown with a message that is safe to show the user. */
export class AiError extends Error {}

/**
 * POSTs to one of the AI Edge Functions as the signed-in user and returns the response if it succeeded. Failures
 * become an AiError whose message the page can show as it is. The functions hold the AI key, so nothing secret
 * lives in the browser.
 */
export async function callFunction(name: string, body: unknown, signal?: AbortSignal): Promise<Response> {
  if (!supabase) throw new AiError('This needs the app to be connected to Supabase. It is not available in demo mode.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new AiError('Please sign in again to use this.')

  let res: Response
  try {
    res = await fetch(`${env.supabaseUrl}/functions/v1/${name}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: env.supabaseKey },
      body: JSON.stringify(body),
      signal,
    })
  } catch (e) {
    if (signal?.aborted) throw e
    throw new AiError('Could not reach the service. Check your connection and try again.')
  }

  if (!res.ok) {
    let message = 'That could not be done right now. Try again.'
    if (res.status === 404) message = 'This feature has not been deployed yet.'
    else {
      try {
        const err = await res.json()
        if (typeof err.error === 'string') message = err.error
      } catch {
        // Keep the generic message.
      }
    }
    throw new AiError(message)
  }
  return res
}
