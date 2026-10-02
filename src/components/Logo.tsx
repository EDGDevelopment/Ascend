import { Link } from 'react-router-dom'

interface LogoProps {
  size?: number
  /** Render only the mark, without the wordmark. */
  markOnly?: boolean
  to?: string
  className?: string
}

export function LogoMark({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="8" fill="var(--color-accent)" />
      <path
        d="M8 22 14 14l4 4 6-9"
        fill="none"
        stroke="#fff"
        strokeWidth="2.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Logo({ size = 28, markOnly = false, to = '/', className = '' }: LogoProps) {
  return (
    <Link
      to={to}
      aria-label="Ascend home"
      className={`inline-flex items-center gap-2.5 rounded-md ${className}`}
    >
      <LogoMark size={size} />
      {!markOnly && (
        <span className="text-[1.15rem] font-semibold tracking-tight text-ink">Ascend</span>
      )}
    </Link>
  )
}
