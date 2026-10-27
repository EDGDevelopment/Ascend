import { PRESETS, addMonths, type ModelInput } from './engine'

/** The last complete month before today, as "YYYY-MM". */
export function lastCompleteMonth(now = new Date()): string {
  return addMonths(`${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`, -1)
}

/** A starting point with no months in it. The client's own spreadsheet supplies those. */
export function blankInput(orgType: ModelInput['orgType'] = 'local'): ModelInput {
  const p = PRESETS.shop
  return {
    orgType,
    companyName: '',
    monthly: [],
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
