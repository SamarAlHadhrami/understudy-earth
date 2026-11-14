"""Cut Earth, Moon and Mars windows at the common 500 m baseline and save histograms + stats."""
import json, os, sys, glob
import rasterio
from pyproj import Transformer
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
DATA = os.path.join(ROOT, "data")
OUT = os.path.join(ROOT, "app", "data")
os.makedirs(OUT, exist_ok=True)

EARTH_TILES = {
    "N23_00_E058": "oman_muscat",
    "N17_00_E054": "oman_dhofar", "N18_00_E054": "oman_dhofar",
    "N17_00_E055": "oman_dhofar", "N18_00_E055": "oman_dhofar",
    "N35_00_W112": "meteor_crater",
    "S25_00_W070": "atacama",
}

MOON = [  # name, lat, lon_east (centre window, south pole only)
    ("Shackleton rim/wall (approx. coords)", -89.9, 129.8), ("Malapert massif", -85.9, 0.0),
    ("Faustini", -87.3, 77.0), ("Nobile", -85.2, 53.3),
    ("de Gerlache", -88.5, -87.1), ("Cabeus", -84.9, -35.5),
]
MARS = [
    ("Jezero crater", 18.38, 77.58), ("Gale mound south flank", -5.4, 137.8),
    ("Gale mound (Aeolis Mons)", -5.08, 137.85), ("Gale landing area (Bradbury)", -4.59, 137.44), ("Oxia Planum", 18.2, -24.4),
    ("Meridiani Planum", -1.95, -5.53), ("Gusev crater", -14.57, 175.47),
    ("Mawrth Vallis", 24.0, -19.0), ("Melas Chasma (Valles Marineris)", -9.8, -71.0),
    ("Olympus Mons flank", 18.65, -133.8), ("Hellas floor", -42.0, 70.0),
]


def build_earth():
    out = []
    for tag, group in EARTH_TILES.items():
        path = glob.glob(os.path.join(DATA, f"*{tag}*.tif"))
        if not path:
            print("missing", tag); continue
        n = 0
        for lat, lon, z in t.earth_windows(path[0]):
            if z is not None and (z <= 0.5).mean() >= 0.10:
                continue  # sea / water-level cells (Copernicus ocean = 0 m)
            f = t.window_features(z)
            if f is None: continue
            out.append({"id": f"E{len(out):04d}", "group": group, "lat": round(lat, 4), "lon": round(lon, 4), **f})
            n += 1
        print(tag, group, n, "windows")
    return out


def build_targets():
    out = []
    with rasterio.open(os.path.join(DATA, "LDEM_80S_80MPP_ADJ.tif")) as s:
        tr = Transformer.from_crs(s.crs.geodetic_crs if hasattr(s.crs, "geodetic_crs") else s.crs.to_wkt(), s.crs, always_xy=True)
        for name, lat, lon in MOON:
            x, y = tr.transform(lon, lat)
            f = t.window_features(t.window_at(s, x, y))
            if f: out.append({"id": f"M{len(out):02d}", "body": "Moon", "name": name, "lat": lat, "lon": lon, **f})
            else: print("moon window failed", name)
    with rasterio.open(os.path.join(DATA, "Mars_MGS_MOLA_DEM_mosaic_global_463m.tif")) as s:
        tr = Transformer.from_crs(s.crs.geodetic_crs, s.crs, always_xy=True)
        for name, lat, lon in MARS:
            x, y = tr.transform(lon, lat)
            f = t.window_features(t.window_at(s, x, y))
            if f: out.append({"id": f"R{len(out):02d}", "body": "Mars", "name": name, "lat": lat, "lon": lon, **f})
            else: print("mars window failed", name)
    return out


if __name__ == "__main__":
    tg = build_targets()
    for x in tg:
        print(x["body"], x["name"], "p50 %.2f p90 %.2f rough %.1f relief %.0f" % (x["slope_p50"], x["slope_p90"], x["rough_med"], x["relief_m"]))
    json.dump(tg, open(os.path.join(OUT, "targets.json"), "w"), separators=(",", ":"))
    ea = build_earth()
    json.dump(ea, open(os.path.join(OUT, "earth.json"), "w"), separators=(",", ":"))
    print("earth", len(ea), "targets", len(tg))
