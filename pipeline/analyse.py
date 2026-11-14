"""Rank-based terrain similarity, gap result and blind test. Writes app/data/results.json and meta.json."""
import json, os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
import terrain as t
import build_windows as bw

OUT = bw.OUT
earth = json.load(open(os.path.join(OUT, "earth.json")))
targets = json.load(open(os.path.join(OUT, "targets.json")))
sc.set_scales(sc.feature_scales(earth))
groups = np.array([e["group"] for e in earth])
oman = np.array([g.startswith("oman") for g in groups])


def hav(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


R = np.zeros((len(earth), len(targets)))  # rank fractions (map colouring, blind test)
DM = np.zeros_like(R)                      # raw distances
for j, tg in enumerate(targets):
    R[:, j], DM[:, j] = sc.ranks(earth, tg)

# absolute reference for GAP: distances between pairs of Earth windows we hold.
# A target is MATCHED when some Earth window is as close to it as the closest 5% of Earth-window pairs are to each other.
rng = np.random.default_rng(7)
pairs = rng.choice(len(earth), (60000, 2))
pairs = pairs[pairs[:, 0] != pairs[:, 1]]
pair_d = np.array([sc.distance(earth[a], earth[b]) for a, b in pairs])
THR_MATCH, THR_PARTIAL = float(np.percentile(pair_d, 5)), float(np.percentile(pair_d, 20))


def dtier(d): return "match" if d < THR_MATCH else ("partial" if d < THR_PARTIAL else "gap")


def gap_rows(DM):
    rows = []
    for j, tg in enumerate(targets):
        col = DM[:, j]
        bo = int(np.argmin(np.where(oman, col, 1e9)))
        ba = int(np.argmin(col))
        by = {g: float(col[groups == g].min()) for g in sorted(set(groups))}
        r = {"target": tg["id"], "name": tg["name"], "body": tg["body"],
             "best_oman_dist": round(col[bo], 3), "best_oman_window": earth[bo]["id"], "tier_oman": dtier(col[bo]),
             "best_any_dist": round(col[ba], 3), "best_any_window": earth[ba]["id"], "best_any_group": earth[ba]["group"],
             "tier_any": dtier(col[ba]), "by_group_dist": {k: round(v, 3) for k, v in by.items()}}
        r["closing_group"] = earth[ba]["group"] if (not earth[ba]["group"].startswith("oman") and r["tier_any"] != r["tier_oman"]) else None
        rows.append(r)
    return rows


gap = gap_rows(DM)

# sensitivity: leave one term out, count tiers
sens = []
for k, name in enumerate(sc.FEATS):
    saved = sc.SCALES.copy(); sc.SCALES[k] = 1e12
    D2 = np.stack([sc.ranks(earth, tg)[1] for tg in targets], 1); sc.SCALES = saved
    rows = gap_rows(D2)
    cnt = lambda key: {x: sum(1 for r in rows if r[key] == x) for x in ("match", "partial", "gap")}
    sens.append({"left_out": name, "oman_only": cnt("tier_oman"), "with_check_sites": cnt("tier_any")})
base = {"left_out": "none", "oman_only": {x: sum(1 for r in gap if r["tier_oman"] == x) for x in ("match", "partial", "gap")},
        "with_check_sites": {x: sum(1 for r in gap if r["tier_any"] == x) for x in ("match", "partial", "gap")}}
sens.insert(0, base)

# ---- blind test: scoring sees only terrain numbers; names/coordinates are looked up afterwards
mars = [j for j, tg in enumerate(targets) if tg["body"] == "Mars"]
best_rank = R[:, mars].min(1)          # best rank over Mars targets
mean_rank = R[:, mars].mean(1)         # average rank over Mars targets


def pct(vals, i): return float((np.sum(vals < vals[i]) + 0.5 * (np.sum(vals == vals[i]) - 1)) / len(vals))


def idxs(f): return [i for i, e in enumerate(earth) if f(e)]


amadee = idxs(lambda e: hav(e["lat"], e["lon"], 18.19, 55.23) <= 15)
meteor = idxs(lambda e: hav(e["lat"], e["lon"], 35.027, -111.023) <= 7.5)
atac = idxs(lambda e: e["group"] == "atacama")
blind = []
for name, ids in [("AMADEE-18 area (Marmul, Dhofar; approx. 15 km radius)", amadee), ("Meteor Crater window", meteor), ("Atacama tile (all windows, median)", atac)]:
    blind.append({"site": name, "n_windows": len(ids),
                  "top_pct_best_mars_target": round(100 * float(np.median([pct(best_rank, i) for i in ids])), 1),
                  "top_pct_mean_over_mars_targets": round(100 * float(np.median([pct(mean_rank, i) for i in ids])), 1)})

results = {"method": "rank-based terrain similarity", "sensitivity": sens, "gap": gap, "blind_test": blind,
           "n_earth_windows": len(earth), "n_targets": len(targets),
           "tiers": "map: rank among Earth windows per target (top 5% match, 5-20% partial). Target gap: best distance vs distances between Earth-window pairs (below 5th pct match, below 20th partial, else gap)",
           "thr_match_dist": THR_MATCH, "thr_partial_dist": THR_PARTIAL,
           "scales": dict(zip(sc.FEATS, [round(float(x), 5) for x in sc.SCALES]))}
json.dump(results, open(os.path.join(OUT, "results.json"), "w"), indent=1)
meta = {"baseline_m": t.BASELINE_M, "window_km": t.WINDOW_KM, "slope_edges": t.SLOPE_EDGES, "rough_edges": [e if e < 1e6 else 320 for e in t.ROUGH_EDGES],
        "scales": [float(x) for x in sc.SCALES], "thr_match_dist": THR_MATCH, "thr_partial_dist": THR_PARTIAL, "match_rank": sc.MATCH_RANK, "partial_rank": sc.PARTIAL_RANK, "tasks": sc.TASKS}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)

for g in gap:
    print(f"{g['body']:5s} {g['name'][:34]:34s} oman d={g['best_oman_dist']:.2f} {g['tier_oman']:7s} any d={g['best_any_dist']:.2f} {g['tier_any']:7s} {g['best_any_group'][:8]} close={g['closing_group']}")
for b in blind: print(b)
print('thr',THR_MATCH,THR_PARTIAL)
for s in sens: print(s)
