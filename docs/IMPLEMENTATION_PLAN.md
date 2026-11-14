# IMPLEMENTATION PLAN (status, 2026-11-14)
Core stages 0-4 done. Fit Verdict and twin pictures done earlier.
This round: A research doc (docs/EXTRA_FACTORS_RESEARCH.md); B1 labels, B2 cited rover slopes (observed references only), B3 AMADEE-18 needs recorded first (docs/VALIDATION.md), B4 opening screen and no-candidate state, B5 64 x 64 twin pictures, B6 month notes, B7 typed sentence box, B8 baseline, B9 stability, B10 two-site plan, B11 demo bar, B12 calendar, B13 land-cover flag, B14 docs: done.
Prompt 2A: geology notes (done), access factor (done), Jezero at 30 m (done, one window), whole-Oman 90 m (done as an optional layer, off by default; pool v2 what-if in VALIDATION.md), Meteomatics (script written; terms do not clearly allow publishing; not run, no credentials).
Prompt 2B: click on Mars and lunar south pole (done), world set of 27 chosen places as dots (done; stages b and c not built), day-night swing as a context row (done), rock/dust proxy (not built, reasons in REFERENCES), 3D view (note only: docs/3D_FEASIBILITY.md).
Tests: `python -m pytest tests -q`, `node tests/check_js_score.js`, `node tests/check_needs.js`, `python tests/run_browser.py`.
