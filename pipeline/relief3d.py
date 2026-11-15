"""Real-elevation data for the 3D terrain view: the exact same 64 x 64 x 10 km grid already read for the
twin pictures (relief.py), just saved as numbers instead of a shaded PNG. No new raster source, no new
download: same files, same windows, same resampling (Earth 30 m and Moon 80 m area-averaged, Mars 463 m
bilinearly upsampled), same order as earth.json/targets.json so the browser can index straight in.
Writes one packed binary app/data/relief3d.bin: for every window, 64*64 int16 cells = relative height in
metres (z - z.min()), little-endian, in the same iteration order as relief.py. A small JSON index
app/data/relief3d.json gives, per id: byte offset, z_min (m) and z_max (m) so the browser can decode without
needing float millimetre precision (int16 at 1 m steps is already far finer than the 500 m baseline this app
scores on)."""
import glob, json, math, os, sys, struct
import numpy as np, rasterio
from rasterio.enums import Resampling
from rasterio.windows import Window
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import EARTH_TILES, MOON, MARS, DATA, OUT

PX = 64


def read(src, win, up=False):
    a = src.read(1, window=win, out_shape=(PX, PX), resampling=Resampling.bilinear if up else Resampling.average, masked=True)
    if a.mask.any(): a = a.filled(float(a.compressed().mean()))
    return np.asarray(a, float)


def main():
    earth = json.load(open(os.path.join(OUT, "earth.json")))
    targets = json.load(open(os.path.join(OUT, "targets.json")))
    index = {}
    out_f = open(os.path.join(OUT, "relief3d.bin"), "wb")
    off = 0
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
                    z = read(s, Window(c, r, hx, hy))
                    zmin, zmax = float(z.min()), float(z.max())
                    cells = np.clip(np.round(z - zmin), -32000, 32000).astype("<i2")
                    out_f.write(cells.tobytes())
                    index[e["id"]] = {"off": off, "z_min": round(zmin, 1), "z_max": round(zmax, 1)}
                    off += cells.nbytes
                    i += 1
    assert i == len(earth), (i, len(earth))
    for body, path, up in (("Moon", "LDEM_80S_80MPP_ADJ.tif", False), ("Mars", "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif", True)):
        with rasterio.open(os.path.join(DATA, path)) as s:
            tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
            for tg in [x for x in targets if x["body"] == body]:
                x, y = tr.transform(tg["lon"], tg["lat"]); r0, c0 = s.index(x, y)
                wx, wy = int(round(10000 / abs(s.res[0]))), int(round(10000 / abs(s.res[1])))
                z = read(s, Window(c0 - wx // 2, r0 - wy // 2, wx, wy), up)
                zmin, zmax = float(z.min()), float(z.max())
                cells = np.clip(np.round(z - zmin), -32000, 32000).astype("<i2")
                out_f.write(cells.tobytes())
                index[tg["id"]] = {"off": off, "z_min": round(zmin, 1), "z_max": round(zmax, 1)}
                off += cells.nbytes
    out_f.close()
    json.dump({"px": PX, "cell_m": 10000 / PX, "exag": 3.0, "note": "same 64x64x10km grid as the twin pictures, int16 metres relative to each window's own minimum", "by_id": index},
              open(os.path.join(OUT, "relief3d.json"), "w"), separators=(",", ":"))
    sz = os.path.getsize(os.path.join(OUT, "relief3d.bin"))
    print(len(index), "windows,", sz // 1024, "KB binary")


if __name__ == "__main__":
    main()
