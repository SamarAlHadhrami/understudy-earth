"""Cross-check against the Meteomatics Weather API, pulled under the free access Meteomatics grants to
NASA Space Apps Challenge participants (challenge page, sign-up form; see docs/REFERENCES.md for the exact wording and
the owner's decision on publishing). Run on the owner's laptop only, never from the browser.
Credentials come from the environment variables METEOMATICS_USER and METEOMATICS_PASSWORD (never stored in the repo or in logs).
Every raw response is saved in data/meteomatics (git-ignored) so the work survives if access ends. Monthly means go to
data/meteomatics_monthly.json (git-ignored, full detail) AND a small public derived file app/data/meteomatics.json
(point, month, variable, value, unit, pull date) that the app may show with attribution.
Request pattern (verified in the getting-started page): api.meteomatics.com/<start>--<end>:<step>/<parameters>/<lat,lon>/json.
Parameter names verified against the live API on 2026-11-15 (see docs/REFERENCES.md); global_rad_24h:kWh was refused (404)
and replaced with sunshine_duration_24h:min, which the API accepted."""
import base64, calendar, json, os, sys, time, urllib.request, urllib.error, datetime
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "data", "meteomatics"); os.makedirs(RAW, exist_ok=True)
POINTS = {"amadee_marmul": (18.19, 55.23), "salalah": (17.02, 54.09), "thumrait": (17.67, 54.03), "muscat": (23.59, 58.41),
          "samail": (23.30, 57.99), "nizwa": (22.93, 57.53), "sur": (22.57, 59.53), "duqm": (19.66, 57.71), "sohar": (24.35, 56.71),
          "mahout": (20.42, 58.88), "ibri": (23.22, 56.52), "khasab": (26.18, 56.25)}
# Verified live against the API on 2026-11-15 (see docs/REFERENCES.md).
PARAMS = ["t_max_2m_24h:C", "t_min_2m_24h:C", "wind_speed_10m:ms", "relative_humidity_2m:p", "sunshine_duration_24h:min", "precip_24h:mm"]
UNITS = {"t_max_2m_24h:C": "C", "t_min_2m_24h:C": "C", "wind_speed_10m:ms": "m/s", "relative_humidity_2m:p": "%",
         "sunshine_duration_24h:min": "min/day", "precip_24h:mm": "mm/day"}
YEARS = list(range(2019, 2025))

def get(url, user, pw):
    req = urllib.request.Request(url, headers={"Authorization": "Basic " + base64.b64encode((user + ":" + pw).encode()).decode()})
    with urllib.request.urlopen(req, timeout=120) as r: return json.load(r)

def main():
    user, pw = os.environ.get("METEOMATICS_USER"), os.environ.get("METEOMATICS_PASSWORD")
    if not user or not pw:
        print("Set METEOMATICS_USER and METEOMATICS_PASSWORD in your own shell first (see docs/REFERENCES.md). Nothing was called."); return 1
    monthly = {}
    for name, (lat, lon) in POINTS.items():
        for par in PARAMS:
            f = os.path.join(RAW, "%s__%s.json" % (name, par.replace(":", "_")))
            if os.path.exists(f): continue
            rows = {}
            for y in YEARS:
                url = "https://api.meteomatics.com/%d-01-01T00:00:00Z--%d-12-31T00:00:00Z:P1D/%s/%s,%s/json" % (y, y, par, lat, lon)
                try:
                    d = get(url, user, pw); rows[y] = d
                except urllib.error.HTTPError as e:
                    print("skip", name, par, y, e.code); break      # parameter refused or limit reached: do not hammer the API
                except Exception as e:
                    print("error", name, par, y, type(e).__name__); break
                time.sleep(0.3)
            if rows: json.dump(rows, open(f, "w"))
    # monthly means from the saved raw files
    for fn in os.listdir(RAW):
        name, par = fn[:-5].split("__")
        d = json.load(open(os.path.join(RAW, fn))); acc = {m: [] for m in range(12)}
        for y, resp in d.items():
            try:
                for r in resp["data"][0]["coordinates"][0]["dates"]:
                    acc[int(r["date"][5:7]) - 1].append(r["value"])
            except Exception: pass
        monthly.setdefault(name, {})[par] = [round(sum(v) / len(v), 2) if v else None for v in acc.values()]
    today = time.strftime("%Y-%m-%d")
    json.dump({"saved": today, "monthly": monthly}, open(os.path.join(ROOT, "data", "meteomatics_monthly.json"), "w"))
    # small public derived file for the app: only points with complete data for every tried parameter
    points_out = {}
    for name, (lat, lon) in POINTS.items():
        vals = monthly.get(name, {})
        if not vals: continue
        points_out[name] = {"lat": lat, "lon": lon, **{p: vals[p] for p in PARAMS if p in vals and vals[p]}}
    public = {
        "source": "Meteomatics Weather API, free access for NASA Space Apps Challenge 2026 participants",
        "attribution": "Weather data by Meteomatics (meteomatics.com), accessed via NASA Space Apps Challenge participant access",
        "saved": today, "years": [YEARS[0], YEARS[-1]], "units": UNITS, "points": points_out}
    json.dump(public, open(os.path.join(ROOT, "app", "data", "meteomatics.json"), "w"), separators=(",", ":"))
    print("saved monthly values for", len(monthly), "points; public file has", len(points_out), "points")
    return 0

if __name__ == "__main__":
    sys.exit(main())
