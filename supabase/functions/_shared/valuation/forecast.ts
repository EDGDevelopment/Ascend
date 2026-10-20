/**
 * Monthly revenue and expense forecasting for small organisations.
 *
 * Method: damped-trend exponential smoothing (Holt) with optional seasonality (Holt-Winters),
 * in additive or multiplicative form. Seasonality is only used when there are at least two full
 * years of history AND it clearly beats the trend-only model. Prediction ranges come from
 * simulating thousands of future paths, resampling the model's own past one-step errors, so the
 * range reflects how bumpy this particular business has been and widens with the horizon.
 *
 * Reference: Hyndman et al., "Forecasting with Exponential Smoothing" (state-space ETS), and the
 * Holt-Winters recursions as implemented in statsmodels / R forecast. Written from scratch so the
 * engine stays dependency-free.
 */
import { patchPoint } from './patch.ts'
import { addMonths, gamma, mean, percentile, rng, sum } from './rand.ts'

export const PERIOD = 12
export const HORIZON = 12
export const MIN_MONTHS = 12

type Seasonality = 'multiplicative' | 'additive' | 'none'

interface Params {
  alpha: number
  beta: number
  gamma: number
  phi: number
}

interface State {
  level: number
  trend: number
  /** Circular buffer: seasonal[t % PERIOD] is the factor for month index t. Empty when not seasonal. */
  seasonal: number[]
  /** Index of the next observation (equals n after fitting). */
  t: number
}

interface Fit {
  kind: Seasonality
  params: Params
  state: State
  /** One-step-ahead errors from `scoreFrom` onward, centred on zero. */
  residuals: number[]
  sse: number
}

const ALPHAS = [0.1, 0.3, 0.5, 0.7, 0.9]
const BETAS = [0.01, 0.05, 0.15]
const GAMMAS = [0.05, 0.2, 0.4, 0.6]
const PHIS = [0.9, 0.98, 1]

function init(values: number[], kind: Seasonality): State {
  if (kind === 'none') {
    const k = Math.min(3, values.length - 1)
    const trend = k > 0 ? (values[k] - values[0]) / k : 0
    return { level: values[0], trend, seasonal: [], t: 0 }
  }
  const first = mean(values.slice(0, PERIOD))
  const second = mean(values.slice(PERIOD, 2 * PERIOD))
  const seasonal = values.slice(0, PERIOD).map((v) => (kind === 'multiplicative' ? v / first : v - first))
  return { level: first, trend: (second - first) / PERIOD, seasonal, t: 0 }
}

/** The forecast for the next month, without changing the state. */
function peek(s: State, p: Params, kind: Seasonality): number {
  const base = s.level + p.phi * s.trend
  if (kind === 'none') return base
  const sf = s.seasonal[s.t % PERIOD]
  return kind === 'multiplicative' ? base * sf : base + sf
}

/** One recursion step. Returns the forecast made before seeing `y`, and mutates `s` to include `y`. */
function step(s: State, y: number, p: Params, kind: Seasonality): number {
  const base = s.level + p.phi * s.trend
  const idx = s.t % PERIOD
  const sf = kind === 'none' ? 0 : s.seasonal[idx]
  const fc = peek(s, p, kind)
  const deseason = kind === 'multiplicative' ? y / sf : kind === 'additive' ? y - sf : y
  const level = p.alpha * deseason + (1 - p.alpha) * base
  s.trend = p.beta * (level - s.level) + (1 - p.beta) * p.phi * s.trend
  if (kind === 'multiplicative') s.seasonal[idx] = p.gamma * (y / base) + (1 - p.gamma) * sf
  else if (kind === 'additive') s.seasonal[idx] = p.gamma * (y - base) + (1 - p.gamma) * sf
  s.level = level
  s.t += 1
  return fc
}

function run(values: number[], kind: Seasonality, p: Params, scoreFrom: number) {
  const s = init(values, kind)
  const errors: number[] = []
  let sse = 0
  for (let t = 0; t < values.length; t++) {
    const fc = step(s, values[t], p, kind)
    if (t >= scoreFrom) {
      const e = values[t] - fc
      errors.push(e)
      sse += e * e
    }
  }
  return { state: s, errors, sse }
}

