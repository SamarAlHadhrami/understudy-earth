# TRD

**Stack.** Python (numpy, scipy, rasterio, pyproj) precomputes; static HTML/JS + Leaflet; GitHub Pages. No server, no API key, no AI at runtime.

**Data (raw in data/, git-ignored).** Copernicus GLO-30 tiles (Oman: N23E058, N17/N18 E054/E055; checks: N35W112, S25W070); LOLA LDEM/LDSM 80 m south pole; MOLA 463 m; NASA POWER monthly climatology (cached in data/power_cache).

## Terrain similarity
1. Each 10 km window is area-averaged to 500 m cells (windowed reads, `Resampling.average`). Slope by central differences; roughness = deviation from 3x3 mean, at 500 m and at 1 km (2x2 block mean); relief; steep share (>10 deg); 2D slope x roughness histogram.
2. Distance D = mean of six terms, each divided by its spread (std) across all Earth windows: W1 distance of slope distributions, |difference of 90th percentile slope|, |steep share|, |log roughness 500 m|, |log roughness 1 km|, |log relief|.
3. Map colouring: rank of each window among all Earth windows for the target (top 5% match, 5-20% partial, rest weak).
4. Target gap (absolute): best-window distance compared with distances between random pairs of Earth windows: below their 5th percentile = MATCH, below 20th = PARTIAL, else NO QUALIFYING CANDIDATE in the searched area (internally "gap"). This avoids the trap that the best window always ranks first.
5. Separate line "share of cells below the chosen slope": the limit is user-set (slider 5-30, default 15). It is not a safe driving limit; observed rover reference points are shown with citations (REFERENCES.md).
6. Name-free check (a sanity check, not validation): scorer sees only numbers; known sites looked up afterwards. Leave-one-term-out sensitivity in results.json.
7. Second method: slope recomputed with integer block means + Sobel on native reads for 17 windows (tolerance max(0.3 deg, 25%)).

## Climate and "when"
- Per window the nearest NASA POWER cell (0.5 x 0.625 deg, about 50 km): T2M_MAX, T2M_MIN, WS2M, RH2M, ALLSKY_SFC_SW_DWN (monthly climatology 2001-2025). Regional values only.
- Month fit = 100 x (1 - worst penalty) over: day max above the window, night min below it, wind outside range, humidity above limit, sunlight below minimum. Fade margins (5 C, 1.5 m/s, 15 points, 1 kWh) are our assumptions. Tier: 75+ good, 50+ partial.
- Best months: within 90% of the best fit and at least 50, at most 3.
- Where+when colour = worse of terrain tier and best-month tier.


## Known limits
500 m cells hide rocks and steps; rover limit is rover-scale; DSM vs bare ground; Moon south pole only; Oman = tiles we hold; climate is a typical-year average on coarse cells; ready-made test numbers are our assumptions.
- NASA POWER values are regional and approximate (about 50 km cells); the strip and Fit Verdict use POWER only.

## Fit Verdict (extra 1)
Factors, each 0-100: terrain (100 at or inside the match distance, 0 at twice the partial distance, linear between), temperature, wind, dryness, sunlight (month fit split by factor, using the best month or the chosen month; margins are our assumptions). Overall = weighted mean of factors with weight above 0 (user weights 0-3, default 1). Verdict: 75+ Strong fit, 50-74 Good with gaps, below 50 Poor fit. The weakest factor gives the "what would improve it" line. Confidence: Medium for squares inside the 30 m Oman tiles with a firm site, Low for outside sites or approximate sites; never High, because climate cells are about 50 km. Tests: tests/check_needs.js.

## Round 3 additions (method unchanged)
- Climate grids: NASA POWER temperature, wind and humidity about 0.5 x 0.625 deg (about 50 km); solar about 1 deg (about 110 km).
- Baseline check (pipeline/baseline.py): per target, a known site's median rank among all squares vs 100 random draws of the same size. Retrospective.
- Stability check (pipeline/stability.py): window 5/10/20 km, cell 500 m/1 km, thresholds 5-20% vs 10-30%; "threshold-sensitive" when the tier changes.
- Land cover (pipeline/landcover.py): ESA WorldCover 2021 v200 10 m read by HTTP windows; squares with 10% or more tree, crop or built-up are flagged and hidden by default from best-square choices; ranks are not changed. pipeline/mask_check.py shows no tier changes.
- Twin pictures (pipeline/relief.py): 64 x 64 grid per 10 km window (156 m per pixel); Earth and Moon area-averaged, Mars bilinear upsampling; sun 315/45 deg, 3x exaggeration.
- Fit score is a user-weighted soft score, not similarity and not a success chance.

## Prompt 2A additions (method unchanged)
- Access (pipeline/access.py): nearest vertex of OpenStreetMap paved/main roads and nearest place=city/town node, great-circle distance from the square centre via a KD-tree on unit-sphere coordinates (vertex spacing makes the error well below 1 km). Access fit in the Fit Verdict = 100 within 5 km of a paved or main road, 0 at 50 km or more (our assumption); default weight 0.
- Jezero (pipeline/jezero.py): strip reads, NaN-aware block means (cells with more than 5% empty stay empty), the same terrain features at 500 m, plus a separate 30 m-baseline check (slope p50/p90, steep share, log roughness, scaled by Earth spreads).
- Whole Oman (pipeline/get_glo90.py, build_oman90.py, pool_v2.py): GLO-90 tiles averaged to 500 m cells; the 30 m squares are kept where they exist; pool v1 stays frozen for the app, pool v2 is reported in docs/VALIDATION.md.
- Meteomatics (pipeline/meteomatics.py): private cross-check, credentials from environment variables, raw responses saved under data/meteomatics, nothing read by the app.
