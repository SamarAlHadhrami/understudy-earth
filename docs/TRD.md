# TRD

**Stack.** Python (numpy, scipy, rasterio, pyproj) precomputes; static HTML/JS + Leaflet; GitHub Pages. No server, no API key, no AI at runtime.

**Data (raw in data/, git-ignored).** Copernicus GLO-30 tiles (Oman: N23E058, N17/N18 E054/E055; checks: N35W112, S25W070); LOLA LDEM/LDSM 80 m south pole; MOLA 463 m; NASA POWER monthly climatology (cached in data/power_cache); WorldClim 2.1 2.5 arc-min (data/worldclim, local only, see licence).

## Terrain similarity
1. Each 10 km window is area-averaged to 500 m cells (windowed reads, `Resampling.average`). Slope by central differences; roughness = deviation from 3x3 mean, at 500 m and at 1 km (2x2 block mean); relief; steep share (>10 deg); 2D slope x roughness histogram.
2. Distance D = mean of six terms, each divided by its spread (std) across all Earth windows: W1 distance of slope distributions, |difference of 90th percentile slope|, |steep share|, |log roughness 500 m|, |log roughness 1 km|, |log relief|.
3. Map colouring: rank of each window among all Earth windows for the target (top 5% match, 5-20% partial, rest gap).
4. Target gap (absolute): best-window distance compared with distances between random pairs of Earth windows: below their 5th percentile = MATCH, below 20th = PARTIAL, else GAP. This avoids the trap that the best window always ranks first.
5. Separate "drivable share" line: share of cells with slope under the rover limit (17 deg, sourced; slider 5-30).
6. Blind test: scorer sees only numbers; known sites looked up afterwards. Leave-one-term-out sensitivity in results.json.
7. Second method: slope recomputed with integer block means + Sobel on native reads for 17 windows (tolerance max(0.3 deg, 25%)).

## Climate and "when"
- Per window the nearest NASA POWER cell (0.5 x 0.625 deg, about 50 km): T2M_MAX, T2M_MIN, WS2M, RH2M, ALLSKY_SFC_SW_DWN (monthly climatology 2001-2025). Regional values only.
- WorldClim 2.1 (finer, about 4.5 km, 1970-2000) drives the strip when present locally; POWER is the published climate source and the cross-check (docs/climate_crosscheck.json).
- Month fit = 100 x (1 - worst penalty) over: day max above the window, night min below it, wind outside range, humidity above limit, sunlight below minimum. Fade margins (5 C, 1.5 m/s, 15 points, 1 kWh) are our assumptions. Tier: 75+ good, 50+ partial.
- Best months: within 90% of the best fit and at least 50, at most 3.
- Where+when colour = worse of terrain tier and best-month tier.

## Known limits
500 m cells hide rocks and steps; rover limit is rover-scale; DSM vs bare ground; Moon south pole only; Oman = tiles we hold; climate is a typical-year average on coarse cells; ready-made test numbers are our assumptions.
