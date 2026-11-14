"""WorldClim 2.1 (2.5 arc-min, 1970-2000) monthly values under every Earth window, plus cross-check with NASA POWER.
Output app/data/climate_worldclim.json is git-ignored: WorldClim does not allow redistribution without permission."""
import json, os, sys, math, zipfile
import numpy as np
import rasterio
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
WC = os.path.join(ROOT, "data", "worldclim")
VARS = ["tavg", "tmin", "tmax", "srad", "wind", "vapr"]


def read_var(v, pts):
    z = os.path.join(WC, f"wc2.1_2.5m_{v}.zip")
    names = sorted(n for n in zipfile.ZipFile(z).namelist() if n.endswith(".tif"))
    out = np.zeros((len(pts), 12))
    for m, n in enumerate(names):
        with rasterio.open(f"zip://{z}!{n}") as s:
            vals = np.array([x[0] for x in s.sample(pts)], float)
            vals[vals < -1e30] = np.nan
            out[:, m] = vals
    return out


def rh(vapr_kpa, t):
    es = 0.6108 * np.exp(17.27 * t / (t + 237.3))
    return np.clip(100 * vapr_kpa / es, 0, 100)


if __name__ == "__main__":
    earth = json.load(open(os.path.join(ROOT, "app", "data", "earth.json")))
    pts = [(e["lon"], e["lat"]) for e in earth]
    d = {v: read_var(v, pts) for v in VARS}
    d["rh"] = rh(d["vapr"], d["tavg"])
    d["srad_kwh"] = d["srad"] / 3600.0
    out = {"source": "WorldClim 2.1, 2.5 arc-min, 1970-2000 average (Fick and Hijmans 2017). NOT FOR REDISTRIBUTION without permission.",
           "units": {"tmax": "C", "tmin": "C", "tavg": "C", "wind": "m/s", "rh": "% (derived from vapour pressure and mean temperature)", "srad": "kWh/m2/day"},
           "win": {}}
    for i, e in enumerate(earth):
        if np.isnan(d["tavg"][i]).any(): continue
        f = lambda a: [round(float(x), 2) for x in a[i]]
        out["win"][e["id"]] = {"tmax": f(d["tmax"]), "tmin": f(d["tmin"]), "tavg": f(d["tavg"]), "wind": f(d["wind"]), "rh": f(d["rh"]), "srad": f(d["srad_kwh"])}
    json.dump(out, open(os.path.join(ROOT, "app", "data", "climate_worldclim.json"), "w"), separators=(",", ":"))
    print("windows with WorldClim values:", len(out["win"]), "of", len(earth))

    # cross-check vs NASA POWER at Oman windows
    pw = json.load(open(os.path.join(ROOT, "app", "data", "climate_power.json")))
    rows = {k: [] for k in ("tmax", "tmin", "tavg", "wind", "srad")}
    for e in earth:
        if not e["group"].startswith("oman") or e["id"] not in out["win"]: continue
        c = pw["cells"][pw["win"][e["id"]]]; w = out["win"][e["id"]]
        for k, pk in (("tmax", "T2M_MAX"), ("tmin", "T2M_MIN"), ("tavg", "T2M"), ("wind", "WS2M"), ("srad", "ALLSKY_SFC_SW_DWN")):
            rows[k].append(np.array(w[k]) - np.array(c[pk]))
    cc = {}
    for k, v in rows.items():
        a = np.array(v); cc[k] = {"mean_diff_by_month_wc_minus_power": [round(float(x), 2) for x in a.mean(0)], "mean_abs_diff": round(float(np.abs(a).mean()), 2), "n_windows": int(a.shape[0])}
    json.dump(cc, open(os.path.join(ROOT, "docs", "climate_crosscheck.json"), "w"), indent=1)
    for k, v in cc.items(): print(k, "mean abs diff", v["mean_abs_diff"], "| by month", v["mean_diff_by_month_wc_minus_power"])
