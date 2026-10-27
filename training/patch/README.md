# Ascend Patch Forecaster: training

A small patch-based transformer for monthly business series. It reads the last 36 months, scaled by the series'
own last-12-month level and put on a log scale, in patches of 3 months (stride 1), and learns a **correction to a
"last year scaled by recent growth" baseline** for each of the next 12 months, given the calendar month being
predicted. About 450,000 parameters, trained on 48,000 real series, runs in the browser and the Edge Function
through `supabase/functions/_shared/valuation/patch.ts`.

Nothing here is needed to run the app. The trained weights are committed at
`supabase/functions/_shared/valuation/patch-weights.json`.

## Data (all public, not committed)

- **M4 monthly**: 48,000 real series with start dates, from
  `https://github.com/Mcompetitions/M4-methods/tree/master/Dataset` (`Train/Monthly-train.csv`, `M4-info.csv`).
  Put them in `training/patch/m4/` or set `M4_DIR`.
- **US Census monthly retail sales** by store type, via FRED
  (`https://fred.stlouisfed.org/graph/fredgraph.csv?id=MRTSSM<code>USN`), plus the airline-passengers and Quebec
  car-sales series from `github.com/jbrownlee/Datasets`. One CSV per series, a date column then a value column.

## Run

```bash
python3 -m venv .venv && .venv/bin/pip install torch numpy
# Honest scoring: fold 0 trains on half the retail series and scores the other half, fold 1 the reverse.
HYBRID=1 .venv/bin/python train_global.py <retail csv folder> 0 1 12 out 8
HYBRID=1 .venv/bin/python train_global.py <retail csv folder> 1 1 12 out 8
# Final model on everything (what ships):
HYBRID=1 .venv/bin/python train_global.py <retail csv folder> 2 2 12 out_final 8
.venv/bin/python export_weights.py out_final/nets_fold2.pt ../../supabase/functions/_shared/valuation/patch-weights.json 2 hybrid
```

`evaluate.py` scores the cross-fitted predictions against the statistical blend. `parity.py` writes reference
forecasts so the TypeScript inference can be checked against PyTorch (it agreed to 0.008%).

## Results

Cross-fitted: every score comes from a model that never saw that series. Accuracy is 100% minus the average
monthly percentage error, over 1,770 windows of 36 months of context and a 12-month horizon.

| Model | Monthly | Full-year total |
| --- | --- | --- |
| Patch model trained on 15 retail series only | 92.8% | 96.2% |
| Patch model trained on M4 + retail | 94.0% | 96.6% |
| **Hybrid** (learns a correction to the baseline) | **95.4%** | 96.9% |
| Statistical blend (ETS + last-year + Theta) | 95.3% | 96.7% |
| 50% hybrid + 50% statistical blend (shipped) | 95.5% | 96.9% |

M4 contains some public US series, so to rule out leakage the same models were also scored on the 409 windows
whose forecast period is after M4's data ends: hybrid 92.1%, statistical 91.7% (both lower because those windows
include the COVID shock). The hybrid is never worse than the statistical blend.