function fitKind(values: number[], kind: Seasonality, scoreFrom: number): Fit {
  let best: { p: Params; sse: number } | null = null
  const gammas = kind === 'none' ? [0] : GAMMAS
  for (const alpha of ALPHAS) for (const beta of BETAS) for (const gamma of gammas) for (const phi of PHIS) {
    const p = { alpha, beta, gamma, phi }
    const { sse } = run(values, kind, p, scoreFrom)
    if (Number.isFinite(sse) && (!best || sse < best.sse)) best = { p, sse }
  }
  if (!best) throw new Error('The forecast could not be fitted to this history.')
  const { state, errors, sse } = run(values, kind, best.p, scoreFrom)
  const centre = mean(errors)
  return { kind, params: best.p, state, residuals: errors.map((e) => e - centre), sse }
}

/**
 * Picks the model for one series. Seasonality needs two full years, and must beat the trend-only
 * model by a clear margin, otherwise it just fits noise.
 */
function chooseKind(values: number[]): Seasonality {
  if (values.length < 2 * PERIOD) return 'none'
  const scoreFrom = PERIOD
  const plain = fitKind(values, 'none', scoreFrom)
  const candidates: Seasonality[] = values.every((v) => v > 0) ? ['multiplicative', 'additive'] : ['additive']
  let best: { kind: Seasonality; sse: number } | null = null
  for (const kind of candidates) {
    const f = fitKind(values, kind, scoreFrom)
    if (!best || f.sse < best.sse) best = { kind, sse: f.sse }
  }
  return best && best.sse < plain.sse * 0.85 ? best.kind : 'none'
}

function fitSeries(values: number[], wanted: Seasonality): Fit {
  // Multiplicative seasonality divides by the data, so a series containing zeros falls back to additive.
  const kind = wanted === 'multiplicative' && !values.every((v) => v > 0) ? 'additive' : wanted
  // Scoring starts after the first cycle for seasonal models (it is used to initialise them).
  // Trend-only models are scored over the same window when seasonality was a candidate, so
  // the residual arrays of revenue and expenses line up month for month.
  const scoreFrom = values.length >= 2 * PERIOD ? PERIOD : 1
  return fitKind(values, kind, scoreFrom)
}

/** Simulates `h` future months from a fitted state. Pass `errors` for one path, or null for the point forecast. */
function simulate(fit: Fit, h: number, errors: number[] | null): number[] {
  const s: State = { ...fit.state, seasonal: [...fit.state.seasonal] }
  const out: number[] = []
  for (let k = 0; k < h; k++) {
    const e = errors ? errors[k] : 0
    const y = Math.max(0, peek(s, fit.params, fit.kind) + e)
    step(s, y, fit.params, fit.kind)
    out.push(y)
  }
  return out
}

/**
 * In-sample one-step errors understate how far off a multi-month forecast can be (the model is also
 * uncertain about its own level and trend). Widening the simulated errors by this factor made the
 * P10-P90 range contain the true value about 80% of the time on 40 synthetic businesses held out
 * from tuning. Re-check with the calibration script in docs/VALUATION.md if the method changes.
 */
/**
 * rangeInflation widens the simulated one-step errors. memberConc sets how tightly each simulated future sticks to
 * the official blend weights: each path draws its own mixture of the methods (a Dirichlet draw), so the spread of
 * the ranges also reflects genuine disagreement between methods. Lower = more disagreement.
 */
export const TUNING = { rangeInflation: 1.2, memberConc: 15 }
/** The 12-23 month method already has a +/-6% volatility floor, so it needs less widening (same calibration run). */
const SHORT_RANGE_SCALE = 0.9

/**
 * For 12 to 23 months of history: repeat each month of the last year, scaled by recent year-over-year
 * growth. Plain trend models mistake a seasonal swing for a trend when they have under two years.
 */
