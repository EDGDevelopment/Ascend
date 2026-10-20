"""Check the TypeScript inference against PyTorch on real windows. Prints expected forecasts to a JSON the TS test reads."""
import sys, os, json, numpy as np, torch
import train_patch as tp

def baseline_log(x):
    """log(baseline / level): last year's months scaled by the last six months' year-over-year growth (the engine's last-year method)."""
    r = np.exp(x)
    g = np.clip(r[-6:].sum() / r[-18:-12].sum(), 0.6, 1.6)
    return x[-12:] + np.log(g)
ck = torch.load(sys.argv[1], map_location='cpu')
nets = []
for sd in ck['states']:
    n = tp.Net(d=ck['dim'], layers=ck['layers'], heads=4, ff=4 * ck['dim'], drop=0.1); n.load_state_dict(sd); n.eval(); nets.append(n)
series = tp.load_series(sys.argv[2])
cases = []
rng = np.random.RandomState(1)
for s in [series[i] for i in (1, 5, 9, 14, 20)]:
    for end in rng.randint(36, len(s['y']) - 12, size=3):
        x, mo, fm, level = tp.window(s, int(end))
        with torch.no_grad():
            out = np.mean([n(torch.tensor(x[None], dtype=torch.float32), torch.tensor(mo[None]), torch.tensor(fm[None])).numpy()[0] for n in nets], 0)
        if os.environ.get('HYBRID') == '1': out = out + baseline_log(x)          # hybrid models predict a correction to the baseline
        cases.append({'series': s['name'], 'values': [float(v) for v in s['y'][int(end) - 36:int(end)]], 'months': [int(m) for m in mo], 'expected': [float(v) for v in np.exp(out) * level]})
json.dump(cases, open(sys.argv[3], 'w'))
print(len(cases), 'parity cases written')
