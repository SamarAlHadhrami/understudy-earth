# PROGRESS

## RESUME HERE
- Current state (2026-11-14): core frozen. Round 3 done: research doc, label fixes, cited rover references (observed, not limits), AMADEE-18 needs recorded in docs/VALIDATION.md, calm no-candidate state, 64 px twin pictures, month notes, typed sentence box, baseline + stability tabs, calendar + two-site plan, demo bar, WorldCover flag. Not built: Jezero 30 m, whole-Oman 90 m, access, click-on-Mars, world view, rocks/dust, geology notes, Meteomatics.
- Deploy: `git subtree push --prefix app origin gh-pages`; owner must enable Pages (Settings > Pages > gh-pages / root). Link: https://samaralhadhrami.github.io/understudy-earth/
- Tests: `python -m pytest tests -q`, `node tests/check_js_score.js`, `node tests/check_needs.js`, `PYTHONIOENCODING=utf-8 python tests/run_browser.py`.
- Rebuild data: `python pipeline/build_windows.py && python pipeline/analyse.py && python pipeline/verify.py && python pipeline/power.py`.
- Open problems: AMADEE-18 site approximate (Marmul); reference PDF not on disk; ready-made test numbers are our assumptions.
- Bug fixed: .gitignore `data/` also ignored app/data, so the first deploy had no data files. Now `/data/` only.

## Decisions
- Repo root = project folder; raw data in `data/` (git-ignored). Added Copernicus N17/N18 E055 tiles (AWS open data) so the Marmul area is covered.
- Common baseline 500 m, 10 km windows (20x20 cells); windowed reads with area-average resampling.
- Rover limit: slope only, 17 deg (loose-sand embedding, conservative). Roughness has NO sourced limit, so it is only a distribution distance. Slider range 5-30 deg.
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
