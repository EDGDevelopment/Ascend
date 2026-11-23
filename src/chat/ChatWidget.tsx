import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUp, MessageCircle, RotateCcw, Sparkles, Square, X } from 'lucide-react'
import { buildDigest } from '../../supabase/functions/_shared/chat/digest'
import { useAuth } from '@/auth/useAuth'
import { useValuation } from '@/valuation/useValuation'
import { ASK_EVENT } from './chatBus'
import { askAssistant, ChatError, type ChatMessage } from './chatService'
import { loadChat, loadOpen, saveChat, saveOpen } from './chatStore'
import { Markdown } from './Markdown'

const MAX_QUESTION = 1500
// The server accepts 30 messages; keep the most recent so a long chat never gets rejected.
const MAX_HISTORY = 20

function suggestions(orgType: 'local' | 'nonprofit' | null): string[] {
  if (orgType === 'nonprofit')
    return ['How many months of cash do we have?', 'What is our biggest funding risk?', 'Will we run out of money this year?', 'Which month had the biggest deficit?']
  if (orgType === 'local')
    return ['What is my business worth and why?', 'Which month was my best, and my worst?', 'How did this year compare with last year?', 'What does the break-even number mean for me?']
  return ['What can you tell me about my business?', 'What do I need to upload to get a forecast?', 'What does the forecast range mean?']
}

