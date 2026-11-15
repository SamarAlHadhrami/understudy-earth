"""NASA POWER monthly climatology for the 0.5 x 0.625 degree cell under every Earth window.
Run locally; raw responses are cached in data/power_cache (git-ignored). The browser never calls the API."""
import json, os, sys, time, math, datetime, urllib.request
from concurrent.futures import ThreadPoolExecutor
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
CACHE = os.path.join(ROOT, "data", "power_cache"); os.makedirs(CACHE, exist_ok=True)
PARAMS = ["T2M", "T2M_MAX", "T2M_MIN", "WS2M", "RH2M", "PRECTOTCORR", "ALLSKY_SFC_SW_DWN", "TS_MAX", "TS_MIN"]
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
URL = ("https://power.larc.nasa.gov/api/temporal/climatology/point?parameters=" + ",".join(PARAMS) +
       "&community=RE&longitude={lon}&latitude={lat}&format=JSON")


def cell(lat, lon):
    i, j = math.floor((lat + 90) / 0.5), math.floor((lon + 180) / 0.625)
    return f"{i}_{j}", round(-90 + (i + 0.5) * 0.5, 4), round(-180 + (j + 0.5) * 0.625, 4)


def fetch(key, lat, lon):
    f = os.path.join(CACHE, key + ".json")
    if os.path.exists(f):
        d = json.load(open(f))
        if all(p in d.get("properties", {}).get("parameter", {}) for p in PARAMS):
            return d
    for k in range(4):
        try:
            with urllib.request.urlopen(URL.format(lat=lat, lon=lon), timeout=60) as r:
                d = json.load(r)
            json.dump(d, open(f, "w")); return d
        except Exception as e:
            time.sleep(2 + 3 * k); err = e
    raise err


def series(d, p): return [d["properties"]["parameter"][p][m] for m in MONTHS]


if __name__ == "__main__":
    earth = json.load(open(os.path.join(ROOT, "app", "data", "earth.json")))
    f90 = os.path.join(ROOT, "app", "data", "earth90.json")
    if os.path.exists(f90): earth += json.load(open(f90))  # whole-Oman 90 m squares
    cells, win = {}, {}
    for e in earth:
        k, la, lo = cell(e["lat"], e["lon"]); cells[k] = (la, lo); win[e["id"]] = k
    print(len(cells), "POWER cells for", len(earth), "windows")
    with ThreadPoolExecutor(4) as ex:
        res = dict(zip(cells, ex.map(lambda kv: fetch(kv[0], *kv[1]), cells.items())))
    out = {"source": "NASA POWER climatology API v2.10.1, community RE, 25-year monthly climatology Jan 2001-Dec 2025",
           "accessed": datetime.date.today().isoformat(), "cell_deg": [0.5, 0.625], "months": MONTHS, "params": PARAMS,
           "units": {"T2M": "C", "T2M_MAX": "C", "T2M_MIN": "C", "WS2M": "m/s", "RH2M": "%", "PRECTOTCORR": "mm/day", "ALLSKY_SFC_SW_DWN": "kWh/m2/day", "TS_MAX": "C", "TS_MIN": "C"},
           "cells": {}, "win": win}
    for k, d in res.items():
        out["cells"][k] = {"lat": cells[k][0], "lon": cells[k][1], **{p: series(d, p) for p in PARAMS}}
    json.dump(out, open(os.path.join(ROOT, "app", "data", "climate_power.json"), "w"), separators=(",", ":"))
    print("saved", len(out["cells"]), "cells")
