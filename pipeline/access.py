"""Access factor from OpenStreetMap (ODbL): distance from each square centre to the nearest paved or main road and to the nearest town or city.
Raw OSM files live in data/osm (git-ignored); only derived distances are written. This is NOT space data and says nothing about permission to enter.
Roads: highway=motorway/trunk/primary/secondary (and links), or any highway tagged surface=paved/asphalt/concrete. Towns: place=city/town."""
import json, os, sys
import numpy as np
from scipy.spatial import cKDTree
sys.path.insert(0, os.path.dirname(__file__))
from build_windows import DATA, OUT

R = 6371.0
def xyz(lat, lon):
    la, lo = np.radians(lat), np.radians(lon)
    return np.c_[R * np.cos(la) * np.cos(lo), R * np.cos(la) * np.sin(lo), R * np.sin(la)]

def read_road_vertices(path):
    """Stream the pretty-printed Overpass JSON line by line (about 150 MB) and collect road vertices without loading the whole file."""
    import re
    pat = re.compile(r'"lat":\s*(-?[0-9.]+),\s*"lon":\s*(-?[0-9.]+)')
    pts = []
    with open(path, encoding="utf-8") as f:
        ingeom = False
        for line in f:
            if '"geometry"' in line: ingeom = True; continue
            if ingeom:
                m = pat.search(line)
                if m: pts.append((float(m.group(1)), float(m.group(2))))
                elif line.strip().startswith("]"): ingeom = False
    return np.array(pts)

def chord_km(d): return 2 * R * np.arcsin(np.clip(d / (2 * R), 0, 1))

def main(squares_files):
    pts = read_road_vertices(os.path.join(DATA, "osm", "roads.json"))
    print("road vertices", len(pts))
    tree = cKDTree(xyz(pts[:, 0], pts[:, 1]))
    tw = json.load(open(os.path.join(DATA, "osm", "towns.json"), encoding="utf-8"))["elements"]
    tl = np.array([(e["lat"], e["lon"]) for e in tw]); names = [e.get("tags", {}).get("name:en") or e.get("tags", {}).get("name", "") for e in tw]
    ttree = cKDTree(xyz(tl[:, 0], tl[:, 1])); print("towns", len(tl))
    out = {}
    for fn in squares_files:
        for e in json.load(open(os.path.join(OUT, fn))):
            if not (16.5 <= e["lat"] <= 26.5 and 52 <= e["lon"] <= 60): continue  # OSM extract covers the Oman box only
            q = xyz(np.array([e["lat"]]), np.array([e["lon"]]))
            d1, _ = tree.query(q); d2, i2 = ttree.query(q)
            out[e["id"]] = [round(float(chord_km(d1[0])), 1), round(float(chord_km(d2[0])), 1), names[int(i2[0])]]
    json.dump(out, open(os.path.join(OUT, "access.json"), "w", encoding="utf-8"), ensure_ascii=False, separators=(",", ":"))
    v = np.array([x[0] for x in out.values()]); print(len(out), "squares; road km median %.1f max %.1f" % (np.median(v), v.max()))

if __name__ == "__main__":
    main(sys.argv[1:] or ["earth.json"])
