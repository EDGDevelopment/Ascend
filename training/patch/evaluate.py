import json, sys, numpy as np
out = sys.argv[1]
stat = json.load(open('stat_preds.json'))
rows = []
for f in (0, 1):
    try: rows += json.load(open(f'{out}/preds_fold{f}.json'))
    except FileNotFoundError: print(f'fold {f} not finished'); sys.exit()
covid = lambda m: '2020-03' <= m <= '2021-12'
def score(wfn):
    m, t, m2, t2, n, n2 = 0, 0, 0, 0, 0, 0
    for r in rows:
        tr = np.array(r['truth']); nn = np.array(r['forecast']); st = np.array(stat[r['series']][str(r['end'])])
        # a window is "clean" if neither its 36-month context nor its 12-month horizon touches the COVID shock
        # (month label is the last context month; the horizon runs 12 months past it)
        yy, mm = int(r['month'][:4]), int(r['month'][5:7]); idx = yy * 12 + mm - 1
        lo, hi = 2020 * 12 + 2, 2021 * 12 + 11
        clean = not (idx - 35 <= hi and idx + 12 >= lo)
        f = wfn(nn, st)
        a = np.mean(np.abs(tr - f) / tr); b = abs(tr.sum() - f.sum()) / tr.sum()
        m += a; t += b; n += 1
        if clean: m2 += a; t2 += b; n2 += 1
    return 100 - 100 * m / n, 100 - 100 * m2 / n2, 100 - 100 * t / n, 100 - 100 * t2 / n2, n
print(f'{len(rows)} windows on series each model never saw (cross-fitted). accuracy = 100% - error')
print('method                       monthly   monthly(no COVID)   12-mo total   total(no COVID)')
naive = lambda nn, st: nn  # placeholder, replaced below
for name, fn in [('patch model alone', lambda nn, st: nn), ('statistical blend (shipped)', lambda nn, st: st)] + [(f'blend {int(w*100)}% patch + {100-int(w*100)}% stat', (lambda w: lambda nn, st: w * nn + (1 - w) * st)(w)) for w in (0.25, 0.33, 0.5, 0.75)]:
    a = score(fn); print(f'{name:<30}{a[0]:6.1f}%      {a[1]:6.1f}%           {a[2]:6.1f}%        {a[3]:6.1f}%')
