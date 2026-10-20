"""Ascend Patch Forecaster: a small patch-based transformer for monthly business series.

Context: the last 36 months. The series is scaled by its own last-12-month level and put on a log scale, so the
network sees ratios (multiplicative seasonality becomes additive) and works for a corner shop or a mall.
Each timestep carries [log ratio, sin(month), cos(month)]. Patches of 3 months with stride 1 are embedded and
passed through a transformer encoder. A shared head predicts, for each of the next 12 months, the log ratio to
the current level, given the calendar month being predicted.
"""
import sys, json, os, math, time, glob
import numpy as np, torch, torch.nn as nn

CTX, HOR, PATCH, STRIDE = 36, 12, 3, 1
torch.set_num_threads(int(os.environ.get('THREADS', '4')))

def load_series(folder):
    out = []
    for f in sorted(glob.glob(os.path.join(folder, '*.csv'))):
        rows = [l.strip().replace('"', '').split(',') for l in open(f).read().strip().split('\n')[1:]]
        ok = [(r[0], float(r[1])) for r in rows if len(r) > 1 and r[1] not in ('', '.')]
        ok = [(d, v) for d, v in ok if v > 0]
        if len(ok) < 100: continue
        first = ok[0][0]
        # Series with real dates carry their calendar month; the two without (airline.csv is dated, carsales too) are handled the same way.
        months = [int(d[5:7]) - 1 if len(d) >= 7 and d[4] == '-' else None for d, _ in ok]
        if any(m is None for m in months): continue
        out.append(dict(name=os.path.basename(f).replace('.csv', ''), dates=[d[:7] for d, _ in ok], y=np.array([v for _, v in ok], dtype=np.float64), m=np.array(months)))
    return out

def window(s, end):
    ctx = s['y'][end - CTX:end]
    level = ctx[-12:].mean()
    x = np.log(ctx / level)
    mo = s['m'][end - CTX:end]
    fut_m = s['m'][end:end + HOR]
    return x, mo, fut_m, level

def make(series, ends_fn):
    X, M, FM, Y, meta = [], [], [], [], []
    for si, s in enumerate(series):
        for end in ends_fn(s):
            x, mo, fm, level = window(s, end)
            X.append(x); M.append(mo); FM.append(fm)
            Y.append(np.log(s['y'][end:end + HOR] / level)); meta.append((si, end, level))
    return np.array(X, dtype=np.float32), np.array(M), np.array(FM), np.array(Y, dtype=np.float32), meta

class Net(nn.Module):
    def __init__(self, d=48, layers=2, heads=4, ff=128, drop=0.1):
        super().__init__()
        self.np = (CTX - PATCH) // STRIDE + 1
        self.embed = nn.Linear(PATCH * 3, d)
        self.pos = nn.Parameter(torch.zeros(1, self.np, d)); nn.init.normal_(self.pos, std=0.02)
        enc = nn.TransformerEncoderLayer(d, heads, ff, drop, batch_first=True, norm_first=True, activation='gelu')
        self.enc = nn.TransformerEncoder(enc, layers)
        self.norm = nn.LayerNorm(d)
        self.proj = nn.Linear(self.np * d, 128)
        self.head = nn.Sequential(nn.Linear(128 + 3, 96), nn.GELU(), nn.Dropout(drop), nn.Linear(96, 1))

    def forward(self, x, mo, fm):
        ang = mo.float() * (2 * math.pi / 12)
        feats = torch.stack([x, torch.sin(ang), torch.cos(ang)], -1)            # B, CTX, 3
        patches = feats.unfold(1, PATCH, STRIDE)                                   # B, np, 3, PATCH
        patches = patches.permute(0, 1, 3, 2).contiguous().reshape(x.shape[0], self.np, PATCH * 3)
        h = self.enc(self.embed(patches) + self.pos)
        r = self.proj(self.norm(h).contiguous().flatten(1))                        # B, 128
        fa = fm.float() * (2 * math.pi / 12)
        hz = torch.arange(HOR, device=x.device).float().view(1, HOR, 1).expand(x.shape[0], -1, -1) / HOR
        inp = torch.cat([r.unsqueeze(1).expand(-1, HOR, -1), torch.sin(fa).unsqueeze(-1), torch.cos(fa).unsqueeze(-1), hz], -1)
        return self.head(inp).squeeze(-1)                                          # B, HOR

