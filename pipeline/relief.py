"""Shaded-relief pictures (64 x 64 px, one picture = 10 km, so one pixel = 156 m) for every window and target.
Resampling: Earth 30 m and Moon 80 m are area-averaged down to 64 px; Mars 463 m is about 22 px wide, so it is bilinearly
UPSAMPLED to 64 px (no new detail). Same sun (azimuth 315, altitude 45) and 3x height exaggeration everywhere.
Writes app/data/relief/<id>.png. Same window order and filters as build_windows.py."""
import glob, json, math, os, sys
import numpy as np, rasterio
from PIL import Image
from rasterio.enums import Resampling
from rasterio.windows import Window
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import EARTH_TILES, MOON, MARS, DATA, OUT

PX, CELL, EXAG, AZ, ALT = 64, 10000 / 64, 3.0, math.radians(315), math.radians(45)

def read(src, win, up=False):
    a = src.read(1, window=win, out_shape=(PX, PX), resampling=Resampling.bilinear if up else Resampling.average, masked=True)
    if a.mask.any(): a = a.filled(float(a.compressed().mean()))
    return np.asarray(a, float)

def shade(z):
    z = z * EXAG
    gy, gx = np.gradient(z, CELL)
    slope = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(gy, -gx)
    h = math.cos(ALT) * np.cos(slope) + math.sin(ALT) * np.sin(slope) * np.cos(AZ - asp)
    return Image.fromarray((np.clip(h, 0, 1) * 255).astype(np.uint8))

def main():
    d = os.path.join(OUT, "relief"); os.makedirs(d, exist_ok=True)
    earth = json.load(open(os.path.join(OUT, "earth.json"))); targets = json.load(open(os.path.join(OUT, "targets.json")))
    i = 0
    for tag in EARTH_TILES:
        p = glob.glob(os.path.join(DATA, "*%s*.tif" % tag))
        if not p: continue
        with rasterio.open(p[0]) as s:
            b = s.bounds; lat0 = (b.top + b.bottom) / 2
            hy = int(round(10000 / (abs(s.res[1]) * 111320.0))); hx = int(round(10000 / (abs(s.res[0]) * 111320.0 * math.cos(math.radians(lat0)))))
            for r in range(0, s.height - hy + 1, hy):
                for c in range(0, s.width - hx + 1, hx):
                    z5 = t.read_baseline(s, Window(c, r, hx, hy))
                    if z5 is None or (z5 <= 0.5).mean() >= 0.10 or t.window_features(z5) is None: continue
                    lon, lat = s.xy(r + hy // 2, c + hx // 2)
                    e = earth[i]; assert abs(e["lat"] - round(lat, 4)) < 1e-6 and abs(e["lon"] - round(lon, 4)) < 1e-6, e["id"]
                    shade(read(s, Window(c, r, hx, hy))).save(os.path.join(d, e["id"] + ".png"), optimize=True); i += 1
    assert i == len(earth), (i, len(earth))
    for body, path, up in (("Moon", "LDEM_80S_80MPP_ADJ.tif", False), ("Mars", "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif", True)):
        with rasterio.open(os.path.join(DATA, path)) as s:
            tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
            for tg in [x for x in targets if x["body"] == body]:
                x, y = tr.transform(tg["lon"], tg["lat"]); r0, c0 = s.index(x, y)
                wx, wy = int(round(10000 / abs(s.res[0]))), int(round(10000 / abs(s.res[1])))
                shade(read(s, Window(c0 - wx // 2, r0 - wy // 2, wx, wy), up)).save(os.path.join(d, tg["id"] + ".png"), optimize=True)
    tot = sum(os.path.getsize(os.path.join(d, f)) for f in os.listdir(d))
    print(len(os.listdir(d)), "pictures,", tot // 1024, "KB")

if __name__ == "__main__":
    main()
