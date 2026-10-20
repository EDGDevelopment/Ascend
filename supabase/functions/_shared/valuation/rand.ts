/** Small shared maths helpers. No imports, so they run in Deno and in the browser. */

/** Fast seeded generator (mulberry32). Deterministic for a given seed. */
export function rng(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** Standard normal via Box-Muller. */
export function normal(rand: () => number) {
  const u = 1 - rand()
  const v = rand()
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}

/** Linear-interpolated percentile of an already sorted array, p in 0..1. */
export function percentile(sorted: number[], p: number) {
  if (sorted.length === 0) return Number.NaN
  const idx = (sorted.length - 1) * p
  const lo = Math.floor(idx)
  const hi = Math.ceil(idx)
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo)
}

export const sum = (xs: number[]) => xs.reduce((s, x) => s + x, 0)
export const mean = (xs: number[]) => (xs.length ? sum(xs) / xs.length : Number.NaN)

/** Adds whole months to a "YYYY-MM" string. */
export function addMonths(month: string, k: number): string {
  const [y, m] = month.split('-').map(Number)
  const idx = y * 12 + (m - 1) + k
  return `${Math.floor(idx / 12)}-${String((idx % 12) + 1).padStart(2, '0')}`
}

/** Months from a to b, both "YYYY-MM". */
export function monthDiff(a: string, b: string): number {
  const [ya, ma] = a.split('-').map(Number)
  const [yb, mb] = b.split('-').map(Number)
  return (yb - ya) * 12 + (mb - ma)
}

/** Gamma(shape, 1) draw (Marsaglia and Tsang). Used for Dirichlet weights. */
export function gamma(rand: () => number, shape: number): number {
  if (shape < 1) return gamma(rand, shape + 1) * rand() ** (1 / shape)
  const d = shape - 1 / 3
  const c = 1 / Math.sqrt(9 * d)
  for (;;) {
    let x: number
    let v: number
    do {
      x = normal(rand)
      v = 1 + c * x
    } while (v <= 0)
    v = v * v * v
    const u = rand()
    if (u < 1 - 0.0331 * x ** 4 || Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) return d * v
  }
}
