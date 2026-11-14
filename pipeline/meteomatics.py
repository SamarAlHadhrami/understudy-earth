"""PRIVATE cross-check against the Meteomatics Weather API. Run on the owner's laptop only, never from the browser.
Credentials come from the environment variables METEOMATICS_USER and METEOMATICS_PASSWORD (never stored in the repo or in logs).
Every response is saved raw in data/meteomatics (git-ignored) so the work survives if access ends. Monthly means go to
data/meteomatics_monthly.json (git-ignored) and a comparison with NASA POWER to data/meteomatics_compare.txt (git-ignored).
Nothing from this script is read by the app or committed: the terms do not clearly allow publishing derived values (docs/REFERENCES.md).
Request pattern (verified in the getting-started page): api.meteomatics.com/<start>--<end>:<step>/<parameters>/<lat,lon>/json.
Parameter names other than t_2m:C, wind_speed_10m:ms and precip_1h:mm are UNVERIFIED; failures are printed and the run continues."""
import base64, calendar, json, os, sys, time, urllib.request, urllib.error
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW = os.path.join(ROOT, "data", "meteomatics"); os.makedirs(RAW, exist_ok=True)
POINTS = {"amadee_marmul": (18.19, 55.23), "salalah": (17.02, 54.09), "thumrait": (17.67, 54.03), "muscat": (23.59, 58.41),
          "samail": (23.30, 57.99), "nizwa": (22.93, 57.53), "sur": (22.57, 59.53), "duqm": (19.66, 57.71), "sohar": (24.35, 56.71),
          "mahout": (20.42, 58.88), "ibri": (23.22, 56.52), "khasab": (26.18, 56.25)}
# (name, parameter): daily values where possible. UNVERIFIED names are tried and skipped if the API refuses them.
PARAMS = ["t_max_2m_24h:C", "t_min_2m_24h:C", "wind_speed_10m:ms", "relative_humidity_2m:p", "global_rad_24h:kWh", "precip_24h:mm"]
YEARS = list(range(2015, 2025))

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
    json.dump({"saved": time.strftime("%Y-%m-%d"), "monthly": monthly}, open(os.path.join(ROOT, "data", "meteomatics_monthly.json"), "w"))
    print("saved monthly values for", len(monthly), "points (local only)")
    return 0

if __name__ == "__main__":
    sys.exit(main())
