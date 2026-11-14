"""Scores, blind test and gap result for the rover task. Writes app/data/results.json and meta.json."""
import json, os, sys, math
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
import terrain as t
import build_windows as bw

OUT = bw.OUT
earth = json.load(open(os.path.join(OUT, "earth.json")))
targets = json.load(open(os.path.join(OUT, "targets.json")))
TASK = sc.TASKS["rover"]
L = TASK["max_slope_deg"]


def hav(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))


S = np.array([[sc.score(e["hist"], tg["hist"], L)[0] for tg in targets] for e in earth])  # (E, T)
groups = [e["group"] for e in earth]
oman = np.array([g.startswith("oman") for g in groups])

# ---- gap result
gap = []
for j, tg in enumerate(targets):
    col = S[:, j]
    best_oman = col[oman].max()
    by_group = {g: float(col[[x == g for x in groups]].max()) for g in sorted(set(groups))}
    b = int(np.argmax(np.where(oman, col, -1)))
    row = {"target": tg["id"], "name": tg["name"], "body": tg["body"], "best_oman": round(float(best_oman), 1),
           "best_oman_window": earth[b]["id"], "by_group": {k: round(v, 1) for k, v in by_group.items()},
           "gap": bool(best_oman < sc.GAP_THRESHOLD)}
    row["closing_group"] = None
    st = lambda v: "match" if v >= sc.MATCH_THRESHOLD else ("partial" if v >= sc.GAP_THRESHOLD else "gap")
    row["state_oman"] = st(best_oman)
    others = {g: v for g, v in by_group.items() if not g.startswith("oman")}
    if others:
        g2 = max(others, key=others.get)
        if st(others[g2]) != row["state_oman"] and others[g2] > best_oman:
            row["closing_group"] = g2
            row["state_with_second"] = st(others[g2])
    row["best_any"] = round(float(col.max()), 1)
    row["still_gap_with_all_sites"] = bool(col.max() < sc.GAP_THRESHOLD)
    gap.append(row)

# ---- blind test: scoring only sees histograms (no names, groups or coordinates)
mars_cols = [j for j, tg in enumerate(targets) if tg["body"] == "Mars"]
agg_best = S[:, mars_cols].max(1)
agg_mean = S[:, mars_cols].mean(1)


def rank_pct(vals, i):
    # fraction of Earth windows scoring strictly higher; ties counted half
    v = vals[i]
    return (np.sum(vals > v) + 0.5 * (np.sum(vals == v) - 1)) / len(vals)


def idxs(f): return [i for i, e in enumerate(earth) if f(e)]


amadee = idxs(lambda e: hav(e["lat"], e["lon"], 18.19, 55.23) <= 15)
meteor = idxs(lambda e: hav(e["lat"], e["lon"], 35.027, -111.023) <= 7.5)
atac = idxs(lambda e: e["group"] == "atacama")
blind = []
for name, ids in [("AMADEE-18 area (Marmul, Dhofar; approx. 15 km radius)", amadee), ("Meteor Crater window", meteor), ("Atacama tile (all 110 windows, median)", atac)]:
    if not ids: blind.append({"site": name, "n_windows": 0}); continue
    pb = [rank_pct(agg_best, i) for i in ids]; pm = [rank_pct(agg_mean, i) for i in ids]
    blind.append({"site": name, "n_windows": len(ids),
                  "top_pct_by_best_mars_target": round(100 * float(np.median(pb)), 1),
                  "top_pct_by_mean_mars_targets": round(100 * float(np.median(pm)), 1),
                  "median_best_score": round(float(np.median(agg_best[ids])), 1)})
n_flat = int(np.sum(agg_best >= 90))

# sensitivity of the headline to the slope-distance constant
sens = []
for sref in (3.0, 5.0, 10.0):
    old = sc.S_REF; sc.S_REF = sref
    S2 = np.array([[sc.score(e["hist"], tg["hist"], L)[0] for tg in targets] for e in earth])
    sc.S_REF = old
    st2 = lambda v: "match" if v >= sc.MATCH_THRESHOLD else ("partial" if v >= sc.GAP_THRESHOLD else "gap")
    o = [st2(S2[oman, j].max()) for j in range(len(targets))]
    a = [st2(S2[:, j].max()) for j in range(len(targets))]
    sens.append({"s_ref_deg": sref, "oman_only": {k: o.count(k) for k in ("match", "partial", "gap")},
                 "with_check_sites": {k: a.count(k) for k in ("match", "partial", "gap")}})

results = {"sensitivity": sens, "task": "rover", "limit_deg": L, "threshold": sc.GAP_THRESHOLD, "gap": gap, "blind_test": blind,
           "n_earth_windows": len(earth), "n_targets": len(targets), "n_earth_windows_scoring_90_plus_vs_some_mars_target": n_flat,
           "notes": "Rank is the share of the 627 Earth windows that score higher (lower % = better). Scoring sees only histograms."}
json.dump(results, open(os.path.join(OUT, "results.json"), "w"), indent=1)
meta = {"baseline_m": t.BASELINE_M, "window_km": t.WINDOW_KM, "slope_edges": t.SLOPE_EDGES, "rough_edges": [e if e < 1e6 else 160 * 2 for e in t.ROUGH_EDGES],
        "s_ref": sc.S_REF, "r_ref": sc.R_REF, "w": [sc.W_TRAV, sc.W_SLOPE, sc.W_ROUGH], "threshold": sc.GAP_THRESHOLD, "match_threshold": sc.MATCH_THRESHOLD, "tasks": sc.TASKS}
json.dump(meta, open(os.path.join(OUT, "meta.json"), "w"), indent=1)

for g in gap:
    print(f"{g['body']:5s} {g['name'][:34]:34s} oman {g['best_oman']:5.1f} any {g['best_any']:5.1f} {g['state_oman']} close={g['closing_group']}")
for b in blind: print(b)
print(json.dumps(sens))
print("windows >=90 vs some Mars target:", n_flat, "of", len(earth))
