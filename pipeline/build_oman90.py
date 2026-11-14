"""Whole-Oman box at 90 m: Copernicus GLO-90 tiles (data/glo90, bucket copernicus-dem-90m) -> 10 km squares with the same terrain method.
Tiles already covered by the 30 m tiles (Dhofar N17/N18 E054/E055, Muscat N23E058) are skipped so the 30 m squares are kept there.
Writes app/data/earth90.json (squares, group oman90). The 16.5-26.5 N, 52-60 E box includes parts of neighbouring countries and sea edges."""
import glob, json, os, sys
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import DATA, OUT
HAVE30 = ("N17_00_E054", "N17_00_E055", "N18_00_E054", "N18_00_E055", "N23_00_E058")
out = []
for f in sorted(glob.glob(os.path.join(DATA, "glo90", "*.tif"))):
    if any(k in f for k in HAVE30): continue
    for lat, lon, z in t.earth_windows(f):
        if z is None or (z <= 0.5).mean() >= 0.10: continue
        if not (16.5 <= lat <= 26.5 and 52 <= lon <= 60): continue
        ft = t.window_features(z)
        if ft: out.append({"id": "H%04d" % len(out), "group": "oman90", "lat": round(lat, 4), "lon": round(lon, 4), **ft})
json.dump(out, open(os.path.join(OUT, "earth90.json"), "w"), separators=(",", ":"))
print(len(out), "squares", os.path.getsize(os.path.join(OUT, "earth90.json")) // 1024, "KB")
