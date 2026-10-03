function Figure({ label, value, delta, bad }: { label: string; value: string; delta: string; bad?: boolean }) {
  return (
    <div className="flex-1 px-4 first:pl-0 last:pr-0">
      <p className="text-xs text-white/55">{label}</p>
      <p className="tabular mt-1 text-xl font-semibold">{value}</p>
      <p className={`tabular text-xs font-medium ${bad ? 'text-[#f2a49a]' : 'text-[#7fd1ad]'}`}>{delta}</p>
    </div>
  )
}

/** Product preview shown beside the auth forms on large screens. */
export function AuthShowcase() {
  return (
    <aside aria-hidden="true" className="hidden bg-forest text-white lg:flex lg:items-center lg:justify-center lg:p-12 xl:p-16">
      <div className="w-full max-w-xl">
        <h2 className="font-display text-4xl leading-[1.05] xl:text-5xl">
          See what changed.
          <br />
          <span className="text-[#7fd1ad]">Understand why.</span>
        </h2>

        <div className="mt-12 rounded-xl border border-white/15 p-6">
          <div className="flex items-baseline justify-between">
            <p className="text-sm text-white/65">Bella's Cafe</p>
            <p className="text-sm text-white/65">
              Health <span className="tabular text-lg font-semibold text-[#7fd1ad]">82</span>
            </p>
          </div>

          <div className="mt-5 flex divide-x divide-white/15">
            <Figure label="Revenue" value="$50.6k" delta="+8.4%" />
            <Figure label="Expenses" value="$32.1k" delta="+3.1%" bad />
            <Figure label="Cash flow" value="$14.6k" delta="+11.2%" />
          </div>

          <svg viewBox="0 0 400 140" className="mt-7 h-auto w-full" role="presentation">
            <g stroke="white" strokeOpacity="0.1">
              <line x1="0" x2="400" y1="35" y2="35" />
              <line x1="0" x2="400" y1="80" y2="80" />
              <line x1="0" x2="400" y1="125" y2="125" />
            </g>
            <path d="M250 62 L290 50 L330 40 L370 28 L400 18 L400 70 L370 76 L330 80 L290 82 L250 78 Z" fill="#7fd1ad" fillOpacity="0.16" />
            <path d="M0 104 L32 96 L64 100 L96 84 L128 90 L160 72 L192 80 L224 64 L250 70" fill="none" stroke="#7fd1ad" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M250 70 L290 64 L330 56 L370 46 L400 38" fill="none" stroke="#7fd1ad" strokeWidth="2.5" strokeDasharray="6 5" strokeLinecap="round" />
            <line x1="250" x2="250" y1="6" y2="134" stroke="white" strokeOpacity="0.3" strokeDasharray="3 4" />
          </svg>

          <p className="mt-5 border-t border-white/15 pt-4 text-sm text-white/75">
            <span className="font-medium text-[#7fd1ad]">Opportunity:</span> weekday sales are 18% below potential.
          </p>
        </div>
      </div>
    </aside>
  )
}