interface LastYearModel {
  growth: number
  base: number[]
  /** Centred log year-over-year surprises. */
  logRes: number[]
}

function fitLastYear(values: number[]): LastYearModel {
  const n = values.length
  const j = Math.min(n - PERIOD, 6)
  const recent = j >= 1 ? sum(values.slice(n - j)) : 0
  const before = j >= 1 ? sum(values.slice(n - j - PERIOD, n - PERIOD)) : 0
  const growth = before > 0 && recent > 0 ? Math.min(1.6, Math.max(0.6, recent / before)) : 1
  const logs: number[] = []
  for (let t = PERIOD; t < n; t++) logs.push(Math.log(Math.max(values[t], 1) / Math.max(values[t - PERIOD], 1)))
  const centre = logs.length ? mean(logs) : 0
  let res = logs.map((l) => l - centre)
  const sd = res.length > 1 ? Math.sqrt(sum(res.map((r) => r * r)) / (res.length - 1)) : 0
  // Few year-over-year pairs say little about volatility, so never assume a calmer business than +/-6%.
  if (res.length < 3 || sd < 0.06) res = res.length >= 3 && sd > 0 ? res.map((r) => (r * 0.06) / sd) : [-0.12, -0.06, 0, 0.06, 0.12]
  return { growth, base: values.slice(n - PERIOD), logRes: res }
}

const lastYearPath = (m: LastYearModel, errors: number[] | null) =>
  m.base.map((b, k) => b * m.growth * Math.exp(errors ? errors[k] : 0))

/** Seasonal factors by calendar position, from the ratio of each month to its centred 12-month average. Needs 24+ months. */
export function seasonalIndices(y: number[]): number[] {
  const acc: number[][] = Array.from({ length: PERIOD }, () => [])
  for (let t = 6; t < y.length - 6; t++) {
    const cma = (0.5 * y[t - 6] + sum(y.slice(t - 5, t + 6)) + 0.5 * y[t + 6]) / PERIOD
    acc[t % PERIOD].push(y[t] / cma)
  }
  const raw = acc.map((a) => (a.length ? mean(a) : 1))
  const m = mean(raw)
  return raw.map((r) => r / m)
}

/**
 * Theta method (the M3 forecasting competition winner) on seasonally adjusted data: simple exponential
 * smoothing plus half of the long-run linear trend, then the seasonal pattern put back.
 */
function thetaPath(values: number[]): number[] {
  const n = values.length
  const S = seasonalIndices(values)
  const z = values.map((v, t) => v / S[t % PERIOD])
  const xm = (n - 1) / 2
  const zm = mean(z)
  const slope = sum(z.map((v, i) => (i - xm) * (v - zm))) / sum(z.map((_, i) => (i - xm) ** 2))
  let bestAlpha = 0.5
  let bestSse = Number.POSITIVE_INFINITY
  let level = z[0]
  for (let k = 1; k <= 20; k++) {
    const alpha = k * 0.05
    let l = z[0]
    let sse = 0
    for (let t = 1; t < n; t++) {
      const e = z[t] - l
      sse += e * e
      l += alpha * e
    }
    if (sse < bestSse) {
      bestSse = sse
      bestAlpha = alpha
      level = l
    }
  }
  return Array.from({ length: HORIZON }, (_, k) => {
    const h = k + 1
    const drift = 0.5 * slope * (h - 1 + 1 / bestAlpha - (1 - bestAlpha) ** n / bestAlpha)
    return Math.max(0, (level + drift) * S[(n + k) % PERIOD])
  })
}

export interface Member {
  name: 'ets' | 'last-year' | 'theta' | 'patch'
  weight: number
  path: number[]
}

const calendarMonth = (m: string) => Number(m.slice(5, 7)) - 1

/**
 * For 24+ months, the point forecast is a weighted average of methods: the trend/seasonal model, "last year
 * scaled by recent growth", and Theta, plus the Ascend Patch Forecaster when a trained model is loaded and there
 * are 36+ months. Tested on 29 real US retail series, tuned on half and scored on the other half, the average of
 * the three statistical methods beat every one of them alone at 24, 36 and 48 months of history. The patch model
 * (a transformer trained on 48,000 real M4 series plus the training-half retail series, learning a correction to
 * the last-year baseline) scored about the same alone and lifted the blend slightly, so it takes half the weight.
 */
