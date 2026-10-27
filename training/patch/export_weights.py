"""Export trained patch-transformer weights as compact JSON (float16, base64) for the TypeScript inference.
Usage: export_weights.py <nets.pt> <out.json> [max_nets]"""
import sys, json, base64, torch, numpy as np
src, dst = sys.argv[1], sys.argv[2]
keep = int(sys.argv[3]) if len(sys.argv) > 3 else 99
hybrid = len(sys.argv) > 4 and sys.argv[4] == 'hybrid'
ck = torch.load(src, map_location='cpu')
nets = []
for sd in ck['states'][:keep]:
    net = {}
    for k, t in sd.items():
        arr = t.detach().cpu().numpy().astype(np.float32)
        net[k] = {'shape': list(arr.shape), 'data': base64.b64encode(arr.astype('<f2').tobytes()).decode()}
    nets.append(net)
out = {'version': 1, 'hybrid': hybrid, 'dim': ck['dim'], 'layers': ck['layers'], 'heads': 4, 'ff': 4 * ck['dim'], 'nets': nets}
json.dump(out, open(dst, 'w'), separators=(',', ':'))
import os; print(f"{len(nets)} net(s), dim {ck['dim']}, layers {ck['layers']}, {os.path.getsize(dst)/1e6:.2f} MB")
