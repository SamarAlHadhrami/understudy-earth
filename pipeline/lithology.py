"""Real rock-type lookup for every Earth window, from the Global Lithological Map (GLiM) v1.0, 0.5 deg gridded
version (Hartmann & Moosdorf 2012, Geochemistry Geophysics Geosystems 13, doi 10.1029/2012GC004370; data CC BY
3.0, PANGAEA doi 10.1594/PANGAEA.788537). This replaces nothing: the hand-picked geology quotes in notes.json
stay; this adds one real, sourced rock-type class per window, context only, not a score (lithology class alone
says nothing about Mars/Moon analog quality without more interpretation)."""
import json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
from build_windows import ROOT, OUT

ASC = os.path.join(ROOT, "data", "glim", "glim_wgs84_0point5deg.txt.asc")
NAMES = {  # standard 16-class GLiM legend (Hartmann & Moosdorf 2012, Table 1)
    "su": "Unconsolidated sediments", "vb": "Basic volcanic rocks", "ss": "Siliciclastic sedimentary rocks",
    "pb": "Basic plutonic rocks", "sm": "Mixed sedimentary rocks", "sc": "Carbonate sedimentary rocks",
    "va": "Acid volcanic rocks", "mt": "Metamorphic rocks", "pa": "Acid plutonic rocks",
    "vi": "Intermediate volcanic rocks", "wb": "Water body", "py": "Pyroclastics",
    "pi": "Intermediate plutonic rocks", "ev": "Evaporites", "nd": "No data", "ig": "Ice / glaciers",
}


def load_legend():
    legend = {}
    for line in open(os.path.join(ROOT, "data", "glim", "Classnames.txt"), encoding="utf-8"):
        p = [x.strip('"') for x in line.strip().split(";")]
        if p[0] == "OBJECTID": continue
        legend[int(p[1])] = p[3]
    return legend


def load_grid():
    with open(ASC) as f:
        hdr = {}
        for _ in range(6):
            k, v = f.readline().split()
            hdr[k.lower()] = float(v)
        rows = [list(map(int, f.readline().split())) for _ in range(int(hdr["nrows"]))]
    return hdr, rows


def lookup(hdr, rows, legend, lat, lon):
    col = int((lon - hdr["xllcorner"]) // hdr["cellsize"])
    row = int((hdr["yllcorner"] + hdr["nrows"] * hdr["cellsize"] - lat) // hdr["cellsize"])
    if not (0 <= row < len(rows) and 0 <= col < len(rows[0])): return None
    v = rows[row][col]
    if v == hdr["nodata_value"] or v not in legend: return None
    code = legend[v]
    return {"code": code, "name": NAMES.get(code, code)}


if __name__ == "__main__":
    legend = load_legend()
    hdr, rows = load_grid()
    earth = json.load(open(os.path.join(OUT, "earth.json")))
    f90 = os.path.join(OUT, "earth90.json")
    if os.path.exists(f90): earth += json.load(open(f90))
    out, n = {}, 0
    for e in earth:
        g = lookup(hdr, rows, legend, e["lat"], e["lon"])
        if g: out[e["id"]] = g; n += 1
    json.dump({"source": "Global Lithological Map (GLiM) v1.0, 0.5 deg grid (Hartmann & Moosdorf 2012, doi 10.1029/2012GC004370; CC BY 3.0, PANGAEA doi 10.1594/PANGAEA.788537)",
               "note": "Context only, not a score. 0.5 degree cells (about 55 km); a coarse rock-type class for the whole cell, not the exact window.",
               "by_id": out},
              open(os.path.join(OUT, "lithology.json"), "w"), separators=(",", ":"))
    print(n, "of", len(earth), "windows got a lithology class")
