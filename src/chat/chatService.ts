import { env } from '@/lib/env'
import { supabase } from '@/lib/supabase'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

/** Thrown with a message that is safe to show the user. */
export class ChatError extends Error {}

/**
 * Sends the conversation and the digest of the user's data to the `chat` Edge Function and calls `onText` with the
 * answer as it arrives. The function holds the AI key, so nothing secret lives in the browser.
 */
export async function askAssistant(messages: ChatMessage[], context: string, onText: (soFar: string) => void, signal: AbortSignal): Promise<string> {
  if (!supabase) throw new ChatError('The assistant needs the app to be connected to Supabase. It is not available in demo mode.')
  const { data } = await supabase.auth.getSession()
  const token = data.session?.access_token
  if (!token) throw new ChatError('Please sign in again to use the assistant.')

  let res: Response
  try {
    res = await fetch(`${env.supabaseUrl}/functions/v1/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, apikey: env.supabaseKey },
      body: JSON.stringify({ messages, context }),
      signal,
    })
  } catch (e) {
    if (signal.aborted) throw e
    throw new ChatError('Could not reach the assistant. Check your connection and try again.')
  }

  if (!res.ok || !res.body) {
    let message = 'The assistant could not answer that. Try again.'
    if (res.status === 404) message = 'The assistant has not been deployed yet.'
    else {
      try {
        const body = await res.json()
        if (typeof body.error === 'string') message = body.error
      } catch {
        // Keep the generic message.
      }
    }
    throw new ChatError(message)
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let answer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    answer += decoder.decode(value, { stream: true })
    onText(answer)
  }
  if (!answer.trim()) throw new ChatError('The assistant did not return an answer. Try again.')
  return answer
}
