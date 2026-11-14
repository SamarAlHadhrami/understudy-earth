"""Jezero 1 m HiRISE terrain model, read in strips (never whole), block-averaged to 500 m (same method as Oman) and to 30 m (finer check).
Writes app/data/jezero.json and app/data/relief/JEZ*.png. The 1 m file is about 1.8 GB: each pass reads at most 500 rows (about 43 MB) at a time."""
import glob, json, os, sys
import numpy as np, rasterio
from rasterio.windows import Window
from PIL import Image
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t, scoring as sc
from build_windows import DATA, OUT

def block_mean(a, k):
    """Mean of k x k blocks, ignoring NaN. a: 2-D float array whose sides are multiples of k. Cells with more than 5% NaN stay NaN."""
    r, c = a.shape[0] // k, a.shape[1] // k
    b = a[: r * k, : c * k].reshape(r, k, c, k)
    n = np.isfinite(b).sum((1, 3))
    s = np.where(np.isfinite(b), b, 0.0).sum((1, 3))
    with np.errstate(invalid="ignore", divide="ignore"):
        m = s / n
    m[n < 0.95 * k * k] = np.nan
    return m

def grid(path, k, rows_per_band):
    """Stream the file in bands of rows_per_band rows (a multiple of k) and return the k-metre block-mean grid."""
    out = []
    with rasterio.open(path) as s:
        nod = s.nodata
        H = s.height // k * k
        for r0 in range(0, H, rows_per_band):
            h = min(rows_per_band, H - r0)
            a = s.read(1, window=Window(0, r0, s.width, h)).astype("float64")
            a[a == nod] = np.nan; a[a < -1e6] = np.nan
            out.append(block_mean(a, k))
    return np.vstack(out)

def feats30(z):
    """Slope and roughness at the 30 m baseline for a 30 m grid (central differences, 3 x 3 roughness)."""
    sl = t.slope_deg(z, 30.0, 30.0); ro = t.roughness_m(z)
    return {"slope_p50": float(np.percentile(sl, 50)), "slope_p90": float(np.percentile(sl, 90)), "steep_share": float((sl > 10).mean()),
            "rough_med": float(np.median(ro))}

def shade64(z):
    im = np.array(Image.fromarray(z.astype("float32")).resize((64, 64), Image.BOX), float) * 3.0
    gy, gx = np.gradient(im, 10000 / 64)
    sl = np.arctan(np.hypot(gx, gy)); asp = np.arctan2(gy, -gx)
    h = np.cos(np.radians(45)) * np.cos(sl) + np.sin(np.radians(45)) * np.sin(sl) * np.cos(np.radians(315) - asp)
    return Image.fromarray((np.clip(h, 0, 1) * 255).astype(np.uint8))

