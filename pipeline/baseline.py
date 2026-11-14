"""Baseline check: known analog sites versus random windows, for every target. Writes app/data/baseline.json.
Retrospective: the method was fixed before this check, but we chose the check sites because they are known analogs."""
import json, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
from build_windows import OUT

earth = json.load(open(os.path.join(OUT, "earth.json")))
targets = json.load(open(os.path.join(OUT, "targets.json")))
sc.set_scales(sc.feature_scales(earth))
N = len(earth)

def hav(la1, lo1, la2, lo2):
    p = math.pi / 180
    a = math.sin((la2 - la1) * p / 2) ** 2 + math.cos(la1 * p) * math.cos(la2 * p) * math.sin((lo2 - lo1) * p / 2) ** 2
    return 12742 * math.asin(math.sqrt(a))

def ids(f): return [i for i, e in enumerate(earth) if f(e)]
SITES = [
    ("AMADEE-18 area (approx., 15 km)", ids(lambda e: hav(e["lat"], e["lon"], 18.19, 55.23) <= 15)),
    ("Meteor Crater area", ids(lambda e: hav(e["lat"], e["lon"], 35.027, -111.023) <= 7.5)),
    ("Atacama tile", ids(lambda e: e["group"] == "atacama")),
    ("Muscat area", ids(lambda e: e["group"] == "oman_muscat")),
    ("Dhofar squares", ids(lambda e: e["group"] == "oman_dhofar")),
    # Fixed rule written in docs/VALIDATION.md: all squares within 15 km of the site's reference point.
    # The first three entries above are the original setup; these two apply the one rule to Meteor Crater and the Atacama tile centre.
    ("Meteor Crater (15 km rule)", ids(lambda e: hav(e["lat"], e["lon"], 35.027, -111.023) <= 15)),
    ("Atacama tile centre (15 km rule)", ids(lambda e: hav(e["lat"], e["lon"], -24.5, -69.5) <= 15)),
]
rng = np.random.default_rng(11)
out = []
for ti, tg in enumerate(targets):
    d = np.array([sc.distance(e, tg) for e in earth])
    frac = d.argsort().argsort() / N          # rank fraction of every window, 0 = closest
    row = {"target": tg["id"], "name": tg["name"], "body": tg["body"], "sites": []}
    for si, (name, ix) in enumerate(SITES):
        rng = np.random.default_rng(1000 * ti + si)  # one fixed seed per target and site, so adding sites never changes other rows
        k = len(ix)
        site = float(np.median(frac[ix]))
        draws = np.array([np.median(frac[rng.choice(N, k, replace=False)]) for _ in range(100)])
        # percentile of the site's median distance among 100 random single windows, averaged over 100 draws
        vs100 = float(np.mean([np.mean(d[rng.choice(N, 100, replace=False)] < np.median(d[ix])) for _ in range(100)]))
        row["sites"].append({"site": name, "n": k, "rank_full_pct": round(100 * site, 1), "rank_vs100_pct": round(100 * vs100, 1),
                             "random_median_pct": round(100 * float(np.median(draws)), 1), "random_p5_pct": round(100 * float(np.percentile(draws, 5)), 1), "random_p95_pct": round(100 * float(np.percentile(draws, 95)), 1),
                             "beats_random": bool(site < np.percentile(draws, 5))})
    out.append(row)
summ = []
for si, (name, ix) in enumerate(SITES):
    for body in ("Mars", "Moon"):
        rows = [r["sites"][si] for r in out if r["body"] == body]
        summ.append({"site": name, "body": body, "n_targets": len(rows),
                     "median_rank_full_pct": round(float(np.median([r["rank_full_pct"] for r in rows])), 1),
                     "median_random_pct": round(float(np.median([r["random_median_pct"] for r in rows])), 1),
                     "targets_beating_random": int(sum(r["beats_random"] for r in rows))})
        m, rr = summ[-1]["median_rank_full_pct"], summ[-1]["median_random_pct"]
        # verdict rule fixed in advance: 10 points or more below the random median = better; 10 or more above = worse; otherwise about random
        summ[-1]["verdict"] = "better than random" if m <= rr - 10 else ("worse than random" if m >= rr + 10 else "about random")
json.dump({"rows": out, "summary": summ, "note": "rank in % of all Earth windows (low = closer to the target); random = 100 draws of the same number of windows. Retrospective check, not independent validation."},
          open(os.path.join(OUT, "baseline.json"), "w"), separators=(",", ":"))
for s in summ: print(s)
