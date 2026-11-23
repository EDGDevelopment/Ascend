import type { ChatMessage } from './chatService'

/** Kept in this browser only, one conversation per signed-in user. */
const key = (userId: string) => `ascend.chat.v1.${userId}`
export const MAX_SAVED = 30

const isMessage = (m: unknown): m is ChatMessage => {
  const x = m as ChatMessage
  return !!x && (x.role === 'user' || x.role === 'assistant') && typeof x.content === 'string'
}

const OPEN_KEY = 'ascend.chat.open.v1'

/** Whether the panel was open, kept for this browser tab only (sessionStorage). */
export function loadOpen(): boolean {
  try {
    return sessionStorage.getItem(OPEN_KEY) === '1'
  } catch {
    return false
  }
}

export function saveOpen(open: boolean) {
  try {
    if (open) sessionStorage.setItem(OPEN_KEY, '1')
    else sessionStorage.removeItem(OPEN_KEY)
  } catch {
    // Blocked storage just means the panel starts closed next time.
  }
}

export function loadChat(userId: string): ChatMessage[] {
  try {
    const raw = localStorage.getItem(key(userId))
    const parsed: unknown = raw ? JSON.parse(raw) : null
    const list = Array.isArray(parsed) ? parsed.filter(isMessage) : []
    // Drop empty bubbles, and anything before the first question so the conversation always starts with the user.
    const clean = list.filter((m) => m.content.trim() !== '')
    while (clean.length && clean[0].role !== 'user') clean.shift()
    return clean.slice(-MAX_SAVED)
  } catch {
    return []
  }
}

export function saveChat(userId: string, messages: ChatMessage[]) {
  try {
    const done = messages.filter((m) => m.content.trim() !== '').slice(-MAX_SAVED)
    if (done.length === 0) localStorage.removeItem(key(userId))
    else localStorage.setItem(key(userId), JSON.stringify(done))
  } catch {
    // Storage can be full or blocked. The chat still works for this visit.
  }
}