function blendMembers(values: number[], ets: number[], months: string[]): { point: number[]; members: Member[] } {
  const ly = lastYearPath(fitLastYear(values), null)
  const theta = thetaPath(values)
  const patch = patchPoint(values, months.map(calendarMonth))
  const w = patch ? 0.5 / 3 : 1 / 3
  const members: Member[] = [
    { name: 'ets', weight: w, path: ets },
    { name: 'last-year', weight: w, path: ly },
    { name: 'theta', weight: w, path: theta },
  ]
  if (patch) members.push({ name: 'patch', weight: 0.5, path: patch })
  return { point: ets.map((_, i) => members.reduce((s, m) => s + m.weight * m.path[i], 0)), members }
}

export interface Backtest {
  /** Mean absolute percentage error over the held-out months, as a decimal. */
  mape: number
  /** The same for a naive guess: the same month last year, unchanged. */
  naiveMape: number
  months: number
  seasonal: boolean
}

function mape(actual: number[], predicted: number[]) {
  const pairs = actual.map((a, i) => [a, predicted[i]] as const).filter(([a]) => a !== 0)
  return pairs.length ? mean(pairs.map(([a, p]) => Math.abs((a - p) / a))) : Number.NaN
}

/** Hides the most recent months, forecasts them from what came before, and scores the result. */
export function backtest(values: number[], months: string[]): Backtest | null {
  const n = values.length
  const h = Math.min(6, Math.floor(n / 4))
  const train = values.slice(0, n - h)
  if (h < 2 || train.length < PERIOD + 1) return null
  const actual = values.slice(n - h)
  const seasonal = train.length >= 2 * PERIOD ? chooseKind(train) !== 'none' : true
  const predicted =
    train.length >= 2 * PERIOD
      ? blendMembers(train, simulate(fitSeries(train, chooseKind(train)), HORIZON, null), months.slice(0, n - h)).point.slice(0, h)
      : lastYearPath(fitLastYear(train), null).slice(0, h)
  // The comparison guess: the same month last year, carried forward unchanged.
  const naive = actual.map((_, i) => train[train.length - PERIOD + i])
  return { mape: mape(actual, predicted), naiveMape: mape(actual, naive), months: h, seasonal }
}

export interface Band {
  p10: number[]
  p50: number[]
  p90: number[]
}

export interface ForecastInput {
  /** Consecutive months, oldest first, "YYYY-MM". */
  months: string[]
  revenue: number[]
  /** Same length as revenue, or null when the client has not given expenses. */
  expenses: number[] | null
  simulations: number
  seed: number
}

export type ForecastMethod = 'seasonal-multiplicative' | 'seasonal-additive' | 'trend-only' | 'last-year-growth'

export interface ForecastResult {
  futureMonths: string[]
  method: ForecastMethod
  seasonal: boolean
  backtest: Backtest | null
  revenue: Band
  expenses: Band | null
  net: Band | null
  trailing12: { revenue: number; expenses: number | null }
  next12: {
    revenue: { p10: number; p50: number; p90: number }
    expenses: { p10: number; p50: number; p90: number } | null
    net: { p10: number; p50: number; p90: number } | null
  }
  /** Next-12-month revenue against the last 12 months, as decimals. */
  growth: { p10: number; p50: number; p90: number }
  /** Share of simulated years that come in below the last 12 months. */
  probBelowLastYear: { revenue: number; expenses: number | null; net: number | null }
  /** A small sample of the simulated futures, for drawing. Each path is 12 months long. */
  samples: { revenue: number[][]; expenses: number[][] | null; net: number[][] | null }
  /** True when the Ascend Patch Forecaster contributed to this forecast. */
  usedPatch: boolean
  /** Month-by-month seasonal pattern (index 0 = January) as a multiple of the average, when seasonality is in use. */
  seasonalShape: number[] | null
  notes: string[]
}

