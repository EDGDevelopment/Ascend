const usd = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 })
const compact = new Intl.NumberFormat('en-US', { notation: 'compact', maximumFractionDigits: 1 })

export const formatUsd = (n: number) => usd.format(n)

/** $48.2k style label for tight spaces such as chart axes. */
export const formatUsdCompact = (n: number) => `$${compact.format(n).toLowerCase()}`

export const formatNumber = (n: number) => new Intl.NumberFormat('en-US').format(n)

export const formatPercent = (n: number, digits = 1) => `${n > 0 ? '+' : ''}${n.toFixed(digits)}%`