def train_one(seed, Xtr, Mtr, FMtr, Ytr, Xva, Mva, FMva, Yva, epochs, log=None):
    torch.manual_seed(seed); np.random.seed(seed)
    net = Net()
    opt = torch.optim.AdamW(net.parameters(), lr=1.5e-3, weight_decay=1e-3)
    steps = epochs * math.ceil(len(Xtr) / 256)
    sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=1.5e-3, total_steps=steps, pct_start=0.15)
    T = lambda a, dt=None: torch.tensor(a) if dt is None else torch.tensor(a, dtype=dt)
    xtr, mtr, ftr, ytr = T(Xtr), T(Mtr), T(FMtr), T(Ytr)
    xva, mva, fva, yva = T(Xva), T(Mva), T(FMva), T(Yva)
    best, best_state = 1e9, None
    for ep in range(epochs):
        net.train(); perm = torch.randperm(len(xtr))
        for i in range(0, len(perm), 256):
            idx = perm[i:i + 256]
            x = xtr[idx]
            x = x + torch.randn_like(x) * 0.012                                    # a little noise: real months are never exact
            loss = (net(x, mtr[idx], ftr[idx]) - ytr[idx]).abs().mean()
            opt.zero_grad(); loss.backward(); nn.utils.clip_grad_norm_(net.parameters(), 1.0); opt.step(); sched.step()
        if len(xva):
            net.eval()
            with torch.no_grad(): v = (net(xva, mva, fva) - yva).abs().mean().item()
            if v < best: best, best_state = v, {k: t.clone() for k, t in net.state_dict().items()}
            if log and ep % 10 == 0: log(f'  seed {seed} epoch {ep} val L1(log) {v:.4f}')
    if best_state: net.load_state_dict(best_state)
    net.eval(); return net, best

def predict(nets, X, M, FM, meta):
    with torch.no_grad():
        out = np.mean([n(torch.tensor(X), torch.tensor(M), torch.tensor(FM)).numpy() for n in nets], 0)
    return [np.exp(out[i]) * meta[i][2] for i in range(len(meta))]

if __name__ == '__main__':
    folder, fold, nseeds, epochs = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4])
    outdir = sys.argv[5]; os.makedirs(outdir, exist_ok=True)
    series = load_series(folder)
    print(f'{len(series)} real series; fold {fold}', flush=True)
    idx = list(range(len(series)))
    even = [i for i in idx if i % 2 == 0]; odd = [i for i in idx if i % 2 == 1]
    train_ids = {0: even, 1: odd, 2: idx}[fold]
    test_ids = {0: odd, 1: even, 2: []}[fold]
    tr_series = [series[i] for i in train_ids]
    # Train on windows that END before 2015; validate on 2015-2019 (before the COVID shock, so early stopping never sees it).
    cut_a = lambda s: [e for e in range(CTX, len(s['y']) - HOR + 1) if s['dates'][e - 1] < '2015-01']
    cut_b = lambda s: [e for e in range(CTX, len(s['y']) - HOR + 1) if '2015-01' <= s['dates'][e - 1] < '2020-01' and (e % 2 == 0)]
    allw = lambda s: list(range(CTX, len(s['y']) - HOR + 1))
    Xtr, Mtr, FMtr, Ytr, _ = make(tr_series, allw if fold == 2 else cut_a)
    Xva, Mva, FMva, Yva, _ = make(tr_series, cut_b)
    print(f'train windows {len(Xtr)}, validation windows {len(Xva)}', flush=True)
    t0 = time.time(); nets = []
    for sd in range(nseeds):
        net, best = train_one(sd, Xtr, Mtr, FMtr, Ytr, Xva, Mva, FMva, Yva, epochs, log=lambda m: print(m, flush=True))
        nets.append(net); print(f'seed {sd} done, best val {best:.4f}, {time.time() - t0:.0f}s', flush=True)
    torch.save([n.state_dict() for n in nets], os.path.join(outdir, f'nets_fold{fold}.pt'))
    if test_ids:
        te_series = [series[i] for i in test_ids]
        ends = lambda s: list(range(CTX, len(s['y']) - HOR + 1, 6))   # same windows as the statistical backtest (36-month context, every 6 months)
        X, M, FM, Y, meta = make(te_series, ends)
        pred = predict(nets, X, M, FM, meta)
        rows = []
        for p, (si, end, level), y in zip(pred, meta, Y):
            s = te_series[si]
            rows.append(dict(series=s['name'], end=end, month=s['dates'][end - 1], forecast=[float(v) for v in p], truth=[float(v) for v in s['y'][end:end + HOR]]))
        json.dump(rows, open(os.path.join(outdir, f'preds_fold{fold}.json'), 'w'))
        mape = np.mean([np.mean(np.abs(np.array(r['truth']) - np.array(r['forecast'])) / np.array(r['truth'])) for r in rows])
        tot = np.mean([abs(sum(r['truth']) - sum(r['forecast'])) / sum(r['truth']) for r in rows])
        print(f'HELD-OUT (series the model never saw): {len(rows)} windows | monthly accuracy {100 - 100 * mape:.1f}% | 12-month total accuracy {100 - 100 * tot:.1f}%', flush=True)
