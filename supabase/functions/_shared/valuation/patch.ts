/**
 * Ascend Patch Forecaster: inference for the small patch-based transformer trained in training/patch/.
 * Pure TypeScript, no dependencies, so it runs in the Edge Function and in the browser.
 *
 * The model reads the last 36 months, scaled by the series' own last-12-month level and put on a log scale.
 * Each month carries [log ratio, sin(calendar month), cos(calendar month)]. Patches of 3 months (stride 1) go
 * through a pre-norm transformer encoder, and a shared head predicts, for each of the next 12 months, the log
 * ratio to the current level given the calendar month being predicted. An ensemble of nets is averaged.
 */

export const PATCH_CTX = 36
export const PATCH_HOR = 12
const PATCH = 3

export interface PatchWeightsFile {
  version: number
  /** True when the network predicts a correction to the "last year scaled by recent growth" baseline. */
  hybrid?: boolean
  dim: number
  layers: number
  heads: number
  ff: number
  /** One entry per ensemble member: tensor name -> { shape, data: base64 of little-endian float16 }. */
  nets: Record<string, { shape: number[]; data: string }>[]
}

type Tensor = { shape: number[]; v: Float32Array }
type Net = Record<string, Tensor>

function f16(h: number): number {
  const s = (h & 0x8000) >> 15
  const e = (h & 0x7c00) >> 10
  const f = h & 0x03ff
  if (e === 0) return (s ? -1 : 1) * 2 ** -14 * (f / 1024)
  if (e === 31) return f ? Number.NaN : s ? -Infinity : Infinity
  return (s ? -1 : 1) * 2 ** (e - 15) * (1 + f / 1024)
}

function decode(b64: string): Float32Array {
  const bin = atob(b64)
  const n = bin.length / 2
  const out = new Float32Array(n)
  for (let i = 0; i < n; i++) out[i] = f16(bin.charCodeAt(2 * i) | (bin.charCodeAt(2 * i + 1) << 8))
  return out
}

export function loadPatchNets(file: PatchWeightsFile): Net[] {
  return file.nets.map((net) => Object.fromEntries(Object.entries(net).map(([k, t]) => [k, { shape: t.shape, v: decode(t.data) }])))
}

// ---- tensor helpers (row-major) -------------------------------------------------------------------------------

/** y[n] = W[n,:] . x + b[n] for W with `outDim` rows of length `inDim`. */
function linear(x: Float32Array, W: Float32Array, b: Float32Array, outDim: number, inDim: number): Float32Array {
  const y = new Float32Array(outDim)
  for (let o = 0; o < outDim; o++) {
    let s = b[o]
    const base = o * inDim
    for (let i = 0; i < inDim; i++) s += W[base + i] * x[i]
    y[o] = s
  }
  return y
}

function layerNorm(x: Float32Array, w: Float32Array, b: Float32Array): Float32Array {
  const n = x.length
  let m = 0
  for (let i = 0; i < n; i++) m += x[i]
  m /= n
  let v = 0
  for (let i = 0; i < n; i++) v += (x[i] - m) ** 2
  v /= n
  const inv = 1 / Math.sqrt(v + 1e-5)
  const y = new Float32Array(n)
  for (let i = 0; i < n; i++) y[i] = (x[i] - m) * inv * w[i] + b[i]
  return y
}

/** erf with ~1e-7 error (Abramowitz and Stegun 7.1.26 refined), enough for GELU in float32. */
function erf(x: number): number {
  const s = x < 0 ? -1 : 1
  const a = Math.abs(x)
  const t = 1 / (1 + 0.3275911 * a)
  const y = 1 - (((((1.061405429 * t - 1.453152027) * t) + 1.421413741) * t - 0.284496736) * t + 0.254829592) * t * Math.exp(-a * a)
  return s * y
}
const gelu = (x: number) => 0.5 * x * (1 + erf(x / Math.SQRT2))

