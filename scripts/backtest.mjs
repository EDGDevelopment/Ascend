// Rolling backtest of the forecaster on real monthly sales data.
//
//   node scripts/backtest.mjs <folder with CSVs>
//
// At many past dates it gives the engine only the last N months, forecasts the next 12, and scores the result
// against what really happened. It reports the average miss (MAPE) against the naive guess "same month last
// year", and how often the real value fell inside the P10-P90 range (the range promises about 80%).
// Needs Node 22.18+ (runs the engine's .ts files directly). See docs/VALUATION.md for the datasets used.
import fs from 'node:fs'
import { runForecast } from '../supabase/functions/_shared/valuation/forecast.ts'
import { addMonths } from '../supabase/functions/_shared/valuation/rand.ts'

const dir = process.argv[2]
if (!dir) {
  console.error('Usage: node scripts/backtest.mjs <folder with CSVs>')
  process.exit(1)
}

// Any CSV with a header row, then one row per month: a date (2001-01-01 or 2001-01) or text, and a number.
function load(file) {
  const rows = fs.readFileSync(`${dir}/${file}`, 'utf8').trim().split('\n').slice(1).map((l) => l.replace(/"/g, '').split(','))
  return rows
    .map(([d, v], i) => ({ month: /^\d{4}-\d{2}/.test(d) ? d.slice(0, 7) : addMonths('2001-01', i), v: Number(v) }))
    .filter((r) => Number.isFinite(r.v) && r.v > 0)
}

const pct = (x, k) => (k ? ((100 * x) / k).toFixed(1) + '%' : 'n/a')
const files = fs.readdirSync(dir).filter((f) => f.endsWith('.csv')).sort()

for (const W of [36, 18]) {
  console.log(`\n=== Training window: last ${W} months, forecast the next 12 ===`)
  let all = { n: 0, model: 0, naive: 0, cov: 0, tot: 0 }
  for (const file of files) {
    const data = load(file)
    const step = data.length > 100 ? 4 : 3
    let n = 0, model = 0, naive = 0, cov = 0, tot = 0
    for (let end = W; end + 12 <= data.length; end += step) {
      const train = data.slice(end - W, end)
      const truth = data.slice(end, end + 12)
      const { result: f } = runForecast({ months: train.map((r) => r.month), revenue: train.map((r) => r.v), expenses: null, simulations: 600, seed: end })
      model += truth.reduce((a, r, i) => a + Math.abs(r.v - f.revenue.p50[i]) / r.v, 0) / 12
      naive += truth.reduce((a, r, i) => a + Math.abs(r.v - train[W - 12 + i].v) / r.v, 0) / 12
      cov += truth.filter((r, i) => r.v >= f.revenue.p10[i] && r.v <= f.revenue.p90[i]).length
      n++; tot += 12
    }
    console.log(`${file.padEnd(28)} windows ${String(n).padStart(3)}  model ${pct(model, n).padStart(6)}  same-month-last-year ${pct(naive, n).padStart(6)}  P10-P90 hit rate ${pct(cov, tot)}`)
    all = { n: all.n + n, model: all.model + model, naive: all.naive + naive, cov: all.cov + cov, tot: all.tot + tot }
  }
  console.log(`ALL`.padEnd(28) + ` windows ${String(all.n).padStart(3)}  model ${pct(all.model, all.n).padStart(6)}  same-month-last-year ${pct(all.naive, all.n).padStart(6)}  P10-P90 hit rate ${pct(all.cov, all.tot)}`)
}
