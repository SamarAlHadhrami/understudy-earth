"""Terrain numbers for 10 km windows spaced 25 km apart over the MOLA 463 m map between 87 S and 87 N (same method as the targets).
Windows are read as small blocks (never the whole 2 GB file) and area-averaged to 20 x 20 cells of 500 m. The window's longitude extent
is widened by 1/cos(lat) so every window covers about the same ground area at every latitude (an "area-correct window"); very close to
the poles (beyond about 87 degrees) a single 10 km window would wrap most of the way around the planet in longitude, so those spots stay
'unknown' rather than averaging over a physically unreasonable area. Writes app/data/mars_grid.bin (per window: 6 float32 + 33 uint8 slope
shares), mars_grid.json (layout) and mars_preview.png."""
import json, math, os, struct, sys
import numpy as np, rasterio
from PIL import Image
from pyproj import Transformer
from rasterio.windows import Window
from rasterio.enums import Resampling
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import DATA, OUT

KM_PER_DEG = 2 * math.pi * 3389.5 / 360
STEP_KM, LATMAX = 25.0, 87.0
NS = len(t.SLOPE_EDGES) - 1

def main():
    dlat = STEP_KM / KM_PER_DEG
    lats = np.arange(-LATMAX, LATMAX + 1e-9, dlat)
    rows, buf, grid_img = [], bytearray(), []
    with rasterio.open(os.path.join(DATA, "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif")) as s:
        tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
        px = abs(s.res[0])
        nbad = 0
        for lat in lats:
            nlon = max(1, int(round(360 * math.cos(math.radians(lat)) * KM_PER_DEG / STEP_KM)))
            rows.append(nlon); line = []
            wy = int(round(10000 / px)); wx = int(round(10000 / math.cos(math.radians(lat)) / px))
            for k in range(nlon):
                lon = -180 + (k + 0.5) * 360 / nlon
                x, y = tr.transform(lon, lat); r0, c0 = s.index(x, y)
                f = None
                col0, row0 = c0 - wx // 2, r0 - wy // 2
                if 0 <= col0 and col0 + wx <= s.width and 0 <= row0 and row0 + wy <= s.height:
                    a = s.read(1, window=Window(col0, row0, wx, wy), out_shape=(20, 20), resampling=Resampling.average).astype("float64")
                    f = t.window_features(a) if (a > -30000).all() else None
                if f is None:
                    nbad += 1; buf += struct.pack("<6f", *([float("nan")] * 6)) + bytes(NS); line.append(0); continue
                h = np.asarray(f["hist"], float).reshape(NS, -1).sum(1); h = h / h.sum()
                buf += struct.pack("<6f", f["slope_p50"], f["slope_p90"], f["steep_share"], f["rough_med"], f["rough1k_med"], f["relief_m"])
                buf += bytes(np.clip(np.round(h * 255), 0, 255).astype(np.uint8))
                line.append(f["slope_p90"])
            grid_img.append(line)
    open(os.path.join(OUT, "mars_grid.bin"), "wb").write(bytes(buf))
    json.dump({"step_km": STEP_KM, "lat0": float(lats[0]), "dlat": dlat, "rows": rows, "n": int(sum(rows)), "bytes_per_window": 24 + NS, "bad": nbad,
               "slope_edges": t.SLOPE_EDGES, "note": "windows centred at lon = -180 + (k + 0.5) * 360 / rows[r]; unknown = NaN"}, open(os.path.join(OUT, "mars_grid.json"), "w"))
    W = 720; img = np.zeros((len(rows), W), np.uint8)
    for r, line in enumerate(grid_img):
        n = len(line)
        for x in range(W):
            v = line[min(n - 1, int(x / W * n))]
            img[r, x] = 0 if v <= 0 else int(255 * min(1, math.log1p(v) / math.log1p(20)))
    Image.fromarray(img[::-1]).save(os.path.join(OUT, "mars_preview.png"), optimize=True)
    print(sum(rows), "windows,", nbad, "unknown,", len(buf) // 1024, "KB")

if __name__ == "__main__":
    main()
