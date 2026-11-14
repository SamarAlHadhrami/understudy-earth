"""Land-cover flags per 10 km square from ESA WorldCover 10 m (2021, v200), read by HTTP windows (nothing downloaded whole).
Writes app/data/landcover.json: {id: [tree%, crop%, built%]} (share of the square, integer %)."""
import json, math, os, sys
import numpy as np, rasterio
from rasterio.windows import from_bounds
from rasterio.enums import Resampling
sys.path.insert(0, os.path.dirname(__file__))
from build_windows import OUT

BASE = "https://esa-worldcover.s3.eu-central-1.amazonaws.com/v200/2021/map/ESA_WorldCover_10m_2021_v200_%s_Map.tif"

def tile(lat, lon):
    la, lo = int(math.floor(lat / 3) * 3), int(math.floor(lon / 3) * 3)
    return "%s%02d%s%03d" % ("N" if la >= 0 else "S", abs(la), "E" if lo >= 0 else "W", abs(lo))

def main():
    earth = json.load(open(os.path.join(OUT, "earth.json")))
    res, srcs = {}, {}
    for e in earth:
        t = tile(e["lat"], e["lon"])
        if t not in srcs: srcs[t] = rasterio.open(BASE % t)
        s = srcs[t]
        dlat = 5 / 111.32; dlon = 5 / (111.32 * math.cos(math.radians(e["lat"])))
        b = (e["lon"] - dlon, e["lat"] - dlat, e["lon"] + dlon, e["lat"] + dlat)
        try:
            w = from_bounds(*b, transform=s.transform)
            a = s.read(1, window=w, out_shape=(200, 200), resampling=Resampling.nearest, boundless=True, fill_value=0)
        except Exception as ex:
            print("fail", e["id"], ex); continue
        valid = a > 0
        n = max(1, valid.sum())
        res[e["id"]] = [int(round(100 * (a == c).sum() / n)) for c in (10, 40, 50)]
    json.dump(res, open(os.path.join(OUT, "landcover.json"), "w"), separators=(",", ":"))
    flagged = sum(1 for v in res.values() if sum(v) >= 10)
    print(len(res), "squares,", flagged, "flagged (tree+crop+built >= 10%)")

if __name__ == "__main__":
    main()
