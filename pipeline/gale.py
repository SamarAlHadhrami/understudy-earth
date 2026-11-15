"""Gale crater 30 m HRSC DTM mosaic (candidate/actual MSL landing site region), same method as the main pool: 10 km windows
read as 20 x 20 cells of 500 m. Source: 30-m HRSC DTM Mosaic of Gale Crater, Mars (Persaud, Putri, Muller 2021, Zenodo
10.5281/zenodo.5808354, CC BY 4.0; HRSC is ESA Mars Express, processed in part at NASA JPL). Native resolution is already
30 m, so there is no finer 30 m check beyond the main method here (unlike Jezero, which starts from 1 m). Windows are read
directly from the file's own projected coordinates (never the whole ~210 MB raster at once: each window reads only its
own small patch). Writes app/data/gale.json and app/data/relief/GAL*.png."""
import json, math, os, sys
import numpy as np, rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t, scoring as sc
from build_windows import DATA, OUT
from jezero import shade64, earth30, feats30

def main():
    path = os.path.join(DATA, "hrsc_km09_h1938_h1927_h1916-dtm-mosaic.tif")
    if not os.path.exists(path):
        print("Gale HRSC mosaic not found, skipping:", path); return
    earth = json.load(open(os.path.join(OUT, "earth.json"))); targets = json.load(open(os.path.join(OUT, "targets.json")))
    sc.set_scales(sc.feature_scales(earth))
    GALE_LAT, GALE_LON, MAX_KM = -5.4, 137.8, 90.0  # crater centre and a radius comfortably inside the ~154 km-diameter rim
    def hav(a, b, c, d):
        p = math.pi / 180; x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2; return 3389.5 * 2 * math.asin(math.sqrt(x))
    cand = []
    with rasterio.open(path) as s:
        nod, px = s.nodata, abs(s.res[0])
        win_px = int(round(10000 / px))           # 10 km in source pixels (about 333 at 30 m)
        stride_px = int(round(2500 / px))          # 2.5 km stride, same spacing style as Jezero
        tr0 = Transformer.from_crs(s.crs, s.crs.geodetic_crs, always_xy=True)
        for r0 in range(0, s.height - win_px, stride_px):
            for c0 in range(0, s.width - win_px, stride_px):
                x, y = s.xy(r0 + win_px // 2, c0 + win_px // 2); lon, lat = tr0.transform(x, y)
                if hav(GALE_LAT, GALE_LON, lat, lon) > MAX_KM: continue
                a = s.read(1, window=Window(c0, r0, win_px, win_px), out_shape=(20, 20), resampling=Resampling.average).astype("float64")
                nf = float((a == nod).mean()) if nod is not None else 0.0
                if nf <= 0.02: cand.append((nf, r0, c0))
    chosen = []
    for nf, r, c in sorted(cand):
        if all(abs(r - r2) >= win_px or abs(c - c2) >= win_px for _, r2, c2 in chosen): chosen.append((nf, r, c))
        if len(chosen) >= 6: break
    print("candidate windows", len(cand), "chosen", len(chosen))
    wins = []
    with rasterio.open(path) as s:
        nod, px = s.nodata, abs(s.res[0])
        win_px = int(round(10000 / px))
        tr = Transformer.from_crs(s.crs, s.crs.geodetic_crs, always_xy=True)
        for wi, (nf, r0, c0) in enumerate(chosen):
            a = s.read(1, window=Window(c0, r0, win_px, win_px), out_shape=(20, 20), resampling=Resampling.average).astype("float64")
            a = np.where(a == nod, np.nan, a)
            a = np.where(np.isfinite(a), a, np.nanmean(a))
            f = t.window_features(a)
            shade64(a - np.nanmean(a)).save(os.path.join(OUT, "relief", "GAL%d.png" % wi), optimize=True)
            x, y = s.xy(r0 + win_px // 2, c0 + win_px // 2)
            lon, lat = tr.transform(x, y)
            wins.append({"id": "GAL%d" % wi, "feat500": f, "feat30": None, "empty_cells_pct": round(100 * nf, 1), "lat": round(lat, 2), "lon": round(lon, 2)})
    e30 = None  # native resolution is already 30 m: no finer check beyond the 500 m method for this site
    for w in wins:
        d500 = np.array([sc.distance(e, w["feat500"]) for e in earth])
        w["top500"] = [{"id": earth[i]["id"], "group": earth[i]["group"], "lat": earth[i]["lat"], "lon": earth[i]["lon"], "dist": round(float(d500[i]), 3)} for i in np.argsort(d500)[:5]]
        om = [i for i in np.argsort(d500) if earth[i]["group"].startswith("oman")][:5]
        w["top500_oman"] = [{"id": earth[i]["id"], "group": earth[i]["group"], "lat": earth[i]["lat"], "lon": earth[i]["lon"], "dist": round(float(d500[i]), 3)} for i in om]
        w["best500_tier"] = "match" if d500.min() < 0.081 else ("partial" if d500.min() < 0.245 else "gap")
    ga = [x for x in targets if x["name"] == "Gale landing area (Bradbury)"][0]
    out = {"windows": wins, "note": "30 m HRSC DTM mosaic of Gale crater (CC BY 4.0, Persaud/Putri/Muller 2021); native resolution is already 30 m, so there is no finer check here (unlike the Jezero 1 m case). Not the whole crater; a handful of 10 km windows across the mosaic.",
           "source_mola_target": ga["id"], "mola_best500_dist": round(float(min(sc.distance(e, ga) for e in earth)), 3)}
    json.dump(out, open(os.path.join(OUT, "gale.json"), "w"), separators=(",", ":"))
    for w in wins: print(w["id"], w["lat"], w["lon"], "500m p50 %.2f p90 %.2f" % (w["feat500"]["slope_p50"], w["feat500"]["slope_p90"]), "top500", [(x["id"], x["dist"]) for x in w["top500"][:3]])

if __name__ == "__main__":
    main()
