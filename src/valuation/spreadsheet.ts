import readExcelFile from 'read-excel-file/browser'
import writeExcelFile from 'write-excel-file/browser'
import { MIX_LABELS, PRESETS, addMonths, type FundingMix, type LocalProfile, type MonthlyRow, type NonprofitProfile, type OrgType, type PipelineItem, type Preset } from './engine'
import { lastCompleteMonth } from './defaults'

export interface ParsedSheet {
  orgType?: OrgType
  companyName?: string
  monthly: MonthlyRow[]
  /** Only the values the file actually contained. */
  local: Partial<LocalProfile>
  nonprofit: Partial<Omit<NonprofitProfile, 'mix'>> & { mix?: Partial<FundingMix> }
  warnings: string[]
}

type Cell = string | number | boolean | Date | null | undefined

interface Row<K extends string> {
  key: K
  label: string
  kind: 'pct' | 'num' | 'int'
  example: number
  note: string
  /** Blank or zero means "not given". */
  optional?: boolean
}

export const LOCAL_ROWS: Row<Exclude<keyof LocalProfile, 'preset'>>[] = [
  { key: 'netProfit', label: 'Net profit, last 12 months', kind: 'num', example: 0, note: 'Profit before income tax. Leave 0 and it is worked out from your monthly revenue and expenses.', optional: true },
  { key: 'ownerPay', label: 'Owner pay, last 12 months', kind: 'num', example: 42000, note: 'Salary and draws you took out. Added back, because a new owner would take their own.' },
  { key: 'depreciation', label: 'Depreciation, last 12 months', kind: 'num', example: 0, note: 'A non-cash cost, added back.' },
  { key: 'interest', label: 'Interest paid, last 12 months', kind: 'num', example: 0, note: 'Added back, because it depends on how the business is funded.' },
  { key: 'otherAddBacks', label: 'One-off or personal costs, last 12 months', kind: 'num', example: 0, note: 'A repair, a trip, a relative on the payroll: costs a new owner would not have.' },
  { key: 'fairManagerWage', label: 'Fair wage for a manager', kind: 'num', example: 0, note: 'What you would pay someone to run it. Leave 0 to use your own pay.', optional: true },
  { key: 'maintenanceCapex', label: 'Yearly equipment and upkeep spend', kind: 'num', example: 0, note: 'What it costs each year to keep things working. Leave 0 to assume 1.5% of sales.', optional: true },
  { key: 'assetValue', label: 'Equipment and stock you could sell', kind: 'num', example: 0, note: 'Sets a floor under the value. Leave 0 if unsure.', optional: true },
  { key: 'cashOnHand', label: 'Cash in the bank today', kind: 'num', example: 0, note: 'Enables the cash-safety check. Needs monthly expenses. Leave 0 to skip.', optional: true },
  { key: 'reserveTargetMonths', label: 'Cash target, months of spending', kind: 'num', example: 3, note: 'How many months of costs you want in the bank.' },
  { key: 'netDebt', label: 'Net debt', kind: 'num', example: 20000, note: 'Loans minus cash in the business. Negative if you hold net cash.' },
  { key: 'multipleLow', label: 'Multiple of owner earnings, low', kind: 'num', example: 1.8, note: 'Typical small-business range is about 1.5 to 4.' },
  { key: 'multipleMid', label: 'Multiple of owner earnings, typical', kind: 'num', example: 2.4, note: '' },
  { key: 'multipleHigh', label: 'Multiple of owner earnings, high', kind: 'num', example: 3.0, note: '' },
  { key: 'taxRate', label: 'Tax rate', kind: 'pct', example: 0.25, note: '' },
  { key: 'sizePremium', label: 'Small-business size premium', kind: 'pct', example: 0.05, note: 'Extra return buyers expect for the risk of a small business.' },
  { key: 'specificRisk', label: 'Business-specific risk premium', kind: 'pct', example: 0.04, note: 'Higher if you depend on the owner, one big customer or one location.' },
  { key: 'terminalGrowth', label: 'Long-run growth', kind: 'pct', example: 0.025, note: 'Keep at or below long-run economic growth.' },
]

