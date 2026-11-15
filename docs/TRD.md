# Technical requirements: Understudy Earth

## Architecture
Python scripts in `pipeline/` precompute terrain numbers into `app/data/`. The app in `app/` is static HTML, CSS and JavaScript with Leaflet, hosted on GitHub Pages. There is no server, no API key and no AI at runtime. Raw source files stay in `data/` and are not in the repo.

## Data
Copernicus DEM (GLO-30 for Oman and check sites, GLO-90 for the wider layer and world set), LOLA (Moon poles), MOLA (Mars), NASA POWER climatology, ESA WorldCover, OpenStreetMap roads, HiRISE and HRSC mosaics, THEMIS, GLiM. Sources are listed in REFERENCES.md.

## Method
1. Each 10 km window is area-averaged to 500 m cells. Features: slope distribution, 90th-percentile slope, steep share, roughness at 500 m and 1 km, and relief.
2. Terrain distance is the mean of six terms, each divided by its spread across all Earth windows.
3. Map colour is the window's rank for the chosen target: top 5% match, 5 to 20% partial, the rest weak.
4. Gap test: the best distance is compared with distances between random pairs of Earth windows. Below their 5th percentile is a match, below the 20th is partial, otherwise "no qualifying candidate".
5. Months: each window uses the nearest NASA POWER cell. Month fit is 100 minus the worst penalty for temperature, wind, humidity and sunlight, with fade margins that are our assumptions. Best months are within 90% of the best, at most three.
6. Where and when colour is the worse of the terrain tier and the best-month tier.

## Scoring
The Fit Verdict is a user-weighted mean of terrain, temperature, wind, dryness and sunlight (weights 0 to 3; access is available at weight 0 by default). It is a soft score, not a success chance. Surface material is shown but not scored. The scorer is written twice, in Python and JavaScript, and the two must agree.

## Tests
- `pytest`: scoring, terrain, POWER and check logic.
- `tests/check_js_score.js`: JavaScript matches Python for all 17 targets. `tests/check_needs.js`: needs logic.
- `tests/run_browser.py` and `tests/examples_check.py`: Playwright runs at desktop and phone width with a no-console-errors check.
- Checks: baseline, stability, land-cover mask and a second slope method, described in VALIDATION.md.
