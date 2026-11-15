"""Mars thermal inertia (rock/dust/grain-size proxy) at our 11 fixed Mars target sites, from the real USGS/ASU
THEMIS quantitative (32-bit) global mosaic (Fergason et al. 2006; Edwards et al. 2011), 100 m/px, +-60 deg latitude.
The mosaic is split into 24 tiles of 30 deg lat x 60 deg lon each, ~2.3 GB per tile (ISIS3 .cub on S3). We never
download a whole tile: GDAL/rasterio opens the remote file over HTTP range requests (/vsicurl/) and only the
small 10 km window around each site is actually fetched. Context only, not a score: units and scale are not
comparable with any Earth climate value in this app.
"""
import json, os, sys
import numpy as np, rasterio
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
from build_windows import MARS, OUT

BASE = "https://asc-astropedia.s3.us-west-2.amazonaws.com/Mars/Odyssey/THEMIS-Global-Thermal-Inertia-Mosaic/Quantitative-32-Bit/THEMIS_TI_Mosaic_Quant_%s_100mpp.cub"

def tile_for(lat, lon):
    lon_e = lon % 360.0
    lonband = int(lon_e // 60) * 60
    if lat >= 0:
        latband = "00N" if lat < 30 else "30N"
    else:
        latband = "30S" if lat >= -30 else "60S"
    return "%s%03dE" % (latband, lonband)

out = {}
cache = {}
for name, lat, lon in MARS:
    tile = tile_for(lat, lon)
    if tile not in cache:
        url = "/vsicurl/" + BASE % tile
        try:
            cache[tile] = rasterio.open(url)
        except Exception as e:
            print("tile open failed", tile, e); cache[tile] = None
    s = cache[tile]
    if s is None:
        out[name] = None; continue
    tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
    x, y = tr.transform(lon, lat)
    col, row = s.index(x, y)[1], s.index(x, y)[0]
    half = 50  # 50 px = 5 km half-width at 100 m/px
    r0, c0 = max(0, row - half), max(0, col - half)
    try:
        a = s.read(1, window=rasterio.windows.Window(c0, r0, 2 * half, 2 * half))
    except Exception as e:
        print("read failed", name, tile, e); out[name] = None; continue
    a = a[np.isfinite(a) & (a > -1e30)]
    if a.size == 0:
        print(name, tile, "no valid pixels (gap in THEMIS coverage)"); out[name] = None; continue
    out[name] = {"tile": tile, "ti_si": round(float(np.median(a)), 1), "n_px": int(a.size)}
    print(name, tile, out[name])

for s in cache.values():
    if s: s.close()

json.dump({"unit": "SI thermal inertia, J m^-2 K^-1 s^-1/2 (THEMIS quantitative mosaic, Fergason et al. 2006)",
           "source": "USGS/ASU THEMIS Thermal Inertia Mosaic, Quantitative 32-bit, 100 m/px, doi references in docs/REFERENCES.md",
           "sites": out},
          open(os.path.join(OUT, "thermal_mars.json"), "w"), indent=1)
print("done,", sum(1 for v in out.values() if v), "of", len(out), "sites have a value")
