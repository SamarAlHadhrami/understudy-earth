# PROGRESS

## Prompt 3 item status table
| Item | Status | Reason |
|---|---|---|
| GCC region beyond Oman, 90 m | PARTLY | World set v2 added single 90 m reference points for UAE, Saudi Arabia, Qatar, Bahrain, Kuwait; not a full tile scan of each country. |
| Wider Middle East / North Africa | PARTLY | Same world-set mechanism: single reference points (Sahara belt, Levant, Arabian highlands), not a full regional tile scan. |
| Other arid, volcanic and polar belts | PARTLY | Single reference points added (Central Asia, SW US, Andes/Puna, East African rift, Canary/Atlantic islands, Kamchatka/Aleutians); no full tile coverage. |
| Global scan (stage d, tile-by-tile GLO-90) | SKIPPED | Time; the lighter single-point world-set expansion was done instead. |
| Pool v3 | SKIPPED | Only pool v1 (frozen, used by the app) and a pool v2 what-if (documented, not shipped as the main result) exist. |
| Earthdata: Diviner rock abundance (Moon) | SKIPPED | Confirmed from the PDS label that the retrieval is bounded to +/-60 deg latitude; genuinely no data at either lunar pole, not a judgement call. |
| Earthdata: MODIS day/night land surface temperature (Earth) | SKIPPED | AppEEARS needs its own username/password login separate from the Earthdata bearer token on hand; declined to ask for new credentials. |
| Earthdata: MERRA-2 skin temperature (Earth) | DONE | Added via NASA POWER TS_MAX/TS_MIN (already-trusted source, no new login), shown as a context row, not scored. |
| Moon global layer (beyond both poles) | SKIPPED | Only the two LOLA polar DEMs (south, now north) are held; no public product was fetched for mid-latitudes in the time available. |
| Mars Trek / Moon Trek picture layers | SKIPPED | The click panels use a static precomputed image, not a Leaflet map; adding tile layers there needs more rework than time allowed. |
| GIBS (Earth satellite picture layer) | DONE | Optional NASA EOSDIS GIBS true-colour layer on the Planner map, off by default, OSM fallback on tile error. |

## RESUME HERE
- Current state (2026-11-15, Prompt 4 revised / fix-not-remove pass): see the Prompt 3 status table above for every outstanding Prompt-3 item. This pass: rebuilt the 3D view from the real 64x64 relief grid (no invented terrain) instead of removing it; kept pool v2/90 m layer, fixed its wording so threshold-sensitive targets are never called a firm match; restored and kept Meteomatics (Space Apps partner access, re-pulled with more points before access ends, documented honestly as a note not a blocker); fixed the Diviner coverage number to the verified plus-or-minus 60 degrees; checked sources and licences; pushed. No scoring method, weight or threshold changed.
- Earlier (2026-11-15, Prompt 3 / final pass, feature freeze 16:00 Muscat): BUILT this pass — (1) Meteomatics pulled and published for 12 Oman points (owner's call to publish under the Space Apps participant grant, see REFERENCES.md), compared with NASA POWER (large, consistent disagreement: Meteomatics daily max several degrees cooler, daily min several degrees warmer than POWER), AMADEE-18 February re-checked with it (flips the verdict: February becomes a best month under Meteomatics, is not under POWER; both shown, neither forced); (2) integrity fixes — "Oman" renamed to "searched area" wherever 90 m/pool v2 data is included, a one-sentence Jezero match verdict added, a steep-ground caution on Mars/Moon click results; (3) day-night air temperature swing promoted from a context row to a real user-set, scored test need (slider, sentence-box phrase, Fit Verdict bar); (4) extra-factors research re-checked, final BUILT/CONTEXT-ROW/SKIPPED verdicts written (nothing new built there; the physics genuinely does not line up across bodies); (5) world set expanded 27 -> 45 places (GCC beyond Oman, wider MENA, other arid/volcanic/polar/mountain belts), selection rule written before scoring, in VALIDATION.md; (6) click-on-Mars extended 60S-60N -> 87S-87N with area-correct windows (longitude width scales as 1/cos(lat)); (7) optional NASA GIBS satellite picture layer on the Planner map, off by default, OSM fallback on tile error; (8) a second fine terrain model, Gale crater (30 m HRSC mosaic, CC BY 4.0), alongside Jezero in a renamed "Fine-scale checks" tab — a single-pair HiRISE Oxia Planum DTM was tried first but its footprint (about 5.5 km) was too narrow for a 10 km window, so it was discarded and Gale was used instead. NOT BUILT this pass (reasons, not just time): Moon north pole DEM (PGDA has no public 80N product at the expected path, only south pole product 90 was found; LOLA_PA global 64/128 px-per-degree product exists but is 715MB-2.7GB, too large to safely fetch and process in the time left) and the related coarse-global-Moon layer; additional fine Mars DTMs beyond Jezero (time); Mars Trek / Moon Trek picture layers (the click panels use a static precomputed image, not a Leaflet map, so adding tile layers there needs more rework than time allowed; Earth's GIBS layer was built instead since the Planner already has a real map); 3D view (left off per the existing docs/3D_FEASIBILITY.md, as planned, since everything above came first); global tile-by-tile GLO-90 scan (stage d) — the lighter single-point world-set expansion was done instead. Earlier passes (Prompt 2A/2B) remain as before: geology notes, OSM access, Jezero 30 m story, optional whole-Oman 90 m layer (pool v1 frozen; pool v2 what-if in VALIDATION.md), click-on-Moon south pole only.
- Deploy: `git subtree push --prefix app origin gh-pages`; owner must enable Pages (Settings > Pages > gh-pages / root). Link: https://samaralhadhrami.github.io/understudy-earth/
- Tests: `python -m pytest tests -q`, `node tests/check_js_score.js`, `node tests/check_needs.js`, `PYTHONIOENCODING=utf-8 python tests/run_browser.py`.
- Rebuild data: `python pipeline/build_windows.py && python pipeline/analyse.py && python pipeline/verify.py && python pipeline/power.py`.
- Open problems: AMADEE-18 site approximate (Marmul); reference PDF not on disk; ready-made test numbers are our assumptions.
- Bug fixed: .gitignore `data/` also ignored app/data, so the first deploy had no data files. Now `/data/` only.