function forward(net: Net, cfg: { dim: number; layers: number; heads: number; ff: number }, x: Float32Array, months: number[], futureMonths: number[]): Float32Array {
  const d = cfg.dim
  const np = PATCH_CTX - PATCH + 1
  const T = (name: string) => net[name].v

  // Patches: each holds 3 consecutive months, with 3 channels per month.
  let tokens: Float32Array[] = []
  for (let p = 0; p < np; p++) {
    const inp = new Float32Array(PATCH * 3)
    for (let k = 0; k < PATCH; k++) {
      const t = p + k
      const ang = (months[t] * 2 * Math.PI) / 12
      inp[k * 3] = x[t]
      inp[k * 3 + 1] = Math.sin(ang)
      inp[k * 3 + 2] = Math.cos(ang)
    }
    const e = linear(inp, T('embed.weight'), T('embed.bias'), d, PATCH * 3)
    const pos = T('pos')
    for (let i = 0; i < d; i++) e[i] += pos[p * d + i]
    tokens.push(e)
  }

  const hd = d / cfg.heads
  for (let l = 0; l < cfg.layers; l++) {
    const pre = `enc.layers.${l}.`
    // Self-attention (pre-norm).
    const normed = tokens.map((t) => layerNorm(t, T(pre + 'norm1.weight'), T(pre + 'norm1.bias')))
    const qkv = normed.map((t) => linear(t, T(pre + 'self_attn.in_proj_weight'), T(pre + 'self_attn.in_proj_bias'), 3 * d, d))
    const attn = tokens.map(() => new Float32Array(d))
    const scale = 1 / Math.sqrt(hd)
    for (let h = 0; h < cfg.heads; h++) {
      for (let i = 0; i < np; i++) {
        const scores = new Float64Array(np)
        let max = -Infinity
        for (let j = 0; j < np; j++) {
          let s = 0
          for (let c = 0; c < hd; c++) s += qkv[i][h * hd + c] * qkv[j][d + h * hd + c]
          scores[j] = s * scale
          if (scores[j] > max) max = scores[j]
        }
        let z = 0
        for (let j = 0; j < np; j++) { scores[j] = Math.exp(scores[j] - max); z += scores[j] }
        for (let j = 0; j < np; j++) {
          const w = scores[j] / z
          for (let c = 0; c < hd; c++) attn[i][h * hd + c] += w * qkv[j][2 * d + h * hd + c]
        }
      }
    }
    tokens = tokens.map((t, i) => {
      const o = linear(attn[i], T(pre + 'self_attn.out_proj.weight'), T(pre + 'self_attn.out_proj.bias'), d, d)
      for (let c = 0; c < d; c++) o[c] += t[c]
      return o
    })
    // Feed-forward (pre-norm).
    tokens = tokens.map((t) => {
      const n = layerNorm(t, T(pre + 'norm2.weight'), T(pre + 'norm2.bias'))
      const hdn = linear(n, T(pre + 'linear1.weight'), T(pre + 'linear1.bias'), cfg.ff, d)
      for (let c = 0; c < hdn.length; c++) hdn[c] = gelu(hdn[c])
      const o = linear(hdn, T(pre + 'linear2.weight'), T(pre + 'linear2.bias'), d, cfg.ff)
      for (let c = 0; c < d; c++) o[c] += t[c]
      return o
    })
  }

  const flat = new Float32Array(np * d)
  tokens.forEach((t, i) => flat.set(layerNorm(t, T('norm.weight'), T('norm.bias')), i * d))
  const r = linear(flat, T('proj.weight'), T('proj.bias'), 128, np * d)

  const out = new Float32Array(PATCH_HOR)
  for (let h = 0; h < PATCH_HOR; h++) {
    const inp = new Float32Array(131)
    inp.set(r, 0)
    const ang = (futureMonths[h] * 2 * Math.PI) / 12
    inp[128] = Math.sin(ang)
    inp[129] = Math.cos(ang)
    inp[130] = h / PATCH_HOR
    const hid = linear(inp, T('head.0.weight'), T('head.0.bias'), 96, 131)
    for (let c = 0; c < hid.length; c++) hid[c] = gelu(hid[c])
    out[h] = linear(hid, T('head.3.weight'), T('head.3.bias'), 1, 96)[0]
  }
  return out
}

export interface PatchConfig {
  dim: number
  layers: number
  heads: number
  ff: number
  hybrid?: boolean
}

/** log(baseline / level) for the next 12 months: each month of last year scaled by the last six months' year-over-year growth. */
function baselineLog(x: Float32Array): number[] {
  const r = Array.from(x, Math.exp)
  const recent = r.slice(-6).reduce((s, v) => s + v, 0)
  const before = r.slice(-18, -12).reduce((s, v) => s + v, 0)
  const g = Math.min(1.6, Math.max(0.6, recent / before))
  return Array.from({ length: PATCH_HOR }, (_, k) => x[PATCH_CTX - 12 + k] + Math.log(g))
}

/**
 * Forecast the next 12 months from the last 36 (or more; only the last 36 are used). `months` holds each value's
 * calendar month, 0 = January. Returns null if the series cannot be scaled (non-positive values).
 */
export function patchForecast(nets: Net[], cfg: PatchConfig, values: number[], months: number[]): number[] | null {
  const n = values.length
  if (n < PATCH_CTX || nets.length === 0) return null
  const ctx = values.slice(n - PATCH_CTX)
  if (ctx.some((v) => !(v > 0))) return null
  const level = ctx.slice(-12).reduce((s, v) => s + v, 0) / 12
  const x = Float32Array.from(ctx, (v) => Math.log(v / level))
  const mo = months.slice(n - PATCH_CTX)
  const last = months[n - 1]
  const fut = Array.from({ length: PATCH_HOR }, (_, k) => (last + 1 + k) % 12)
  const outs = nets.map((net) => forward(net, cfg, x, mo, fut))
  const base = cfg.hybrid ? baselineLog(x) : null
  return Array.from({ length: PATCH_HOR }, (_, k) => level * Math.exp(outs.reduce((s, o) => s + o[k], 0) / outs.length + (base ? base[k] : 0)))
}

// ---- registry: the model is loaded once (lazily in the browser, at start-up in the Edge Function) and used by the forecaster.

let registered: { nets: Net[]; cfg: PatchConfig } | null = null

/** Make a trained model available to the forecaster. Pass null to remove it. */
export function registerPatchModel(file: PatchWeightsFile | null): void {
  registered = file ? { nets: loadPatchNets(file), cfg: { dim: file.dim, layers: file.layers, heads: file.heads, ff: file.ff, hybrid: file.hybrid } } : null
}

export const patchModelLoaded = () => registered !== null

/** 12-month forecast from the registered model, or null when none is loaded or the series is too short or not positive. */
export function patchPoint(values: number[], calendarMonths: number[]): number[] | null {
  return registered ? patchForecast(registered.nets, registered.cfg, values, calendarMonths) : null
}
