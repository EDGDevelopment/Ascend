# Financial model: forecast, value and resilience

Clients enter **monthly** revenue and expenses on **Dashboard > Financial model**: a three-step page (add months, answer a few questions, see the forecast) with everything technical folded away. Ascend turns that into a
12-month forecast with a range, then adds what matters for the kind of organisation:

| | Local business | Non-profit |
| --- | --- | --- |
| Always | 12-month revenue, expense and cash-flow forecast with a range | same |
| Then | What the business is worth (a range) | How long the money lasts and how exposed the funding is |

Around the forecast sits a toolkit (tabs on the results): **What if** (price, volume and cost sliders with a ranking
of the biggest levers), **Break-even** (fixed and variable costs fitted from the client's own months), **Cash safety**
(how long cash lasts and the chance of running short), **Alerts** (unusual months, tested on the COVID shock) and
**Customers** (lifetime value against cost to win one). Non-profits get What if and Alerts alongside the runway
view. The forecast also drives the Overview and Forecasts charts, so the dashboards show the client's own months
and the model's next three, not sample data.

## How it fits together

```
Excel template / CSV / form
        |
 src/valuation/spreadsheet.ts          parse and tidy the file (dates, "1,200", "8%", "Mar 2025", ...)
        |
 src/valuation/service.ts              runs the model: Supabase Edge Function first, browser as fallback
        |
 supabase/functions/valuation          Edge Function (JWT required)
 supabase/functions/_shared/valuation  the engine: plain TypeScript, no imports from outside the folder
   rand.ts       seeded random numbers, percentiles, month arithmetic
   forecast.ts   monthly forecasting + prediction ranges + self-test
   patch.ts      Ascend Patch Forecaster inference (transformer, loaded from patch-weights.json)
   signals.ts    unusual-month alerts
   costs.ts      fixed/variable cost split and break-even
   scenario.ts   what-if engine, lever ranking, customer economics
   cash.ts       cash projection shared by businesses and non-profits
   dcf.ts        discounted cash flow, sensitivity grid, Monte Carlo
   local.ts      owner-run business valuation (SDE multiple + DCF check + asset floor)
   nonprofit.ts  cash runway, reserves, funding mix, grant pipeline
   model.ts      entry point and validation
        |
 public.valuation_models               inputs + latest output, one row per user (RLS)
        |
 src/data/useDashboardData.ts          swaps sample series for the client's own when a model exists
```

The engine has no dependencies and uses no browser, Node or Deno APIs, so the same files run in the Edge
Function and in the browser. For a given seed both give identical numbers.

## Methods, and why

**Forecast** (`forecast.ts`). With 24 or more months, the point forecast is a weighted average of methods:
damped-trend exponential smoothing with seasonality (Holt-Winters), "last year scaled by recent year-over-year
growth", Theta on seasonally adjusted data (the M3 competition winner) and, with 36+ months and when the model is
loaded, the **Ascend Patch Forecaster** at half the weight. The three statistical methods averaged beat each of them
alone on real retail data, and the patch model lifted that blend a little further. With 12 to 23 months only
"last year scaled by recent growth" is used, because trend models mistake a seasonal swing for a trend until they
have seen a full cycle twice. Ranges come from the **Monte Carlo**: 3,000 simulated futures that resample the
model's own past one-step errors, with revenue and expenses drawn together so good and bad months stay linked.
Each simulated future also draws its own random mixture of the methods (a Dirichlet draw), so the spread reflects
genuine disagreement between methods as well as noise. Each run also hides the most recent months, forecasts
them, and reports how far off it was against the naive "same month last year" guess: the self-test.

**Ascend Patch Forecaster** (`patch.ts`, trained in `training/patch/`). A small patch-based transformer (about
450,000 parameters): it reads the last 36 months as patches of 3, and learns a correction to the last-year
baseline. Trained on 48,000 real series from the public M4 forecasting competition plus real US retail series, and
scored only on series it never saw. Alone it reaches 95.4% monthly accuracy, about level with the statistical
methods; blended, it adds roughly 0.2 points. The weights (2.4 MB) load lazily in the browser and once at
start-up in the Edge Function. The TypeScript inference matches PyTorch to 0.004%.

**Local business value** (`local.ts`). Seller's discretionary earnings (SDE) times a multiple is the usual
method for owner-run businesses; multiples of roughly 1.5x to 4x are commonly quoted. A DCF is shown as a
cross-check, not the headline: it uses the forecast for year-one growth, takes profit after a fair manager
wage, and discounts at a build-up rate (risk-free + market premium + small-business premium + own-risk
premium, about 18% by default) because a local business has no stock beta. The DCF's uncertainty comes from
the forecast's own range plus the margin / rate / long-run-growth uncertainties the client sets. The headline
is a weighted average of the methods (earnings multiple 40%, cash flow 30%, excess earnings 30%; 55/45 when no
equipment value is given), floored at the value of saleable equipment and stock. The **excess earnings method**
(value = assets + goodwill, goodwill being earnings beyond a fair return on assets, capitalised) is what appraisers
use for small businesses; it is built on the DCF's own after-tax cash flow so the methods are comparable. The page
says whether the methods agree closely, roughly or widely. The preset multiples
are rules of thumb inside the quoted range, not market data.

**Non-profit resilience** (`nonprofit.ts`). No owner to sell to, so it answers the board's questions:
months of cash on hand, operating reserve ratio (unrestricted net assets / average monthly spending; 3 to 6
months is the usual recommendation), chance of running dry in the next 12 months, chance of a surplus,
funding concentration, and the dollars of individual giving to win again each year given donor retention.
Grants and campaigns in progress go in as a pipeline: each lands in full or not at all, with the chance the
client gives, so lumpy income is not averaged into a smooth drip.

Background reading used while designing this: [how to value a small business](https://capsulecrm.com/blog/how-to-value-a-small-business/),
[small business valuation guide](https://beancount.io/blog/2026/03/15/how-to-value-a-small-business-complete-guide),
[non-profit financial metrics](https://blog.blackbaud.com/nonprofit-financial-metrics/),
[10 financial metrics for NPOs](https://enkel.ca/?p=23718),
[Holt-Winters notes](https://metricgate.com/docs/triple-exponential-smoothing-holt-winters/).

## How well does the forecast work?

Measured on 31 real monthly series: US Census Monthly Retail Trade by store type (29 series, via FRED
`https://fred.stlouisfed.org/graph/fredgraph.csv?id=MRTSSM<code>USN`), plus airline passengers and Quebec car
sales from `github.com/jbrownlee/Datasets`. At many past dates the engine saw only the last 36 (or 18) months and
forecast the next 12. "Accuracy" is 100% minus the average monthly percentage error. Reproduce with
`node scripts/backtest.mjs <folder of CSVs>`.

**Statistical engine, 2,611 windows:**

| History given | Accuracy | "Same month last year" | Range contained the truth (aim 80%) |
| --- | --- | --- | --- |
| 36 months | **95.2%** | 93.4% | 85% |
| 18 months | **94.7%** | 93.3% | 82% |

**With the Patch Forecaster, cross-fitted** (the patch model forecasting each series was trained on the *other*
half of the series, so it never saw the one it forecasts; 1,770 windows of 36 months of history):

| | Monthly accuracy | Full-year total | Range contained the truth | Range width |
| --- | --- | --- | --- | --- |
| Statistical engine only | 95.34% | 96.71% | 80.6% | 16.4% |
| **With the Patch Forecaster** | **95.52%** | **96.91%** | **81.3%** | 16.4% |

How the patch model got there (monthly accuracy on series it never saw): 92.8% trained on 15 retail series only;
94.0% after adding the 48,000 M4 series; **95.4%** once it learned a correction to a strong baseline instead of
forecasting from scratch. M4 includes some public US series, so the same models were also scored on the 409
windows whose forecast period is after M4's data ends: hybrid 92.1%, statistical 91.7% (both lower because those
windows contain the COVID shock). The hybrid is never worse.

The other tools were checked against known truth: the cost fitter recovered a true $22,000 fixed / 62% variable cost
structure to within $1 and 0.1 point; what-if changes reproduce the headline exactly at zero change and match the
algebra for price and volume; the alert detector flagged the March to May 2020 shock in 22 of 26 retail categories
(restaurants: -31%, -52%, -36%) while flagging only 0.5% of normal months. The valuation methods cannot be
validated this way, because there is no public data of small-business sale prices to score them against.

What "95%" does and does not mean:

- These are **national totals for whole retail categories**, which average over thousands of shops. A single
  shop is bumpier and will score lower. The in-app badge is computed from the client's own recent months, so
  it shows what holds for them. Do not promise 95% to a client; show them their own number.
- The full-year total is more accurate than any single month, which is the figure owners plan around.
- It is weaker on strongly trending series with short history (Quebec car sales at 18 months: 87.5%, ranges
  too narrow there and on short airline data). COVID-era windows were the stress test.
- It assumes the future behaves like the past. A new competitor, a lost contract, a move or a one-off event
  is not in the forecast.
- The Monte Carlo settings (`TUNING` in `forecast.ts`) were calibrated on these windows so the ranges contain
  the truth about 8 times in 10. Re-run the backtest if the method changes.

## Spreadsheet format

`.xlsx` with a **Monthly** sheet (Month, Revenue, Expenses) and a details sheet (**Business** for local
businesses; **Organisation** and **Pipeline** for non-profits). Download the right template from the page.
A `.csv` carries the monthly table only. Months can be `2025-03`, `Mar 2025`, `3/2025`, `3/1/2025` or an Excel
date. Numbers can have commas or a currency symbol; rates can be `0.08`, `8` or `8%`. Expenses are optional for
businesses and required for non-profits. Months must be consecutive, 12 to 120 of them.

## Colours

The simulation charts sit on a dark "stage" (`.stage-dark` in `src/index.css`) in both themes, and follow a best-to-worst ramp (teal, Ascend green, amber, coral) defined as
`--color-out-1` to `--color-out-4` in `src/index.css`, with light and dark values, so they follow the theme.

## Deploying the backend

The app works without any of this (it calculates in the browser and keeps results in localStorage).
To run it on Supabase:

```bash
supabase db push                        # creates public.valuation_models (migration 0002)
supabase functions deploy valuation     # JWT verification stays on
```

The Edge Function has not been run against a real Supabase project yet; only the shared engine has been
tested (in Node and in the browser). It imports `patch-weights.json` with `with { type: 'json' }`, which needs a
recent Deno; if that fails it should be changed to read the file at start-up.

## Tests

There is no test runner in the repo yet. What has been checked: the DCF matches an independent hand
calculation to the cent; the forecaster was backtested on the data above; and the upload, run, dashboard and
reload flows were driven in Chrome for both organisation types.
