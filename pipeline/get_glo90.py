"""Download Copernicus GLO-90 COG tiles (AWS open data bucket copernicus-dem-90m, no login) for 16.5-26.5 N, 52-60 E into data/glo90 (git-ignored)."""
import os, sys, urllib.request, urllib.error
OUT = os.path.join(os.path.dirname(__file__), "..", "data", "glo90")
os.makedirs(OUT, exist_ok=True)
n = 0
for lat in range(16, 27):
    for lon in range(52, 60):
        name = "Copernicus_DSM_COG_30_N%02d_00_E%03d_00_DEM" % (lat, lon)
        dst = os.path.join(OUT, name + ".tif")
        if os.path.exists(dst): continue
        url = "https://copernicus-dem-90m.s3.eu-central-1.amazonaws.com/%s/%s.tif" % (name, name)
        try:
            urllib.request.urlretrieve(url, dst + ".part"); os.replace(dst + ".part", dst); n += 1
        except urllib.error.HTTPError as e:
            print("skip", name, e.code)
print("downloaded", n, "tiles")
