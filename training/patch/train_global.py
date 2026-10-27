"""Train the Ascend Patch Forecaster on many real series at once (M4 monthly + the training-fold FRED series).
Usage: train_global.py <fred folder> <fold 0|1|2> <seeds> <epochs> <outdir> [windows_per_m4_series]
fold 0: FRED even series join training, odd series are held out. fold 1: the reverse. fold 2: train on everything (for shipping)."""
import sys, os, csv, json, time, math
import numpy as np, torch
import train_patch as tp

CTX, HOR = tp.CTX, tp.HOR
M4 = os.environ.get('M4_DIR', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'm4'))

def load_m4(per_series, seed=0):
    info = [r for r in csv.DictReader(open(f'{M4}/M4-info.csv')) if r['SP'] == 'Monthly']
    start = {r['M4id']: int(r['StartingDate'].split(' ')[0].split('-')[1]) - 1 for r in info}
    cat = {r['M4id']: r['category'] for r in info}
    rng = np.random.RandomState(seed)
    X, M, FM, Y, C, V = [], [], [], [], [], []
    with open(f'{M4}/Monthly-train.csv') as f:
        rd = csv.reader(f); next(rd)
        for row in rd:
            sid = row[0]; vals = np.array([float(v) for v in row[1:] if v != ''], dtype=np.float64)
            n = len(vals)
            if n < CTX + HOR or (vals <= 0).any(): continue
            months = (start[sid] + np.arange(n)) % 12
            is_val = (int(sid[1:]) % 100 == 0)                      # 1% of series held back to monitor the M4 side
            ends = rng.randint(CTX, n - HOR + 1, size=per_series) if not is_val else rng.randint(CTX, n - HOR + 1, size=2)
            for e in ends:
                ctx = vals[e - CTX:e]; level = ctx[-12:].mean()
                x = np.log(ctx / level); y = np.log(vals[e:e + HOR] / level)
                if np.abs(x).max() > 3 or np.abs(y).max() > 3: continue
                X.append(x); M.append(months[e - CTX:e]); FM.append(months[e:e + HOR]); Y.append(y); C.append(cat[sid]); V.append(is_val)
    X, M, FM, Y, V = np.array(X, np.float32), np.array(M), np.array(FM), np.array(Y, np.float32), np.array(V)
    return X, M, FM, Y, np.array(C), V

def baseline_log(X):
    """log(baseline / level) for the next 12 months: each month of last year scaled by recent growth (same as the engine's last-year method)."""
    r = np.exp(X)                                           # context relative to its own level
    g = np.clip(r[:, -6:].sum(1) / r[:, -18:-12].sum(1), 0.6, 1.6)
    return (X[:, -12:] + np.log(g)[:, None]).astype(np.float32)

