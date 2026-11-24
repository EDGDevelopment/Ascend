import { Sparkles } from 'lucide-react'
import { useReadOnly } from '@/dashboard/readOnly'
import { askAscend } from './chatBus'

/** A small "Explain this" button. Opens the assistant with the question already asked. */
export function ExplainButton({ question, label = 'Explain this' }: { question: string; label?: string }) {
  // Shared links have no assistant to ask.
  if (useReadOnly()) return null
  return (
    <button
      type="button"
      onClick={() => askAscend(question)}
      aria-label={`${label}: ask the assistant`}
      className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-line px-3 py-1.5 text-[13px] font-medium text-ink-muted transition-colors hover:border-accent hover:bg-accent-soft hover:text-accent-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent"
    >
      <Sparkles size={14} aria-hidden="true" />
      {label}
    </button>
  )
}
