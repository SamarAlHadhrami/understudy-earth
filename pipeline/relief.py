"""Relative-height grids (20 x 20 cells of 500 m) for every window, for the twin pictures.
Same reads and filters as build_windows.py; values are metres above the window mean, rounded."""
import glob, json, os, sys
import numpy as np, rasterio
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import EARTH_TILES, MOON, MARS, DATA, OUT

def rel(z):
    return [int(round(v)) for v in (z - z.mean()).ravel()]

def main():
    earth = json.load(open(os.path.join(OUT, "earth.json")))
    targets = json.load(open(os.path.join(OUT, "targets.json")))
    res = {}
    i = 0
    for tag in EARTH_TILES:
        p = glob.glob(os.path.join(DATA, f"*{tag}*.tif"))
        if not p: continue
        for lat, lon, z in t.earth_windows(p[0]):
            if z is not None and (z <= 0.5).mean() >= 0.10: continue
            if t.window_features(z) is None: continue
            e = earth[i]; assert abs(e["lat"] - round(lat, 4)) < 1e-6 and abs(e["lon"] - round(lon, 4)) < 1e-6, e["id"]
            res[e["id"]] = rel(z); i += 1
    assert i == len(earth)
    with rasterio.open(os.path.join(DATA, "LDEM_80S_80MPP_ADJ.tif")) as s:
        tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
        for tg in [x for x in targets if x["body"] == "Moon"]:
            res[tg["id"]] = rel(t.window_at(s, *tr.transform(tg["lon"], tg["lat"])))
    with rasterio.open(os.path.join(DATA, "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif")) as s:
        tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
        for tg in [x for x in targets if x["body"] == "Mars"]:
            res[tg["id"]] = rel(t.window_at(s, *tr.transform(tg["lon"], tg["lat"])))
    json.dump(res, open(os.path.join(OUT, "relief.json"), "w"), separators=(",", ":"))
    print(len(res), "grids", os.path.getsize(os.path.join(OUT, "relief.json")) // 1024, "KB")

if __name__ == "__main__":
    main()
