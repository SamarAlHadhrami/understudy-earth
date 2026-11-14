# PROGRESS

## RESUME HERE
- Current step: Step 5 (web app in /app). Steps 1-4 done and committed.
- Next action: write app/index.html, app/app.js, app/style.css (Leaflet, loads app/data/*.json); test headless; deploy to GitHub Pages (gh-pages branch).
- Run tests: `python -m pytest tests -q`. Rebuild data: `python pipeline/build_windows.py && python pipeline/analyse.py && python pipeline/verify.py`.
- Open problems: reference PDF only attached in chat, not on disk. Rover limit sources need primary-source confirmation (see REFERENCES). AMADEE-18 area is approximate (Marmul 18.19N 55.23E, 15 km radius), OeWF report not read.
- Latest commit: see `git log`.

## Decisions
- Repo root = project folder; raw data in `data/` (git-ignored). Added Copernicus N17/N18 E055 tiles (AWS open data) so the Marmul area is covered.
- Common baseline 500 m, 10 km windows (20x20 cells); windowed reads with area-average resampling.
- Rover limit: slope only, 17 deg (loose-sand embedding, conservative). Roughness has NO sourced limit, so it is only a distribution distance. Slider range 5-30 deg.
- Score = 100*(1 - D), D = .5*|trav diff| + .25*min(1,W1slope/5deg) + .25*min(1,W1rough/20m). S_REF and R_REF are design constants, not physical limits. Tiers: match >=90, partial 70-90, gap <70 (design constants). Sensitivity to S_REF (3/5/10) stored in results.json; the 4 hard gaps persist at 3 and 5, 2 at 10.
- Sea windows (>=10% cells at <=0.5 m) are dropped.
- Moon Shackleton coordinate is approximate (lands on rim/wall); labelled so.

## Results (2026-11-14)
- 627 Earth windows (Muscat 57, Dhofar 396 incl. Marmul, Meteor Crater 99, Atacama 110 minus sea), 17 targets (6 Moon, 11 Mars).
- Gate: second method (integer block means + Sobel, native reads) agreed on 17 of 17 windows (tolerance max(0.3 deg, 25%)).
- Gap (rover, 17 deg): Oman-only 8 match / 5 partial / 4 gap. With Meteor Crater + Atacama tiles: 12 / 1 / 4. Atacama lifts Nobile, Cabeus, Gale mound, Melas Chasma from partial to match. Still gaps with everything we hold: Shackleton rim/wall, Malapert, Faustini, Gale mound south flank.
- Blind test (scoring sees only histograms): AMADEE-18 area ranks top 37% by best Mars target, top 10% by mean over Mars targets; Meteor Crater 48% / 52%; Atacama tile median 68% / 70%. Caveat: 456 of 627 windows score 90+ against some Mars target because many Mars targets are flat plains, so the test discriminates weakly. Reported as is.

## Steps
1 first score: done | 2 gate: passed | 3 blind test: done | 4 gap map: done | 5 web app: todo | 6 demo+submission text: todo | 7 extras: todo
