import { AiError, callFunction } from './functionClient'

export interface ChatMessage {
  role: 'user' | 'assistant'
  content: string
}

export { AiError as ChatError }

/**
 * Sends the conversation and the digest of the user's data to the `chat` Edge Function and calls `onText` with the
 * answer as it arrives.
 */
export async function askAssistant(messages: ChatMessage[], context: string, onText: (soFar: string) => void, signal: AbortSignal): Promise<string> {
  const res = await callFunction('chat', { messages, context }, signal)
  if (!res.body) throw new AiError('The assistant did not return an answer. Try again.')

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let answer = ''
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    answer += decoder.decode(value, { stream: true })
    onText(answer)
  }
  if (!answer.trim()) throw new AiError('The assistant did not return an answer. Try again.')
  return answer
}
