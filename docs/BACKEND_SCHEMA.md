# BACKEND SCHEMA (static files in app/data)
No server. JSON loaded with fetch().
- `meta.json`: baseline_m, window_km, bin edges (slope deg, roughness m), constants Sref/Rref, tasks (limits + source), threshold, limits text.
- `earth.json`: array of {id, group (oman_muscat|oman_dhofar|meteor_crater|atacama), lat, lon, hist (flat counts, slope x rough), stats}.
- `targets.json`: same shape for Moon/Mars targets plus {body, name, note}.
- `results.json`: default scores, blind test, gap results, second-method checks.
Each file should stay well under 5 MB.
