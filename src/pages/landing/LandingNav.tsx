import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { useAuth } from '@/auth/useAuth'
import { Logo } from '@/components/Logo'
import { ButtonLink } from '@/components/ui/Button'

const links = [
  { href: '#how', label: 'How it works' },
  { href: '#model', label: 'The model' },
  { href: '#product', label: 'Product' },
  { href: '#roadmap', label: 'Roadmap' },
]

export function LandingNav() {
  const { user } = useAuth()
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-40 border-b border-line-soft bg-page">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5 sm:px-8">
        <div className="flex items-center gap-3">
          <Logo />
          <span className="hidden rounded-full border border-line px-2 py-0.5 text-[11px] font-medium text-ink-muted sm:inline">
            Early preview
          </span>
        </div>

        <nav aria-label="Primary" className="hidden items-center gap-8 md:flex">
          {links.map((l) => (
            <a key={l.href} href={l.href} className="text-sm text-ink-muted transition-colors hover:text-ink">
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {user ? (
            <ButtonLink to="/dashboard" size="sm">
              Open dashboard
            </ButtonLink>
          ) : (
            <>
              <ButtonLink to="/login" variant="ghost" size="sm">
                Sign in
              </ButtonLink>
              <ButtonLink to="/signup" size="sm">
                Get started
              </ButtonLink>
            </>
          )}
        </div>

        <button
          type="button"
          className="grid h-10 w-10 place-items-center rounded-lg text-ink hover:bg-sunken md:hidden"
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
          aria-controls="mobile-menu"
          onClick={() => setOpen((o) => !o)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {open && (
        <div id="mobile-menu" className="border-t border-line-soft bg-page px-5 pb-5 md:hidden">
          <nav aria-label="Mobile" className="flex flex-col py-2">
            {links.map((l) => (
              <a key={l.href} href={l.href} onClick={() => setOpen(false)} className="py-3 text-[15px] text-ink-soft">
                {l.label}
              </a>
            ))}
          </nav>
          <div className="flex gap-2">
            {user ? (
              <ButtonLink to="/dashboard" className="flex-1">
                Open dashboard
              </ButtonLink>
            ) : (
              <>
                <ButtonLink to="/login" variant="secondary" className="flex-1">
                  Sign in
                </ButtonLink>
                <ButtonLink to="/signup" className="flex-1">
                  Get started
                </ButtonLink>
              </>
            )}
          </div>
        </div>
      )}
    </header>
  )
}