export const NONPROFIT_ROWS: Row<'cashOnHand' | 'unrestrictedNetAssets' | 'reserveTargetMonths' | 'donorRetention'>[] = [
  { key: 'cashOnHand', label: 'Cash on hand', kind: 'num', example: 85000, note: 'Bank balance today.' },
  { key: 'unrestrictedNetAssets', label: 'Unrestricted net assets', kind: 'num', example: 60000, note: 'Reserves with no donor restriction. Leave 0 to use cash on hand.', optional: true },
  { key: 'reserveTargetMonths', label: 'Reserve target, months of spending', kind: 'num', example: 3, note: 'Three to six is the usual recommendation.' },
  { key: 'donorRetention', label: 'Donor retention rate', kind: 'pct', example: 0, note: 'Share of last year\'s donors who gave again. Leave 0 if unknown.', optional: true },
]

const MIX_KEYS = Object.keys(MIX_LABELS) as (keyof FundingMix)[]
const MIX_EXAMPLE: Record<keyof FundingMix, number> = { individuals: 0.3, foundations: 0.3, government: 0.15, earned: 0.2, corporate: 0.05 }

const MONTH_NAMES = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

// Downloading ------------------------------------------------------------

function save(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

const head = (...labels: string[]) => labels.map((value) => ({ value, fontWeight: 'bold' as const }))
const fmtRow = (r: { label: string; kind: string; example: number; note: string }) => [
  { value: r.label },
  r.kind === 'pct' ? { value: r.example, format: '0.0%' } : { value: r.example },
  { value: r.note },
]

export async function downloadTemplate(orgType: OrgType) {
  const end = lastCompleteMonth()
  // 24 example months, so the sheet shows the shape clients should fill in. Two years is the point where seasonality can be learned.
  const monthly = [
    head('Month (YYYY-MM)', 'Revenue', orgType === 'nonprofit' ? 'Expenses (required)' : 'Expenses (optional)'),
    ...Array.from({ length: 24 }, (_, i) => {
      const revenue = 30000 + i * 450 + Math.round(Math.sin(((i + 1) / 12) * 2 * Math.PI) * 3500)
      return [{ value: addMonths(end, i - 23) }, { value: revenue }, { value: Math.round(revenue * 0.85) }]
    }),
  ]
  const monthlyCols = [{ width: 18 }, { width: 14 }, { width: 22 }]

  if (orgType === 'local') {
    const business = [
      head('Detail', 'Value', 'Notes'),
      [{ value: 'Company name' }, { value: 'Your business' }, { value: '' }],
      [{ value: 'Business type' }, { value: PRESETS.shop.label }, { value: `One of: ${Object.values(PRESETS).map((p) => p.label).join('; ')}. Sets the starting multiples.` }],
      ...LOCAL_ROWS.map(fmtRow),
    ]
    const blob = await writeExcelFile([
      { data: monthly, sheet: 'Monthly', columns: monthlyCols },
      { data: business, sheet: 'Business', columns: [{ width: 44 }, { width: 28 }, { width: 80 }] },
    ]).toBlob()
    save(blob, 'ascend-local-business-template.xlsx')
    return
  }

  const org = [
    head('Detail', 'Value', 'Notes'),
    [{ value: 'Organisation name' }, { value: 'Your organisation' }, { value: '' }],
    ...NONPROFIT_ROWS.map(fmtRow),
    [{ value: '' }, { value: '' }, { value: '' }],
    head('Where your income comes from', 'Share', 'Should add up to 100%'),
    ...MIX_KEYS.map((k) => [{ value: MIX_LABELS[k] }, { value: MIX_EXAMPLE[k], format: '0.0%' }, { value: '' }]),
  ]
  const pipeline = [
    head('Grant or campaign', 'Amount', 'Chance it comes in (%)', 'Expected month (YYYY-MM)'),
    [{ value: 'Example: community foundation grant' }, { value: 25000 }, { value: 0.5, format: '0%' }, { value: addMonths(end, 3) }],
  ]
  const blob = await writeExcelFile([
    { data: monthly, sheet: 'Monthly', columns: monthlyCols },
    { data: org, sheet: 'Organisation', columns: [{ width: 44 }, { width: 28 }, { width: 70 }] },
    { data: pipeline, sheet: 'Pipeline', columns: [{ width: 40 }, { width: 14 }, { width: 24 }, { width: 26 }] },
  ]).toBlob()
  save(blob, 'ascend-nonprofit-template.xlsx')
}

// Parsing ----------------------------------------------------------------

function toNumber(v: Cell): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? v : null
  if (typeof v !== 'string') return null
  const s = v.trim().replace(/[$£€,\s]/g, '')
  if (!s) return null
  const pct = s.endsWith('%')
  const n = Number(pct ? s.slice(0, -1) : s)
  if (!Number.isFinite(n)) return null
  return pct ? n / 100 : n
}