## Decisions
- Repo root = project folder; raw data in `data/` (git-ignored). Added Copernicus N17/N18 E055 tiles (AWS open data) so the Marmul area is covered.
- Common baseline 500 m, 10 km windows (20x20 cells); windowed reads with area-average resampling.
- Rover slope limit: user-set (default 15 deg, slider 5-30); cited rover values are observed peaks, not limits (see REFERENCES). Roughness has no sourced limit, so it is only a distribution distance.
- (SUPERSEDED by rank-based similarity, see TRD) Score = 100*(1 - D), D = .5*|trav diff| + .25*min(1,W1slope/5deg) + .25*min(1,W1rough/20m). S_REF and R_REF are design constants, not physical limits. Tiers: match >=90, partial 70-90, gap <70 (design constants). Sensitivity to S_REF (3/5/10) stored in results.json; the 4 hard gaps persist at 3 and 5, 2 at 10.
- Sea windows (>=10% cells at <=0.5 m) are dropped.
- Moon Shackleton coordinate is approximate (lands on rim/wall); labelled so.

## Results (2026-11-14)
- 627 Earth windows (Muscat 57, Dhofar 396 incl. Marmul, Meteor Crater 99, Atacama 110 minus sea), 17 targets (6 Moon, 11 Mars).
- Gate: second method (integer block means + Sobel, native reads) agreed on 17 of 17 windows (tolerance max(0.3 deg, 25%)).
- Gap (rover, 17 deg): Oman-only 8 match / 5 partial / 4 gap. With Meteor Crater + Atacama tiles: 12 / 1 / 4. Atacama lifts Nobile, Cabeus, Gale mound, Melas Chasma from partial to match. Still gaps with everything we hold: Shackleton rim/wall, Malapert, Faustini, Gale mound south flank.
- Blind test (scoring sees only histograms): AMADEE-18 area ranks top 37% by best Mars target, top 10% by mean over Mars targets; Meteor Crater 48% / 52%; Atacama tile median 68% / 70%. Caveat: 456 of 627 windows score 90+ against some Mars target because many Mars targets are flat plains, so the test discriminates weakly. Reported as is.

## Steps
1 first score: done | 2 gate: passed | 3 blind test: done | 4 gap map: done | 5 web app: done (Pages not yet enabled) | 6 demo+submission text: done | 7 extras: not started (NASA Earth temperature needs Earthdata login; walking/landing need sourced limits; click-on-Mars, world view, thermal inertia still open). Jezero HiRISE not used yet.

## Update (2026-11-14, where-and-when core)
- Terrain: rank-based similarity (6 scaled terms); gap judged against Earth-pair distances (best window always ranks first, so rank alone cannot define a gap). Oman alone 4 match / 4 partial / 9 gap; with check sites 7 / 5 / 5.
- Blind test: AMADEE-18 area top 10.7% (mean over Mars targets) / 24.0% (best target); Meteor Crater 4.5% / 22.4%; Atacama tile 50.6% / 24.9%.
- NASA POWER: 30 cells cached; tests check units, ordering and raw-cache equality.
- AMADEE-18 replay (assumed needs: day max <= 35 C, night min >= 5 C, sun >= 4): planner best months Jan and Dec; Feb scores 80 (good, not top). Real phase Feb 2018 (OeWF).
- Public link verified live (418 squares render): https://samaralhadhrami.github.io/understudy-earth/
