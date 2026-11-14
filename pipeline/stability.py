"""Stability check: repeat the terrain similarity and the gap result with other settings. Writes app/data/stability.json.
Settings: window size 5, 10, 20 km; cell size 500 m and 1000 m; match/partial thresholds 5/20 % versus 10/30 % of Earth-pair distances.
The main method (10 km, 500 m, 5/20 %) is not changed by this script."""
import glob, json, math, os, sys
import numpy as np, rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import scoring as sc
from terrain import SLOPE_EDGES, ROUGH_EDGES, roughness_m
from build_windows import EARTH_TILES, MOON, MARS, DATA, OUT

def slope(z, dx):
    gx = (z[1:-1, 2:] - z[1:-1, :-2]) / (2 * dx); gy = (z[2:, 1:-1] - z[:-2, 1:-1]) / (2 * dx)
    return np.degrees(np.arctan(np.hypot(gx, gy)))

def feats(z, cell):
    if z is None or not np.isfinite(z).all(): return None
    n = z.shape[0]
    sl = slope(z, cell); ro = roughness_m(z)
    h, _, _ = np.histogram2d(sl.ravel(), ro.ravel(), bins=[SLOPE_EDGES, ROUGH_EDGES])
    z2 = z[: n // 2 * 2, : n // 2 * 2].reshape(n // 2, 2, n // 2, 2).mean((1, 3))
    return {"hist": h.astype(int).ravel().tolist(), "steep_share": float((sl > 10).mean()), "rough1k_med": float(np.median(roughness_m(z2))),
            "slope_p50": float(np.percentile(sl, 50)), "slope_p90": float(np.percentile(sl, 90)), "rough_med": float(np.median(ro)), "relief_m": float(z.max() - z.min())}

def rd(src, win, n):
    a = src.read(1, window=win, out_shape=(n, n), resampling=Resampling.average, masked=True)
    if a.mask.any() and a.mask.mean() > 0.05: return None
    return np.asarray(a.filled(np.nanmean(a.compressed())) if a.mask.any() else a, float)

def earth_feats(wkm, cell):
    n = int(wkm * 1000 / cell); out = []
    for tag, group in EARTH_TILES.items():
        p = glob.glob(os.path.join(DATA, "*%s*.tif" % tag))
        if not p: continue
        with rasterio.open(p[0]) as s:
            b = s.bounds; lat0 = (b.top + b.bottom) / 2
            hy = int(round(wkm * 1000 / (abs(s.res[1]) * 111320.0))); hx = int(round(wkm * 1000 / (abs(s.res[0]) * 111320.0 * math.cos(math.radians(lat0)))))
            for r in range(0, s.height - hy + 1, hy):
                for c in range(0, s.width - hx + 1, hx):
                    z = rd(s, Window(c, r, hx, hy), n)
                    if z is None or (z <= 0.5).mean() >= 0.10: continue
                    f = feats(z, cell)
                    if f is None: continue
                    lon, lat = s.xy(r + hy // 2, c + hx // 2); f.update(group=group, lat=lat, lon=lon); out.append(f)
    return out

def target_feats(wkm, cell):
    n = int(wkm * 1000 / cell); half = wkm * 500; out = []
    for path, lst, body in ((os.path.join(DATA, "LDEM_80S_80MPP_ADJ.tif"), MOON, "Moon"), (os.path.join(DATA, "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif"), MARS, "Mars")):
        with rasterio.open(path) as s:
            tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
            for name, lat, lon in lst:
                x, y = tr.transform(lon, lat); r0, c0 = s.index(x, y)
                wx, wy = int(round(half * 2 / abs(s.res[0]))), int(round(half * 2 / abs(s.res[1])))
                col0, row0 = c0 - wx // 2, r0 - wy // 2
                if col0 < 0 or row0 < 0 or col0 + wx > s.width or row0 + wy > s.height: out.append((name, body, None)); continue
                out.append((name, body, feats(rd(s, Window(col0, row0, wx, wy), n), cell)))
    return out

def run(wkm, cell, thr_pcts=((5, 20), (10, 30))):
    E = earth_feats(wkm, cell); T = target_feats(wkm, cell)
    sc.set_scales(sc.feature_scales(E))
    rng = np.random.default_rng(7); pr = rng.choice(len(E), (20000, 2)); pr = pr[pr[:, 0] != pr[:, 1]]
    pd_ = np.array([sc.distance(E[a], E[b]) for a, b in pr])
    oman = np.array([e["group"].startswith("oman") for e in E])
    res = {}
    for name, body, f in T:
        if f is None: res[name] = None; continue
        d = np.array([sc.distance(e, f) for e in E]); bo = float(d[oman].min()); ba = float(d.min())
        row = {"best_oman": round(bo, 3), "oman_pair_pct": round(100 * float((pd_ < bo).mean()), 1), "any_pair_pct": round(100 * float((pd_ < ba).mean()), 1)}
        for lo, hi in thr_pcts:
            tm, tp = np.percentile(pd_, lo), np.percentile(pd_, hi)
            row["tier_%d_%d" % (lo, hi)] = "match" if bo < tm else ("partial" if bo < tp else "gap")
        res[name] = row
    return {"n_windows": len(E), "targets": res}

CONFIGS = [("base", 10, 500), ("win5", 5, 500), ("win20", 20, 500), ("cell1000", 10, 1000)]
if __name__ == "__main__":
    out = {}
    for key, w, c in CONFIGS:
        out[key] = run(w, c); print(key, out[key]["n_windows"], "windows")
    names = [n for n, _, _ in MOON + MARS] if False else [x[0] for x in MOON] + [x[0] for x in MARS]
    summary = []
    for n in names:
        tiers, pcts = [], []
        for key, _, _ in CONFIGS:
            r = out[key]["targets"].get(n)
            if not r: continue
            tiers += [r["tier_5_20"], r["tier_10_30"]]; pcts.append(r["oman_pair_pct"])
        base = out["base"]["targets"][n]["tier_5_20"]
        summary.append({"target": n, "base_tier": base, "tiers_seen": sorted(set(tiers)), "threshold_sensitive": len(set(tiers)) > 1,
                        "band_pct": [min(pcts), max(pcts)], "n_settings": len(tiers)})
    json.dump({"configs": out, "summary": summary, "note": "tier = best Oman square vs Earth-pair distance percentiles; band = lowest and highest percent of Earth pairs closer than the best Oman square across window/cell settings"},
              open(os.path.join(OUT, "stability.json"), "w"), separators=(",", ":"))
    for s in summary: print(s)
