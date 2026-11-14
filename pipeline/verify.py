"""Second-way check: independent code path (integer block means + scipy Sobel, native-grid reads)."""
import json, os, sys, glob, math
import numpy as np
import rasterio
from rasterio.windows import Window
from scipy import ndimage
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import build_windows as bw

DATA = bw.DATA


def sobel_slope(z, dx, dy):
    gx = ndimage.sobel(z, axis=1) / (8 * dx)
    gy = ndimage.sobel(z, axis=0) / (8 * dy)
    return np.degrees(np.arctan(np.hypot(gx, gy)))[1:-1, 1:-1]


def blockmean(a, fy, fx):
    h, w = (a.shape[0] // fy) * fy, (a.shape[1] // fx) * fx
    return a[:h, :w].reshape(h // fy, fy, w // fx, fx).mean((1, 3))


def earth_check(lat, lon):
    tag = [k for k in bw.EARTH_TILES if (k[0] == 'N' and 0 <= lat - int(k[1:3]) < 1 or k[0] == 'S' and 0 <= lat + int(k[1:3]) < 1)
           and (k[7] == 'E' and 0 <= lon - int(k[8:11]) < 1 or k[7] == 'W' and 0 <= lon + int(k[8:11]) < 1)][0]
    with rasterio.open(glob.glob(os.path.join(DATA, f"*{tag}*.tif"))[0]) as s:
        r, c = s.index(lon, lat)
        pm_y = abs(s.res[1]) * 111320.0
        pm_x = abs(s.res[0]) * 111320.0 * math.cos(math.radians(lat))
        fy, fx = 16, 17  # ~500 m
        hy, hx = int(round(10000 / pm_y)), int(round(10000 / pm_x))
        z = s.read(1, window=Window(c - hx // 2, r - hy // 2, hx, hy)).astype("float64")
    zb = blockmean(z, fy, fx)
    return float(np.median(sobel_slope(zb, fx * pm_x, fy * pm_y)))


def planet_check(path, lat, lon, block):
    with rasterio.open(path) as s:
        tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
        x, y = tr.transform(lon, lat)
        r, c = s.index(x, y)
        n = int(round(10000 / abs(s.res[0])))
        z = s.read(1, window=Window(c - n // 2, r - n // 2, n, n)).astype("float64")
        res = abs(s.res[0])
    zb = blockmean(z, block, block)
    return float(np.median(sobel_slope(zb, block * res, block * res)))


if __name__ == "__main__":
    earth = json.load(open(os.path.join(bw.OUT, "earth.json")))
    targets = json.load(open(os.path.join(bw.OUT, "targets.json")))
    rows = []
    rng = np.random.default_rng(1)
    for e in [earth[i] for i in rng.choice(len(earth), 10, replace=False)]:
        v = earth_check(e["lat"], e["lon"]); rows.append(("Earth " + e["id"], e["slope_p50"], v))
    moon_p = os.path.join(DATA, "LDEM_80S_80MPP_ADJ.tif"); mars_p = os.path.join(DATA, "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif")
    for tg in targets:
        if tg["name"] in ("Jezero crater", "Gale mound (Aeolis Mons)", "Olympus Mons flank", "Melas Chasma (Valles Marineris)"):
            rows.append(("Mars " + tg["name"], tg["slope_p50"], planet_check(mars_p, tg["lat"], tg["lon"], 1)))
        if tg["name"] in ("Malapert massif", "Nobile", "Cabeus"):
            rows.append(("Moon " + tg["name"], tg["slope_p50"], planet_check(moon_p, tg["lat"], tg["lon"], 6)))
    ok = True
    out = []
    for n, a, b in rows:
        diff = abs(a - b); tol = max(0.3, 0.25 * a)
        good = diff <= tol; ok &= good
        out.append({"window": n, "main_p50": round(a, 2), "second_p50": round(b, 2), "tolerance": round(tol, 2), "pass": bool(good)})
        print(f"{n:45s} main {a:6.2f} second {b:6.2f} tol {tol:5.2f} {'ok' if good else 'FAIL'}")
    json.dump({"tolerance": "abs diff <= max(0.3 deg, 25% of main median slope)", "rows": out, "all_pass": bool(ok)},
              open(os.path.join(bw.ROOT, "app", "data", "second_check.json"), "w"), indent=1)
    print("ALL PASS" if ok else "SOME FAIL")
