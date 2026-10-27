/**
 * Outcome colors for simulations: best outcomes cool teal, then Ascend green, then amber, worst coral.
 * Defined as CSS variables (index.css) so the ramp follows the light and dark themes.
 */
const STOPS = ['var(--color-out-4)', 'var(--color-out-3)', 'var(--color-out-2)', 'var(--color-out-1)'] // worst to best

/** t = 0 is the worst outcome, 1 the best. Returns a CSS color string for use in style props. */
export function outcomeColor(t: number): string {
  const x = Math.min(1, Math.max(0, Number.isFinite(t) ? t : 0.5)) * (STOPS.length - 1)
  const i = Math.min(Math.floor(x), STOPS.length - 2)
  const pct = Math.round((x - i) * 100)
  return `color-mix(in srgb, ${STOPS[i + 1]} ${pct}%, ${STOPS[i]})`
}

export const OUTCOME = { best: 'var(--color-out-1)', good: 'var(--color-out-2)', caution: 'var(--color-out-3)', worst: 'var(--color-out-4)' }
