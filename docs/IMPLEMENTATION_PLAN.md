# IMPLEMENTATION PLAN (status, 2026-11-14)
Core stages 0-4 done and tested. Extras round 2 (NASA POWER is the only climate source):
1 Fit Verdict card: done, tested (tests/check_needs.js, browser run).
2 Twin pictures: done (pipeline/relief.py -> app/data/relief.json, drawn in the browser; 500 m common cells).
3 Jezero at 30 m, 4 whole-Oman 90 m, 5 access (OpenStreetMap), 6 click anywhere on Mars, 7 world view, 8 rocks/dust proxy, 9 geology notes: NOT started. 10 Meteomatics: skipped (no credentials).
Tests: `python -m pytest tests -q`, `node tests/check_js_score.js`, `node tests/check_needs.js`, `python tests/run_browser.py`.