export function ChatWidget() {
  const { datasets, active, ready } = useValuation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  // Reopens after a reload if it was open. Per tab, so a new tab starts closed.
  const [open, setOpen] = useState(loadOpen)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  // The user whose conversation is in memory, so one account's chat is never saved under another's key.
  const [loadedFor, setLoadedFor] = useState<string | null | undefined>(undefined)
  if (loadedFor !== userId) {
    setLoadedFor(userId)
    setMessages(userId ? loadChat(userId) : [])
  }
  const [draft, setDraft] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const abort = useRef<AbortController | null>(null)
  const scroller = useRef<HTMLDivElement>(null)
  const input = useRef<HTMLTextAreaElement>(null)

  // Rebuilt only when a spreadsheet or result changes, so typing in the chat does no work.
  const context = useMemo(() => buildDigest(datasets, active?.id ?? null), [datasets, active])

  useEffect(() => {
    scroller.current?.scrollTo({ top: scroller.current.scrollHeight })
  }, [messages, error, open])

  useEffect(() => saveOpen(open), [open])

  useEffect(() => {
    if (!open) return
    input.current?.focus()
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false)
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open])

  useEffect(() => () => abort.current?.abort(), [])

  // Save once an answer has finished arriving, not on every streamed chunk.
  useEffect(() => {
    if (userId && loadedFor === userId && !busy) saveChat(userId, messages)
  }, [messages, busy, userId, loadedFor])

  const send = useCallback(
    async (raw: string) => {
      const question = raw.trim().slice(0, MAX_QUESTION)
      if (!question || busy) return
      // If the last question never got an answer (an error, or a reload), replace it so turns still alternate.
      const base = messages.length && messages[messages.length - 1].role === 'user' ? messages.slice(0, -1) : messages
      const history: ChatMessage[] = [...base, { role: 'user', content: question }]
      setMessages([...history, { role: 'assistant', content: '' }])
      setDraft('')
      setError(null)
      setBusy(true)
      const ctl = new AbortController()
      abort.current = ctl
      try {
        const sent = history.slice(-MAX_HISTORY)
        // The conversation must start with the user's turn.
        while (sent.length > 1 && sent[0].role !== 'user') sent.shift()
        const answer = await askAssistant(sent, context, (soFar) => setMessages([...history, { role: 'assistant', content: soFar }]), ctl.signal)
        setMessages([...history, { role: 'assistant', content: answer }])
      } catch (e) {
        if (ctl.signal.aborted) {
          // Stopped by the user: keep whatever had arrived, drop an empty bubble.
          setMessages((m) => (m.length && m[m.length - 1].role === 'assistant' && !m[m.length - 1].content ? m.slice(0, -1) : m))
        } else {
          setMessages(history)
          setError(e instanceof ChatError ? e.message : 'Something went wrong. Try again.')
        }
      } finally {
        setBusy(false)
        abort.current = null
      }
    },
    [busy, context, messages],
  )

  // "Explain this" buttons elsewhere in the app ask through here. If an answer is still arriving, put the question
  // in the box instead of interrupting it.
  const ask = useCallback(
    (question: string) => {
      setOpen(true)
      if (busy) setDraft(question)
      else void send(question)
    },
    [busy, send],
  )
  const askRef = useRef(ask)
  useEffect(() => {
    askRef.current = ask
  }, [ask])
  useEffect(() => {
    const onAsk = (e: Event) => {
      const question = (e as CustomEvent<unknown>).detail
      if (typeof question === 'string' && question.trim()) askRef.current(question)
    }
    window.addEventListener(ASK_EVENT, onAsk)
    return () => window.removeEventListener(ASK_EVENT, onAsk)
  }, [])

  const reset = () => {
    abort.current?.abort()
    setMessages([])
    setError(null)
    setDraft('')
  }

  const orgType = active?.input.orgType ?? null
  const lastWaiting = busy && messages.length > 0 && messages[messages.length - 1].content === ''

  return (
    <>
      {!open && (
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full bg-accent px-4 py-3 text-sm font-semibold text-white shadow-pop transition-colors hover:bg-accent-strong focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
        >
          <MessageCircle size={18} />
          Ask Ascend
        </button>
      )}

      {open && (
        <section
          role="dialog"
          aria-label="Ascend Assistant"
          className="fixed inset-x-0 bottom-0 z-50 flex h-[min(640px,100dvh)] flex-col border border-line-soft bg-surface shadow-pop sm:inset-x-auto sm:bottom-5 sm:right-5 sm:w-[400px] sm:rounded-2xl"
        >
          <header className="flex items-center gap-2 border-b border-line-soft px-4 py-3">
            <span className="grid h-8 w-8 place-items-center rounded-full bg-accent-soft text-accent-ink">
              <Sparkles size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold leading-tight">Ascend Assistant</p>
              <p className="truncate text-xs text-ink-faint">{active ? `Answering from "${active.name}"` : 'No spreadsheet uploaded yet'}</p>
            </div>
            {messages.length > 0 && (
              <button type="button" onClick={reset} aria-label="Start a new chat" title="New chat" className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink">
                <RotateCcw size={16} />
              </button>
            )}
            <button type="button" onClick={() => setOpen(false)} aria-label="Close assistant" className="grid h-8 w-8 place-items-center rounded-md text-ink-faint hover:bg-sunken hover:text-ink">
              <X size={18} />
            </button>
          </header>

          <div ref={scroller} className="flex-1 space-y-3 overflow-y-auto px-4 py-4" aria-live="polite">
            {messages.length === 0 && (
              <div>
                <p className="text-sm text-ink-muted">
                  Ask me anything about your spreadsheets or what you see in Ascend: totals, trends, your forecast, what a number means.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {suggestions(ready ? orgType : null).map((s) => (
                    <button key={s} type="button" onClick={() => void send(s)} className="rounded-full border border-line px-3 py-1.5 text-left text-[13px] text-ink-soft transition-colors hover:border-accent hover:bg-accent-soft">
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {messages.map((m, i) =>
              m.role === 'user' ? (
                <div key={i} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-accent px-3.5 py-2 text-sm text-white">{m.content}</p>
                </div>
              ) : (
                <div key={i} className="max-w-[95%] rounded-2xl rounded-bl-md bg-sunken px-3.5 py-2 text-ink">
                  {m.content ? <Markdown text={m.content} /> : lastWaiting && i === messages.length - 1 ? <p className="text-sm text-ink-faint">Looking through your numbers…</p> : null}
                </div>
              ),
            )}

            {error && (
              <p role="alert" className="rounded-lg bg-down-soft px-3 py-2 text-sm text-down">
                {error}
              </p>
            )}
          </div>

          <form
            className="border-t border-line-soft px-4 pb-4 pt-3.5"
            onSubmit={(e) => {
              e.preventDefault()
              void send(draft)
            }}
          >
            <div className="flex items-end gap-3 rounded-2xl border border-line bg-page py-2.5 pl-4 pr-2.5 focus-within:border-accent">
              <textarea
                ref={input}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault()
                    void send(draft)
                  }
                }}
                rows={1}
                maxLength={MAX_QUESTION}
                placeholder="Ask about your data…"
                aria-label="Your question"
                className="max-h-28 min-h-9 flex-1 resize-none bg-transparent py-1.5 text-sm leading-6 outline-none placeholder:text-ink-faint"
              />
              {busy ? (
                <button type="button" onClick={() => abort.current?.abort()} aria-label="Stop" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-ink text-page">
                  <Square size={13} fill="currentColor" />
                </button>
              ) : (
                <button type="submit" disabled={!draft.trim()} aria-label="Send" className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-accent text-white disabled:opacity-40">
                  <ArrowUp size={17} />
                </button>
              )}
            </div>
            <p className="mt-3 px-4 text-center text-[11px] leading-snug text-ink-faint">AI can make mistakes. Check important figures against your spreadsheet.</p>
          </form>
        </section>
      )}
    </>
  )
}
