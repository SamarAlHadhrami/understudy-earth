"""About 30 CHOSEN places worldwide, scored with the same terrain method at 90 m (Copernicus GLO-90, bucket copernicus-dem-90m, no login).
A chosen set, not every place on Earth, and the coordinates are approximate reference points; no claim that any place is a good analog.
For each site: all 10 km squares within 15 km of the reference point (from the one 1-degree tile that contains it). Raw tiles in data/glo90_world (git-ignored).
Meteor Crater and the Atacama tile centre reuse the 30 m squares already in the main pool. Writes app/data/world.json."""
import json, math, os, sys, urllib.request, urllib.error
sys.path.insert(0, os.path.dirname(__file__))
import terrain as t
from build_windows import DATA, OUT

SITES = [("Mojave Desert, California", 35.0, -116.0, "desert"), ("Death Valley, California", 36.3, -116.9, "desert"), ("Erg Chebbi, Morocco", 31.15, -4.0, "desert"),
 ("Namib Desert", -24.7, 15.3, "desert"), ("Wahiba Sands, Oman", 22.4, 58.7, "desert"), ("Rub' al Khali, Saudi Arabia", 21.5, 51.5, "desert"), ("Dasht-e Lut, Iran", 30.5, 59.0, "desert"),
 ("Taklamakan Desert", 39.0, 83.0, "desert"), ("Gobi Desert", 43.5, 104.0, "desert"), ("Negev, Israel", 30.6, 34.9, "desert"), ("Tibesti, Chad", 21.0, 17.5, "volcanic"),
 ("Danakil Depression, Ethiopia", 14.2, 40.3, "volcanic"), ("Mauna Kea, Hawaii", 19.8, -155.5, "volcanic"), ("Mount Etna, Italy", 37.75, 15.0, "volcanic"),
 ("Askja, Iceland", 65.0, -16.7, "volcanic"), ("Craters of the Moon, Idaho", 43.2, -113.5, "volcanic"), ("Lanzarote, Spain", 29.0, -13.6, "volcanic"), ("Teide, Tenerife", 28.27, -16.64, "volcanic"),
 ("Svalbard", 78.2, 15.6, "polar"), ("Haughton crater, Devon Island", 75.4, -89.7, "polar"), ("McMurdo Dry Valleys, Antarctica", -77.6, 162.5, "polar"), ("Tibetan Plateau", 33.5, 80.0, "mountain"),
 ("Salar de Uyuni, Bolivia", -20.2, -67.5, "desert"), ("Patagonian Andes", -50.0, -72.0, "mountain"), ("Pilbara, Australia", -22.6, 118.7, "desert"), ("Simpson Desert, Australia", -25.5, 137.0, "desert"),
 ("Canyonlands, Utah", 38.2, -109.9, "desert"), ("Pamir Mountains", 38.5, 73.5, "mountain")]
W = os.path.join(DATA, "glo90_world"); os.makedirs(W, exist_ok=True)

def hav(a, b, c, d):
    p = math.pi / 180; x = math.sin((c - a) * p / 2) ** 2 + math.cos(a * p) * math.cos(c * p) * math.sin((d - b) * p / 2) ** 2; return 12742 * math.asin(math.sqrt(x))

def tile(lat, lon):
    la, lo = math.floor(lat), math.floor(lon)
    n = "Copernicus_DSM_COG_30_%s%02d_00_%s%03d_00_DEM" % ("N" if la >= 0 else "S", abs(la), "E" if lo >= 0 else "W", abs(lo))
    f = os.path.join(W, n + ".tif")
    if not os.path.exists(f):
        try: urllib.request.urlretrieve("https://copernicus-dem-90m.s3.eu-central-1.amazonaws.com/%s/%s.tif" % (n, n), f)
        except urllib.error.HTTPError as e: print("no tile", n, e.code); return None
    return f

out = []
for name, la, lo, kind in SITES:
    f = tile(la, lo)
    if not f: continue
    wins = []
    for lat, lon, z in t.earth_windows(f):
        if z is None or hav(la, lo, lat, lon) > 15 or (z <= 0.5).mean() >= 0.1: continue
        ft = t.window_features(z)
        if ft: wins.append({"lat": round(lat, 4), "lon": round(lon, 4), **ft})
    if len(wins) < 1: print("skip (no valid squares)", name, len(wins)); continue
    out.append({"name": name, "kind": kind, "lat": la, "lon": lo, "windows": wins}); print(name, len(wins))
json.dump(out, open(os.path.join(OUT, "world.json"), "w"), separators=(",", ":"))
print(len(out), "sites,", os.path.getsize(os.path.join(OUT, "world.json")) // 1024, "KB")