def main():
    path = glob.glob(os.path.join(DATA, "JEZ*.tif"))[0]
    g500 = grid(path, 500, 500)            # 42 x 42 cells of 500 m
    g30 = grid(path, 30, 30 * 16)           # about 716 x 713 cells of 30 m
    earth = json.load(open(os.path.join(OUT, "earth.json"))); targets = json.load(open(os.path.join(OUT, "targets.json")))
    sc.set_scales(sc.feature_scales(earth))
    wins = []
    # Window rule (written before looking at any score): all 20 x 20 cell (10 km) windows on a 5-cell stride with at most 2% empty cells,
    # then keep non-overlapping ones, fewest empty cells first. The DTM footprint is slanted, so only a few windows qualify.
    cand = []
    for r in range(0, g500.shape[0] - 19, 5):
        for c in range(0, g500.shape[1] - 19, 5):
            nf = float(np.isnan(g500[r:r + 20, c:c + 20]).mean())
            if nf <= 0.02: cand.append((nf, r, c))
    chosen = []
    for nf, r, c in sorted(cand):
        if all(abs(r - r2) >= 20 or abs(c - c2) >= 20 for _, r2, c2 in chosen): chosen.append((nf, r, c))
    print("candidate windows", len(cand), "chosen", [(r, c, round(nf, 3)) for nf, r, c in chosen])
    for wi, (nf, r, c) in enumerate(chosen):
        z = g500[r:r + 20, c:c + 20]
        z = np.where(np.isfinite(z), z, np.nanmean(z))
        f = t.window_features(z)
        r30, c30 = r * 500 // 30, c * 500 // 30; z30 = g30[r30:r30 + 333, c30:c30 + 333]
        f30 = feats30(np.where(np.isfinite(z30), z30, np.nanmean(z30))) if np.isfinite(z30).mean() > 0.97 else None
        if f30: shade64(np.where(np.isfinite(z30), z30, np.nanmean(z30)) - np.nanmean(z30)).save(os.path.join(OUT, "relief", "JEZ%d.png" % wi), optimize=True)
        wins.append({"id": "JEZ%d" % wi, "feat500": f, "feat30": f30, "empty_cells_pct": round(100 * nf, 1), "origin_cell": [int(r), int(c)]})
    # Earth squares at the 30 m baseline (finer check, separate from the frozen 500 m method)
    e30 = earth30(earth)
    sd = {k: max(float(np.std([x[k] for x in e30 if x])), 1e-3) for k in ("slope_p50", "slope_p90", "steep_share")}
    sd["rough"] = max(float(np.std([np.log1p(x["rough_med"]) for x in e30 if x])), 1e-3)
    def d30(a, b):
        return float(np.mean([abs(a["slope_p50"] - b["slope_p50"]) / sd["slope_p50"], abs(a["slope_p90"] - b["slope_p90"]) / sd["slope_p90"],
                              abs(a["steep_share"] - b["steep_share"]) / sd["steep_share"], abs(np.log1p(a["rough_med"]) - np.log1p(b["rough_med"])) / sd["rough"]]))
    for w in wins:
        d500 = np.array([sc.distance(e, w["feat500"]) for e in earth])
        w["top500"] = [{"id": earth[i]["id"], "group": earth[i]["group"], "lat": earth[i]["lat"], "lon": earth[i]["lon"], "dist": round(float(d500[i]), 3)} for i in np.argsort(d500)[:5]]
        om = [i for i in np.argsort(d500) if earth[i]["group"].startswith("oman")][:5]
        w["top500_oman"] = [{"id": earth[i]["id"], "group": earth[i]["group"], "lat": earth[i]["lat"], "lon": earth[i]["lon"], "dist": round(float(d500[i]), 3)} for i in om]
        w["best500_tier"] = "match" if d500.min() < 0.081 else ("partial" if d500.min() < 0.245 else "gap")
        if w["feat30"]:
            dd = np.array([d30(e30[i], w["feat30"]) if e30[i] else 1e9 for i in range(len(earth))])
            om3 = [i for i in np.argsort(dd) if earth[i]["group"].startswith("oman")][:5]
            w["top30_oman"] = [{"id": earth[i]["id"], "group": earth[i]["group"], "lat": earth[i]["lat"], "lon": earth[i]["lon"], "dist": round(float(dd[i]), 3)} for i in om3]
            w["top30"] = [{"id": earth[i]["id"], "group": earth[i]["group"], "lat": earth[i]["lat"], "lon": earth[i]["lon"], "dist": round(float(dd[i]), 3)} for i in np.argsort(dd)[:5]]
    jz = [x for x in targets if x["name"] == "Jezero crater"][0]
    out = {"windows": wins, "note": "1 m HiRISE DTM of the Jezero delta region (about 21 km x 21 km), block-averaged; not the whole crater.", "source_mola_target": jz["id"], "e30_scales": sd,
           "mola_best500_dist": round(float(min(sc.distance(e, jz) for e in earth)), 3)}
    json.dump(out, open(os.path.join(OUT, "jezero.json"), "w"), separators=(",", ":"))
    for w in wins: print(w["id"], "500m p50 %.2f p90 %.2f" % (w["feat500"]["slope_p50"], w["feat500"]["slope_p90"]), "30m", w["feat30"], "top500", [(x["id"], x["dist"]) for x in w["top500"][:3]])

def earth30(earth):
    """30 m-baseline features for each Earth square, read from the Copernicus 30 m tiles (333 x 333 cells per 10 km, windowed reads)."""
    import math
    import rasterio.windows as rw
    from rasterio.enums import Resampling
    srcs = [rasterio.open(f) for f in glob.glob(os.path.join(DATA, "Copernicus_DSM_COG_10_*_DEM.tif"))]
    res = []
    for w in earth:
        s = [x for x in srcs if x.bounds.left <= w["lon"] < x.bounds.right and x.bounds.bottom <= w["lat"] < x.bounds.top]
        if not s: res.append(None); continue
        s = s[0]
        dlat = 5000 / 111320.0; dlon = 5000 / (111320.0 * math.cos(math.radians(w["lat"])))
        win = rw.from_bounds(w["lon"] - dlon, w["lat"] - dlat, w["lon"] + dlon, w["lat"] + dlat, transform=s.transform)
        a = s.read(1, window=win, out_shape=(333, 333), resampling=Resampling.average, boundless=True, fill_value=0).astype("float64")
        res.append(feats30(a))
    return res

if __name__ == "__main__":
    main()
