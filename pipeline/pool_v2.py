"""What happens to the results if the whole-Oman 90 m squares join the reference pool (pool v2 = 627 squares at 30 m + 4756 squares at 90 m)?
Same method; scales and the pair-distance thresholds are recomputed on the larger pool. Writes app/data/pool_v2.json (summary only).
The app's main ranks still use pool v1 (frozen, version recorded in meta.json)."""
import json, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
from build_windows import OUT
e1 = json.load(open(os.path.join(OUT, "earth.json"))); e90 = json.load(open(os.path.join(OUT, "earth90.json"))); T = json.load(open(os.path.join(OUT, "targets.json")))
R1 = json.load(open(os.path.join(OUT, "results.json")))
def thr(E):
    sc.set_scales(sc.feature_scales(E)); rng = np.random.default_rng(7); pr = rng.choice(len(E), (30000, 2)); pr = pr[pr[:, 0] != pr[:, 1]]
    pd_ = np.array([sc.distance(E[a], E[b]) for a, b in pr]); return float(np.percentile(pd_, 5)), float(np.percentile(pd_, 20))
def tier(d, tm, tp): return "match" if d < tm else ("partial" if d < tp else "gap")
pool = e1 + e90
tm, tp = thr(pool)
oman = np.array([e["group"].startswith("oman") for e in pool])
rows, changed = [], []
for tg in T:
    d = np.array([sc.distance(w, tg) for w in pool]); bo = float(d[oman].min()); i = int(np.argmin(np.where(oman, d, 1e9)))
    v1 = [g for g in R1["gap"] if g["name"] == tg["name"]][0]
    r = {"target": tg["name"], "body": tg["body"], "tier_v1": v1["tier_oman"], "tier_v2": tier(bo, tm, tp), "best_oman_v1": v1["best_oman_dist"], "best_oman_v2": round(bo, 3), "best_square_v2": pool[i]["id"], "best_group_v2": pool[i]["group"]}
    rows.append(r)
    if r["tier_v1"] != r["tier_v2"]: changed.append(r)
# name-free check on pool v2 (same rule as analyse.py)
def hav(a, b, c, d):
    p = math.pi / 180; x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2; return 12742 * math.asin(math.sqrt(x))
mars = [tg for tg in T if tg["body"] == "Mars"]
Rk = np.stack([np.array([sc.distance(w, tg) for w in pool]).argsort().argsort() / len(pool) for tg in mars], 1)
best, mean = Rk.min(1), Rk.mean(1)
def pct(v, i): return float((np.sum(v < v[i]) + 0.5 * (np.sum(v == v[i]) - 1)) / len(v))
sites = {"AMADEE-18 area": [i for i, w in enumerate(pool) if hav(w["lat"], w["lon"], 18.19, 55.23) <= 15], "Meteor Crater window": [i for i, w in enumerate(pool) if hav(w["lat"], w["lon"], 35.027, -111.023) <= 7.5], "Atacama tile": [i for i, w in enumerate(pool) if w["group"] == "atacama"]}
nf = {k: {"top_pct_best_mars_target": round(100 * float(np.median([pct(best, i) for i in ix])), 1), "top_pct_mean_over_mars_targets": round(100 * float(np.median([pct(mean, i) for i in ix])), 1)} for k, ix in sites.items()}
cnt = lambda key: {x: sum(1 for r in rows if r[key] == x) for x in ("match", "partial", "gap")}
out = {"pool_v1": len(e1), "pool_v2": len(pool), "thr_v1": [R1["thr_match_dist"], R1["thr_partial_dist"]], "thr_v2": [tm, tp], "oman_counts_v1": cnt("tier_v1"), "oman_counts_v2": cnt("tier_v2"), "rows": rows, "name_free_v2": nf}
json.dump(out, open(os.path.join(OUT, "pool_v2.json"), "w"), indent=1)
print("thr v1", [round(x, 3) for x in out["thr_v1"]], "v2", [round(tm, 3), round(tp, 3)]); print("oman v1", out["oman_counts_v1"], "v2", out["oman_counts_v2"])
print("changed:", [(r["target"], r["tier_v1"], r["tier_v2"], r["best_oman_v1"], r["best_oman_v2"], r["best_group_v2"]) for r in changed]); print("name-free v2:", nf)