const norm = (v: Cell) => String(v ?? '').toLowerCase().replace(/[^a-z0-9&]+/g, ' ').trim()
const pad = (n: number) => String(n).padStart(2, '0')

/** Accepts 2025-03, 2025-03-01, 2025/03, 3/2025, 3/1/2025, "Mar 2025", "March 2025", "Mar-25" and Excel dates. */
export function parseMonth(v: Cell): string | null {
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : `${v.getUTCFullYear()}-${pad(v.getUTCMonth() + 1)}`
  if (typeof v !== 'string') return null
  const s = v.trim().toLowerCase()
  let m = s.match(/^(\d{4})[-/.](\d{1,2})(?:[-/.]\d{1,2})?$/)
  if (m) return Number(m[2]) >= 1 && Number(m[2]) <= 12 ? `${m[1]}-${pad(Number(m[2]))}` : null
  m = s.match(/^(\d{1,2})[/-](\d{4})$/)
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${pad(Number(m[1]))}` : null
  m = s.match(/^(\d{1,2})\/\d{1,2}\/(\d{4})$/)
  if (m) return Number(m[1]) >= 1 && Number(m[1]) <= 12 ? `${m[2]}-${pad(Number(m[1]))}` : null
  m = s.match(/^([a-z]{3,9})[\s.,-]+(\d{2}|\d{4})$/)
  if (m) {
    const idx = MONTH_NAMES.indexOf(m[1].slice(0, 3))
    if (idx < 0) return null
    const year = m[2].length === 2 ? 2000 + Number(m[2]) : Number(m[2])
    return `${year}-${pad(idx + 1)}`
  }
  return null
}

function parseMonthly(rows: Cell[][], warnings: string[]): MonthlyRow[] {
  const headerAt = rows.findIndex((r) => r.some((c) => /^month|^date|^period/.test(norm(c))) && r.some((c) => /revenue|sales|income/.test(norm(c))))
  if (headerAt < 0) {
    warnings.push('No header row with "Month" and "Revenue" columns was found.')
    return []
  }
  const headers = rows[headerAt].map(norm)
  const mi = headers.findIndex((h) => /^month|^date|^period/.test(h))
  const ri = headers.findIndex((h) => /revenue|sales|income/.test(h))
  const ei = headers.findIndex((h) => /expense|spend|cost/.test(h))
  const out: MonthlyRow[] = []
  let skipped = 0
  for (const r of rows.slice(headerAt + 1)) {
    if (r.every((c) => c === null || c === undefined || c === '')) continue
    const month = parseMonth(r[mi])
    const revenue = toNumber(r[ri])
    if (!month || revenue === null) {
      skipped++
      continue
    }
    const expenses = ei >= 0 ? toNumber(r[ei]) : null
    out.push(expenses === null ? { month, revenue } : { month, revenue, expenses })
  }
  if (skipped) warnings.push(`Skipped ${skipped} row${skipped > 1 ? 's' : ''} with a missing month or revenue.`)
  out.sort((a, b) => a.month.localeCompare(b.month))
  // Expenses are all-or-nothing in the model. If some months lack them, drop the column and say so.
  const withExp = out.filter((r) => r.expenses !== undefined).length
  if (withExp > 0 && withExp < out.length) {
    warnings.push('Some months had no expenses, so expenses were ignored. Fill every month to include them.')
    out.forEach((r) => delete r.expenses)
  }
  return out
}

function readRows<K extends string>(rows: Cell[][], defs: Row<K>[]): Partial<Record<K, number>> {
  const out: Partial<Record<K, number>> = {}
  for (const r of rows) {
    const label = norm(r[0])
    const def = defs.find((d) => norm(d.label) === label)
    if (!def) continue
    let n = toNumber(r[1])
    if (n === null) continue
    // Clients often type 8 meaning 8%. Rates above 1 can't be real here, so read them as percentages.
    if (def.kind === 'pct' && Math.abs(n) > 1) n /= 100
    if (def.optional && n === 0) continue
    out[def.key] = n
  }
  return out
}

const textAfter = (rows: Cell[][], label: string) => {
  const r = rows.find((x) => norm(x[0]) === label)
  const t = r ? String(r[1] ?? '').trim() : ''
  return t || undefined
}

function presetFromText(text: string | undefined): Preset | undefined {
  if (!text) return undefined
  const t = norm(text)
  return (Object.entries(PRESETS).find(([k, p]) => norm(p.label) === t || k === t)?.[0] as Preset | undefined)
}

function csvRows(text: string): string[][] {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let quoted = false
  for (let i = 0; i < text.length; i++) {
    const c = text[i]
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { cell += '"'; i++ }
      else if (c === '"') quoted = false
      else cell += c
    } else if (c === '"') quoted = true
    else if (c === ',') { row.push(cell); cell = '' }
    else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++
      row.push(cell); rows.push(row); row = []; cell = ''
    } else cell += c
  }
  row.push(cell)
  rows.push(row)
  return rows
}

const MAX_BYTES = 5 * 1024 * 1024

/** Reads a client file. .xlsx may carry the details too; .csv carries the monthly table only. */
export async function parseSpreadsheet(file: File): Promise<ParsedSheet> {
  if (file.size > MAX_BYTES) throw new Error('That file is over 5 MB. The template is a few kilobytes, so something else was saved into it.')
  const name = file.name.toLowerCase()
  const warnings: string[] = []

  if (name.endsWith('.csv')) {
    return { monthly: parseMonthly(csvRows(await file.text()), warnings), local: {}, nonprofit: {}, warnings }
  }
  if (!name.endsWith('.xlsx')) throw new Error('Upload an .xlsx or .csv file.')

  let sheets: Array<{ sheet: string; data: Cell[][] }>
  try {
    sheets = (await readExcelFile(file)) as Array<{ sheet: string; data: Cell[][] }>
  } catch {
    throw new Error('That file could not be read as an Excel workbook.')
  }
  const find = (n: string) => sheets.find((s) => norm(s.sheet) === n)
  const monthlySheet = find('monthly') ?? sheets[0]
  const businessSheet = find('business')
  const orgSheet = find('organisation') ?? find('organization')
  const pipelineSheet = find('pipeline')

  const result: ParsedSheet = { monthly: parseMonthly(monthlySheet.data, warnings), local: {}, nonprofit: {}, warnings }

  if (businessSheet) {
    result.orgType = 'local'
    result.companyName = textAfter(businessSheet.data, 'company name')
    result.local = readRows(businessSheet.data, LOCAL_ROWS)
    const preset = presetFromText(textAfter(businessSheet.data, 'business type'))
    if (preset && preset !== 'custom') {
      result.local.preset = preset
      const p = PRESETS[preset]
      // Multiples the file states explicitly win over the preset's.
      result.local.multipleLow ??= p.low
      result.local.multipleMid ??= p.mid
      result.local.multipleHigh ??= p.high
    } else if (result.local.multipleLow !== undefined || result.local.multipleMid !== undefined || result.local.multipleHigh !== undefined) {
      result.local.preset = 'custom'
    }
  } else if (orgSheet || pipelineSheet) {
    result.orgType = 'nonprofit'
  }

  if (orgSheet) {
    result.companyName = textAfter(orgSheet.data, 'organisation name') ?? textAfter(orgSheet.data, 'organization name')
    result.nonprofit = readRows(orgSheet.data, NONPROFIT_ROWS)
    const mix: Partial<FundingMix> = {}
    for (const r of orgSheet.data) {
      const key = MIX_KEYS.find((k) => norm(MIX_LABELS[k]) === norm(r[0]))
      if (!key) continue
      let n = toNumber(r[1])
      if (n === null) continue
      if (n > 1) n /= 100
      mix[key] = n
    }
    if (Object.keys(mix).length) result.nonprofit.mix = mix
  }

  if (pipelineSheet) {
    const rows = pipelineSheet.data
    const at = rows.findIndex((r) => /amount/.test(norm(r[1])))
    const items: PipelineItem[] = []
    for (const r of at >= 0 ? rows.slice(at + 1) : []) {
      const amount = toNumber(r[1])
      let probability = toNumber(r[2])
      const month = parseMonth(r[3])
      if (!String(r[0] ?? '').trim() || amount === null || probability === null || !month) continue
      if (probability > 1) probability /= 100
      // The template's own example row is a placeholder, not data.
      if (/^example:/i.test(String(r[0]))) continue
      items.push({ name: String(r[0]).trim(), amount, probability, month })
    }
    result.nonprofit.pipeline = items
  }
  return result
}
