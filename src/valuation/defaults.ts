import { PRESETS, addMonths, type ModelInput, type MonthlyRow } from './engine'

/** The last complete month before today, as "YYYY-MM". */
export function lastCompleteMonth(now = new Date()): string {
  return addMonths(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, -1)
}

/** 36 months of plausible sample figures so the page never opens blank. Deterministic, replaced by the client's own numbers. */
function sampleMonths(end: string): MonthlyRow[] {
  return Array.from({ length: 36 }, (_, t) => {
    const season = 1 + 0.14 * Math.sin(((t + 1) / 12) * 2 * Math.PI)
    const wobble = 1 + 0.025 * Math.sin(t * 2.1)
    const revenue = Math.round(((30000 + 520 * t) * season * wobble) / 100) * 100
    return { month: addMonths(end, t - 35), revenue, expenses: Math.round((revenue * 0.84 + 1200) / 100) * 100 }
  })
}

export function defaultInput(orgType: ModelInput['orgType'] = 'local'): ModelInput {
  const p = PRESETS.shop
  return {
    orgType,
    companyName: '',
    monthly: sampleMonths(lastCompleteMonth()),
    local: {
      // Profit, manager wage and upkeep are left blank so they are worked out from the months and from owner pay.
      ownerPay: 42000,
      depreciation: 0,
      interest: 0,
      otherAddBacks: 0,
      netDebt: 20000,
      preset: 'shop',
      multipleLow: p.low,
      multipleMid: p.mid,
      multipleHigh: p.high,
      taxRate: 0.25,
      nwcPct: 0.05,
      riskFreeRate: 0.04,
      equityRiskPremium: 0.055,
      sizePremium: 0.05,
      specificRisk: 0.04,
      terminalGrowth: 0.025,
      forecastYears: 5,
      marginSd: 0.02,
      rateSd: 0.02,
      terminalSd: 0.005,
    },
    nonprofit: {
      cashOnHand: 85000,
      unrestrictedNetAssets: 60000,
      reserveTargetMonths: 3,
      mix: { individuals: 0.3, foundations: 0.3, government: 0.15, earned: 0.2, corporate: 0.05 },
      pipeline: [],
    },
    simulations: 3000,
    seed: 42,
  }
}
