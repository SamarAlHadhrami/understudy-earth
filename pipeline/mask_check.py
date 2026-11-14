"""How much does hiding squares with trees, crops or buildings (>= 10 %) change the Oman result? Writes app/data/mask_check.json."""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
from build_windows import OUT
earth = json.load(open(os.path.join(OUT, "earth.json"))); targets = json.load(open(os.path.join(OUT, "targets.json")))
lc = json.load(open(os.path.join(OUT, "landcover.json"))); res = json.load(open(os.path.join(OUT, "results.json")))
sc.set_scales(sc.feature_scales(earth))
tm, tp = res["thr_match_dist"], res["thr_partial_dist"]
tier = lambda d: "match" if d < tm else ("partial" if d < tp else "gap")
om = np.array([e["group"].startswith("oman") for e in earth]); fl = np.array([sum(lc[e["id"]]) >= 10 for e in earth])
rows = []
for tg in targets:
    d = np.array([sc.distance(e, tg) for e in earth])
    a, b = d[om].min(), d[om & ~fl].min()
    rows.append({"target": tg["name"], "all": tier(a), "masked": tier(b), "dist_all": round(float(a), 3), "dist_masked": round(float(b), 3)})
json.dump({"flagged_total": int(fl.sum()), "flagged_oman": int((fl & om).sum()), "rows": rows}, open(os.path.join(OUT, "mask_check.json"), "w"), indent=1)
ch = [r for r in rows if r["all"] != r["masked"]]
print("flagged", int(fl.sum()), "oman", int((fl & om).sum()), "changed tiers:", [(r["target"], r["all"], r["masked"]) for r in ch])