/** Simulated future paths, kept for the valuation and cash-runway steps and then discarded. */
export interface ForecastPaths {
  revenue: number[][]
  expenses: number[][] | null
}

const bandOf = (paths: number[][]): Band => {
  const cols = paths[0].map((_, k) => paths.map((p) => p[k]).sort((a, b) => a - b))
  return { p10: cols.map((c) => percentile(c, 0.1)), p50: cols.map((c) => percentile(c, 0.5)), p90: cols.map((c) => percentile(c, 0.9)) }
}
const spread = (xs: number[]) => {
  const s = [...xs].sort((a, b) => a - b)
  return { p10: percentile(s, 0.1), p50: percentile(s, 0.5), p90: percentile(s, 0.9) }
}

const SAMPLE_PATHS = 120
const sample = (paths: number[][]) => paths.slice(0, SAMPLE_PATHS).map((p) => p.map((v) => Math.round(v)))

export function runForecast(input: ForecastInput): { result: ForecastResult; paths: ForecastPaths } {
  const { months, revenue, expenses } = input
  const n = revenue.length
  const longHistory = n >= 2 * PERIOD
  const kind: Seasonality = longHistory ? chooseKind(revenue) : 'none'
  const rand = rng(input.seed)

  const revPaths: number[][] = []
  const expPaths: number[][] = []
  let revPoint: number[]
  let expPoint: number[] | null = null
  let seasonalShapeFn: () => number[] | null
  let usedPatch = false

  if (longHistory) {
    const revFit = fitSeries(revenue, kind)
    const expFit = expenses ? fitSeries(expenses, kind) : null
    const len = revFit.residuals.length
    // Centre each simulated future on its own mixture of the methods: keep the path's noise, move its middle.
    const revEts = simulate(revFit, HORIZON, null)
    const revBlend = blendMembers(revenue, revEts, months)
    revPoint = revBlend.point
    let expEts: number[] | null = null
    let expBlend: ReturnType<typeof blendMembers> | null = null
    if (expFit && expenses) {
      expEts = simulate(expFit, HORIZON, null)
      expBlend = blendMembers(expenses, expEts, months)
      expPoint = expBlend.point
    }
    usedPatch = revBlend.members.some((m) => m.name === 'patch')
    // The shift moving ETS onto a mixture. One set of gamma draws per path, shared by revenue and expenses.
    const shiftFor = (blend: ReturnType<typeof blendMembers>, ets: number[], g: Record<string, number>) => {
      const tot = sum(blend.members.map((m) => g[m.name]))
      return ets.map((e, k) => blend.members.reduce((acc, m) => acc + (g[m.name] / tot) * m.path[k], 0) - e)
    }
    for (let i = 0; i < input.simulations; i++) {
      const g: Record<string, number> = {}
      for (const m of revBlend.members) g[m.name] = gamma(rand, TUNING.memberConc * m.weight)
      for (const m of expBlend?.members ?? []) g[m.name] ??= gamma(rand, TUNING.memberConc * m.weight)
      const revShift = shiftFor(revBlend, revEts, g)
      // One draw per month is applied to both series so good and bad months stay linked, as they are in real life.
      const idx = Array.from({ length: HORIZON }, () => Math.floor(rand() * len))
      revPaths.push(simulate(revFit, HORIZON, idx.map((j) => revFit.residuals[j] * TUNING.rangeInflation)).map((v, k) => Math.max(0, v + revShift[k])))
      if (expFit && expBlend && expEts) {
        const expShift = shiftFor(expBlend, expEts, g)
        expPaths.push(simulate(expFit, HORIZON, idx.map((j) => expFit.residuals[j % expFit.residuals.length] * TUNING.rangeInflation)).map((v, k) => Math.max(0, v + expShift[k])))
      }
    }
    const firstCalendarMonth = Number(months[0].split('-')[1]) - 1
    const avg12 = mean(revenue.slice(-PERIOD))
    seasonalShapeFn = () =>
      kind === 'none'
        ? null
        : Array.from({ length: PERIOD }, (_, c) => {
            const raw = revFit.state.seasonal[(((c - firstCalendarMonth) % PERIOD) + PERIOD) % PERIOD]
            return revFit.kind === 'multiplicative' ? raw : 1 + raw / avg12
          })
  } else {
    const revModel = fitLastYear(revenue)
    const expModel = expenses ? fitLastYear(expenses) : null
    const len = revModel.logRes.length
    for (let i = 0; i < input.simulations; i++) {
      const idx = Array.from({ length: HORIZON }, () => Math.floor(rand() * len))
      revPaths.push(lastYearPath(revModel, idx.map((j) => revModel.logRes[j] * SHORT_RANGE_SCALE)))
      if (expModel) expPaths.push(lastYearPath(expModel, idx.map((j) => expModel.logRes[j % expModel.logRes.length] * SHORT_RANGE_SCALE)))
    }
    revPoint = lastYearPath(revModel, null)
    expPoint = expModel ? lastYearPath(expModel, null) : null
    const avg12 = mean(revenue.slice(-PERIOD))
    const firstCalendarMonth = Number(months[n - PERIOD].split('-')[1]) - 1
    seasonalShapeFn = () => Array.from({ length: PERIOD }, (_, c) => revModel.base[(((c - firstCalendarMonth) % PERIOD) + PERIOD) % PERIOD] / avg12)
  }
  const expFitPresent = expenses !== null

  // Keep the point forecast as the central line rather than the (slightly different) median of paths.
  const revBand = bandOf(revPaths)
  revBand.p50 = revPoint
  const expBand = expFitPresent ? bandOf(expPaths) : null
  if (expBand && expPoint) expBand.p50 = expPoint
  const netPaths = expFitPresent ? revPaths.map((r, i) => r.map((v, k) => v - expPaths[i][k])) : null
  const netBand = netPaths ? bandOf(netPaths) : null
  if (netBand && expBand) netBand.p50 = revBand.p50.map((v, k) => v - expBand.p50[k])

  const trailingRev = sum(revenue.slice(-PERIOD))
  const trailingExp = expenses ? sum(expenses.slice(-PERIOD)) : null
  const rev12 = revPaths.map((p) => sum(p))
  const notes: string[] = []
  if (!longHistory) notes.push('With under 24 months of history the forecast repeats last year\'s pattern scaled by recent growth. Add more months and it will learn your seasonal ups and downs properly.')

  return {
    paths: { revenue: revPaths, expenses: expFitPresent ? expPaths : null },
    result: {
      futureMonths: Array.from({ length: HORIZON }, (_, k) => addMonths(months[n - 1], k + 1)),
      method: !longHistory ? 'last-year-growth' : kind === 'multiplicative' ? 'seasonal-multiplicative' : kind === 'additive' ? 'seasonal-additive' : 'trend-only',
      seasonal: !longHistory || kind !== 'none',
      backtest: backtest(revenue, months),
      revenue: revBand,
      expenses: expBand,
      net: netBand,
      trailing12: { revenue: trailingRev, expenses: trailingExp },
      next12: {
        revenue: spread(rev12),
        expenses: expFitPresent ? spread(expPaths.map((p) => sum(p))) : null,
        net: netPaths ? spread(netPaths.map((p) => sum(p))) : null,
      },
      growth: spread(rev12.map((v) => v / trailingRev - 1)),
      probBelowLastYear: {
        revenue: rev12.filter((v) => v < trailingRev).length / rev12.length,
        expenses: expFitPresent && trailingExp !== null ? expPaths.filter((pth) => sum(pth) < trailingExp).length / expPaths.length : null,
        net: netPaths && trailingExp !== null ? netPaths.filter((pth) => sum(pth) < trailingRev - trailingExp).length / netPaths.length : null,
      },
      samples: { revenue: sample(revPaths), expenses: expFitPresent ? sample(expPaths) : null, net: netPaths ? sample(netPaths) : null },
      usedPatch,
      seasonalShape: seasonalShapeFn(),
      notes,
    },
  }
}