if __name__ == '__main__':
    folder, fold, nseeds, epochs, outdir = sys.argv[1], int(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), sys.argv[5]
    per = int(sys.argv[6]) if len(sys.argv) > 6 else 5
    os.makedirs(outdir, exist_ok=True)
    dev = torch.device('mps' if torch.backends.mps.is_available() else 'cpu')
    t0 = time.time()
    X4, M4_, FM4, Y4, C4, V4 = load_m4(per)
    print(f'M4 windows {len(X4)} ({(~V4).sum()} train / {V4.sum()} monitor) in {time.time()-t0:.0f}s; device {dev}', flush=True)
    series = tp.load_series(folder)
    idx = list(range(len(series))); even = [i for i in idx if i % 2 == 0]; odd = [i for i in idx if i % 2 == 1]
    train_ids = {0: even, 1: odd, 2: idx}[fold]; test_ids = {0: odd, 1: even, 2: []}[fold]
    trs = [series[i] for i in train_ids]
    pre = lambda s: [e for e in range(CTX, len(s['y']) - HOR + 1) if s['dates'][e - 1] < '2015-01']
    val = lambda s: [e for e in range(CTX, len(s['y']) - HOR + 1) if '2015-01' <= s['dates'][e - 1] < '2020-01' and e % 2 == 0]
    allw = lambda s: list(range(CTX, len(s['y']) - HOR + 1))
    Xf, Mf, FMf, Yf, _ = tp.make(trs, allw if fold == 2 else pre)
    Xv, Mv, FMv, Yv, _ = tp.make(trs, val)
    HY = os.environ.get('HYBRID') == '1'
    if HY:
        X4b, Xfb, Xvb = baseline_log(X4), baseline_log(Xf), baseline_log(Xv)
        Y4, Yf, Yv = Y4 - X4b, Yf - Xfb, Yv - Xvb          # the network now learns the correction to the baseline
    rep = 4                                                          # the target domain (real shops and stores) is a small slice of M4, so weight it up
    Xtr = np.concatenate([X4[~V4]] + [Xf] * rep); Mtr = np.concatenate([M4_[~V4]] + [Mf] * rep)
    FMtr = np.concatenate([FM4[~V4]] + [FMf] * rep); Ytr = np.concatenate([Y4[~V4]] + [Yf] * rep)
    print(f'training windows {len(Xtr)} (M4 {int((~V4).sum())} + FRED {len(Xf)} x{rep}); FRED validation {len(Xv)}', flush=True)
    D = int(os.environ.get('DIM', '64')); L = int(os.environ.get('LAYERS', '3'))
    T = lambda a: torch.tensor(a).to(dev)
    xtr, mtr, ftr, ytr = T(Xtr), T(Mtr), T(FMtr), T(Ytr)
    xv, mv, fv, yv = T(Xv), T(Mv), T(FMv), T(Yv)
    nets = []
    for sd in range(nseeds):
        torch.manual_seed(sd)
        net = tp.Net(d=D, layers=L, heads=4, ff=2 * D * 2, drop=0.1).to(dev)
        bs = 512; steps = epochs * math.ceil(len(xtr) / bs)
        opt = torch.optim.AdamW(net.parameters(), lr=1e-3, weight_decay=1e-3)
        sched = torch.optim.lr_scheduler.OneCycleLR(opt, max_lr=1e-3, total_steps=steps, pct_start=0.1)
        best, best_state = 1e9, None
        for ep in range(epochs):
            net.train(); perm = torch.randperm(len(xtr), device=dev); tot = 0
            for i in range(0, len(perm), bs):
                j = perm[i:i + bs]
                x = xtr[j] + torch.randn_like(xtr[j]) * 0.012
                loss = (net(x, mtr[j], ftr[j]) - ytr[j]).abs().mean()
                opt.zero_grad(); loss.backward(); torch.nn.utils.clip_grad_norm_(net.parameters(), 1.0); opt.step(); sched.step(); tot += loss.item() * len(j)
            net.eval()
            with torch.no_grad(): v = (net(xv, mv, fv) - yv).abs().mean().item()
            if v < best: best, best_state = v, {k: t.detach().clone() for k, t in net.state_dict().items()}
            print(f'seed {sd} epoch {ep:2d} train L1 {tot/len(xtr):.4f}  FRED-val L1 {v:.4f}  {time.time()-t0:.0f}s', flush=True)
        net.load_state_dict(best_state); net.eval(); nets.append(net.cpu()); print(f'seed {sd} best FRED-val {best:.4f}', flush=True)
    torch.save({'dim': D, 'layers': L, 'states': [n.state_dict() for n in nets]}, os.path.join(outdir, f'nets_fold{fold}.pt'))
    if test_ids:
        te = [series[i] for i in test_ids]
        X, M, FM, Y, meta = tp.make(te, lambda s: list(range(CTX, len(s['y']) - HOR + 1, 6)))
        with torch.no_grad(): out = np.mean([n(torch.tensor(X), torch.tensor(M), torch.tensor(FM)).numpy() for n in nets], 0)
        if HY: out = out + baseline_log(X)
        rows = []
        for k, (si, end, level) in enumerate(meta):
            s = te[si]
            rows.append(dict(series=s['name'], end=end, month=s['dates'][end - 1], forecast=[float(v) for v in np.exp(out[k]) * level], truth=[float(v) for v in s['y'][end:end + HOR]]))
        json.dump(rows, open(os.path.join(outdir, f'preds_fold{fold}.json'), 'w'))
        mape = np.mean([np.mean(np.abs(np.array(r['truth']) - np.array(r['forecast'])) / np.array(r['truth'])) for r in rows])
        print(f'HELD-OUT FRED: {len(rows)} windows | monthly accuracy {100 - 100 * mape:.1f}%', flush=True)
