# BACKEND SCHEMA (static files in app/data)
- `earth.json`: per 10 km window {id, group, lat, lon, hist (slope x roughness counts), slope_p50, slope_p90, steep_share, rough_med, rough1k_med, relief_m}.
- `targets.json`: same fields for Moon/Mars targets plus body, name.
- `meta.json`: bin edges, term scales, rank cut-offs, thr_match_dist, thr_partial_dist, rover task limit and source.
- `results.json`: gap table, blind test, leave-one-out sensitivity, scales.
- `second_check.json`: independent slope check rows.
- `climate_power.json`: {cells: {key: {lat, lon, T2M, T2M_MAX, T2M_MIN, WS2M, RH2M, PRECTOTCORR, ALLSKY_SFC_SW_DWN (12 months each)}}, win: {window id: cell key}, source, accessed}.
All files together are under 1 MB.
