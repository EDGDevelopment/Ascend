/** Product preview shown beside the auth forms on large screens. */
export function AuthShowcase() {
  return (
    <aside aria-hidden="true" className="hidden bg-forest text-white lg:flex lg:flex-col lg:justify-between lg:p-12 xl:p-16">
      <h2 className="max-w-md font-display text-4xl leading-[1.05] xl:text-5xl">
        See what changed.
        <br />
        <span className="text-[#7fd1ad]">Understand why.</span>
      </h2>

      <div className="w-full max-w-md rounded-xl border border-white/15 p-5">
        <div className="flex items-baseline justify-between">
          <p className="text-sm text-white/65">Revenue forecast</p>
          <p className="tabular text-2xl font-semibold">$50,648</p>
        </div>

        <svg viewBox="0 0 360 120" className="mt-5 h-28 w-full" role="presentation">
          <path d="M210 44 L240 38 L270 30 L300 32 L330 18 L360 12 L360 62 L330 68 L300 66 L270 64 L240 62 L210 58 Z" fill="#7fd1ad" fillOpacity="0.16" />
          <path d="M0 92 L30 84 L60 88 L90 70 L120 74 L150 56 L180 60 L210 50" fill="none" stroke="#7fd1ad" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          <path d="M210 50 L240 44 L270 36 L300 38 L330 24 L360 18" fill="none" stroke="#7fd1ad" strokeWidth="2.5" strokeDasharray="5 5" strokeLinecap="round" />
          <line x1="210" x2="210" y1="0" y2="120" stroke="white" strokeOpacity="0.25" strokeDasharray="3 4" />
        </svg>

        <p className="mt-4 border-t border-white/15 pt-4 text-sm text-white/75">
          <span className="font-medium text-[#7fd1ad]">Opportunity:</span> weekday sales are 18% below potential.
        </p>
      </div>
    </aside>
  )
}
