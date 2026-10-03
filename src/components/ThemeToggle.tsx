import { Monitor, Moon, Sun } from 'lucide-react'
import { useTheme } from '@/theme/useTheme'
import type { Theme } from '@/theme/ThemeContext'

const order: Theme[] = ['system', 'light', 'dark']
const labels: Record<Theme, string> = { system: 'System', light: 'Light', dark: 'Dark' }
const icons = { system: Monitor, light: Sun, dark: Moon }

/** Cycles System, Light, Dark. The accessible name states the current choice and what a press does. */
export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, setTheme } = useTheme()
  const next = order[(order.indexOf(theme) + 1) % order.length]
  const Icon = icons[theme]

  return (
    <button
      type="button"
      onClick={() => setTheme(next)}
      aria-label={`Theme: ${labels[theme]}. Switch to ${labels[next]}.`}
      title={`Theme: ${labels[theme]}`}
      className={`grid h-9 w-9 place-items-center rounded-lg text-ink-muted transition-colors hover:bg-sunken hover:text-ink ${className}`}
    >
      <Icon size={17} aria-hidden="true" />
    </button>
  )
}
