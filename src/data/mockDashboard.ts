import { mockSeries } from './mockSeries'
import type { DashboardData, Kpi, MetricKey } from './types'

function kpi(key: MetricKey, label: string, inverse = false): Kpi {
  const actuals = mockSeries[key].filter((p) => p.actual !== null).map((p) => p.actual as number)
  const value = actuals[actuals.length - 1]
  const prev = actuals[actuals.length - 2]
  return {
    key,
    label,
    value,
    change: Number((((value - prev) / prev) * 100).toFixed(1)),
    inverse,
    spark: actuals.slice(-12),
  }
}

export const mockDashboard: DashboardData = {
  business: { name: "Bella's Cafe", industry: 'Food and beverage', location: 'Austin, TX' },
  healthScore: 82,
  healthChange: 3,
  healthFactors: [
    { name: 'Revenue momentum', score: 88, note: 'Growing faster than your 12 month trend' },
    { name: 'Cash resilience', score: 84, note: 'About 4.2 months of operating runway' },
    { name: 'Cost control', score: 71, note: 'Payroll share is edging up' },
    { name: 'Demand stability', score: 79, note: 'Weekday sales trail weekends' },
    { name: 'Inventory efficiency', score: 76, note: 'Turnover is 16% below pattern' },
  ],
  kpis: [kpi('revenue', 'Revenue'), kpi('expenses', 'Expenses', true), kpi('cashFlow', 'Cash flow')],
  series: mockSeries,
  opportunities: [
    {
      id: 'opp-weekday',
      title: 'Weekday demand is under potential',
      summary: 'Mon to Thu sales are 18% below your weekend-adjusted level.',
      detail:
        'The model compares each weekday with its own history and with the weekend lift you already achieve. Tuesday and Wednesday afternoons show the largest gap. A weekday lunch offer or a loyalty prompt in that window is the likeliest lever.',
      area: 'Revenue',
      impact: 'High',
      confidence: 0.86,
      monthlyValue: 3900,
      status: 'New',
    },
    {
      id: 'opp-inventory',
      title: 'Inventory turnover has slowed',
      summary: 'Turnover is 16% below your usual pattern.',
      detail:
        'Slower-moving items are being restocked at the same rate as fast sellers. Reducing order quantities on the five slowest SKUs would free working capital without affecting your top category.',
      area: 'Inventory',
      impact: 'High',
      confidence: 0.81,
      monthlyValue: 2400,
      status: 'Reviewing',
    },
    {
      id: 'opp-payroll',
      title: 'Payroll share is rising',
      summary: 'Labor grew 3.1% while revenue grew 8.4%.',
      detail:
        'Scheduled hours are flat on low-traffic mornings. Shifting two shifts toward the afternoon peak would hold coverage where demand is highest.',
      area: 'Costs',
      impact: 'Medium',
      confidence: 0.74,
      monthlyValue: 1350,
      status: 'New',
    },
    {
      id: 'opp-cash',
      title: 'Cash buffer can fund growth',
      summary: 'Cash flow stays positive through December.',
      detail:
        'Even at the low end of the forecast range, cash flow remains above your 60 day operating cost. There is room to invest in the weekday offer without stressing liquidity.',
      area: 'Cash flow',
      impact: 'Medium',
      confidence: 0.79,
      monthlyValue: 1100,
      status: 'New',
    },
    {
      id: 'opp-repeat',
      title: 'Repeat customers are flattening',
      summary: 'Returning visits are up 0.8%, new customers 6%.',
      detail:
        'Acquisition is healthy but retention has stalled. A simple punch-card or email follow-up for first-time visitors targets the gap.',
      area: 'Customers',
      impact: 'Low',
      confidence: 0.63,
      monthlyValue: 640,
      status: 'Done',
    },
  ],
  activity: [
    { id: 'a1', kind: 'opportunity', text: 'New opportunity: weekday demand is under potential', time: '2 hours ago' },
    { id: 'a2', kind: 'forecast', text: 'Q4 revenue forecast refreshed after September close', time: '5 hours ago' },
    { id: 'a3', kind: 'signal', text: 'Change signal: inventory turnover fell below its usual range', time: 'Yesterday' },
    { id: 'a4', kind: 'data', text: 'Point of sale export synced, 1,842 new transactions', time: 'Yesterday' },
    { id: 'a5', kind: 'data', text: 'Payroll file validated with 2 mapped columns', time: '2 days ago' },
    { id: 'a6', kind: 'forecast', text: 'Cash flow outlook updated, range narrowed by 6%', time: '4 days ago' },
  ],
  demand: [
    { day: 'Mon', actual: 1420, potential: 1780 },
    { day: 'Tue', actual: 1390, potential: 1820 },
    { day: 'Wed', actual: 1510, potential: 1850 },
    { day: 'Thu', actual: 1680, potential: 1900 },
    { day: 'Fri', actual: 2240, potential: 2300 },
    { day: 'Sat', actual: 2860, potential: 2880 },
    { day: 'Sun', actual: 2540, potential: 2560 },
  ],
  sources: [
    { id: 's1', name: 'Square POS', type: 'Transactions', status: 'Healthy', lastSync: '12 min ago', records: 48210, coverage: '24 months' },
    { id: 's2', name: 'QuickBooks Online', type: 'Accounting', status: 'Healthy', lastSync: '1 hour ago', records: 9120, coverage: '24 months' },
    { id: 's3', name: 'Gusto Payroll', type: 'Payroll', status: 'Syncing', lastSync: 'In progress', records: 1460, coverage: '18 months' },
    { id: 's4', name: 'Inventory spreadsheet', type: 'Inventory (CSV)', status: 'Needs attention', lastSync: '3 days ago', records: 3280, coverage: '14 months' },
  ],
  model: {
    name: 'Ascend Patch Forecaster',
    version: 'v0.4 (prototype)',
    architecture: 'Patch-based time-series transformer',
    patchLength: 3,
    stride: 1,
    contextMonths: 18,
    horizonDays: 90,
    parameters: '4.1M',
    lastTrained: 'Sep 28, 2026',
    status: 'Sample output',
  },
  accuracy: [
    { horizon: '30 days', error: 3.1 },
    { horizon: '60 days', error: 4.8 },
    { horizon: '90 days', error: 6.7 },
  ],
  trainingRuns: [
    { id: 'run-0418', date: 'Sep 28, 2026', dataset: 'Bella\'s Cafe, 18 months', mape: 4.2, note: 'Added payroll and inventory channels' },
    { id: 'run-0411', date: 'Sep 14, 2026', dataset: 'Bella\'s Cafe, 17 months', mape: 4.9, note: 'Tuned patch length from 2 to 3' },
    { id: 'run-0403', date: 'Aug 30, 2026', dataset: 'Bella\'s Cafe, 16 months', mape: 5.8, note: 'Baseline with revenue only' },
  ],
}
