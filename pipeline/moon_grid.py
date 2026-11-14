"""Lunar south pole windows (LOLA 80 m, 80 S to 90 S only): 10 km windows on a 20 km grid inside 300 km of the pole (about 10 degrees of latitude).
Same method as the targets. Writes app/data/moon_grid.json (x, y in km from the pole in the polar stereographic map, plus terrain numbers)."""
import json, math, os, sys
import numpy as np, rasterio
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import DATA, OUT
out = []
with rasterio.open(os.path.join(DATA, "LDEM_80S_80MPP_ADJ.tif")) as s:
    tr = Transformer.from_crs(s.crs, s.crs.geodetic_crs, always_xy=True)
    for xk in range(-300, 301, 20):
        for yk in range(-300, 301, 20):
            if math.hypot(xk, yk) > 300: continue
            a = t.window_at(s, xk * 1000.0, yk * 1000.0)
            f = t.window_features(a) if a is not None else None
            if not f: continue
            lon, lat = tr.transform(xk * 1000.0, yk * 1000.0)
            out.append({"x": xk, "y": yk, "lat": round(lat, 2), "lon": round(lon, 2), **f})
json.dump(out, open(os.path.join(OUT, "moon_grid.json"), "w"), separators=(",", ":"))
print(len(out), "windows,", os.path.getsize(os.path.join(OUT, "moon_grid.json")) // 1024, "KB; lat range", min(w["lat"] for w in out), max(w["lat"] for w in out))
