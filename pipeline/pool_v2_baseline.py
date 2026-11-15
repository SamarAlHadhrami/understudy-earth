"""Re-run of the baseline check (known sites vs random) on pool v2 (v1's 627 squares + the 4756 whole-Oman 90 m squares),
to answer "report rank changes and tier changes" when pool v2 is used instead of the frozen pool v1. Report only: this does
NOT change app/data/baseline.json (pool v1 stays the app's default), it prints a comparison and writes
app/data/pool_v2_baseline.json for the record. Same method, same rule (10 points below/above random median), no tuning."""
import json, math, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
from build_windows import OUT

earth1 = json.load(open(os.path.join(OUT, "earth.json")))
earth90 = json.load(open(os.path.join(OUT, "earth90.json")))
earth = earth1 + earth90
targets = json.load(open(os.path.join(OUT, "targets.json")))
base_v1 = json.load(open(os.path.join(OUT, "baseline.json")))
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
]
out = []
for ti, tg in enumerate(targets):
    d = np.array([sc.distance(e, tg) for e in earth])
    frac = d.argsort().argsort() / N
    row = {"target": tg["id"], "name": tg["name"], "body": tg["body"], "sites": []}
    for si, (name, ix) in enumerate(SITES):
        if not ix: continue
        rng = np.random.default_rng(1000 * ti + si)
        k = len(ix)
        site = float(np.median(frac[ix]))
        draws = np.array([np.median(frac[rng.choice(N, k, replace=False)]) for _ in range(100)])
        row["sites"].append({"site": name, "rank_full_pct": round(100 * site, 1), "random_median_pct": round(100 * float(np.median(draws)), 1),
                             "beats_random": bool(site < np.percentile(draws, 5))})
    out.append(row)

# compare with pool v1's summary (by target name, body, site)
v1_by_target = {(r["name"], r["body"]): r for r in base_v1["rows"]}
print("Pool v2 baseline vs pool v1 baseline (rank %, lower = closer to target; tier change rule: +/-10 points moves the verdict):")
for row in out:
    v1row = v1_by_target.get((row["name"], row["body"]))
    if not v1row: continue
    for s2 in row["sites"]:
        s1 = [s for s in v1row["sites"] if s["site"] == s2["site"]]
        if not s1: continue
        s1 = s1[0]
        d = s2["rank_full_pct"] - s1["rank_full_pct"]
        if abs(d) >= 5 or s1["beats_random"] != s2["beats_random"]:
            print(" %-28s %-24s v1=%5.1f%% v2=%5.1f%% (%+.1f)  v1_beats_random=%s v2_beats_random=%s" %
                  (row["name"][:28], s2["site"][:24], s1["rank_full_pct"], s2["rank_full_pct"], d, s1["beats_random"], s2["beats_random"]))
json.dump({"rows": out, "note": "pool v2 (v1 + whole-Oman 90 m box) re-run of the baseline check; report only, app/data/baseline.json (pool v1) is unchanged."},
          open(os.path.join(OUT, "pool_v2_baseline.json"), "w"), separators=(",", ":"))
print("done,", N, "windows in pool v2")
