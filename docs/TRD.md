# TRD

**Stack.** Python (numpy, scipy, rasterio) precomputes; static HTML/JS + Leaflet app; GitHub Pages.

**Data (in data/, git-ignored).** Copernicus GLO-30 tiles N23E058, N17E054, N18E054, N35W112, S25W070 (30 m, EPSG:4326, DSM); LOLA LDEM/LDSM_80S_80MPP_ADJ (south polar stereographic, 80 m); MOLA 463 m global (equirectangular, int16); Jezero HiRISE 1 m DTM.

**Method.**
1. Window: 10 km square, read by windowed read with `out_shape=(20,20)` and `Resampling.average`, so every source lands on a 500 m baseline grid. Earth pixel size in metres uses cos(lat).
2. Per window: slope (deg) by central differences at 500 m spacing (interior 18x18 cells); roughness = RMS deviation of a cell from its 3x3 mean (m). Store a 2D histogram (slope bins x roughness bins) plus summary stats. Windows with more than 5% nodata are dropped.
3. Task = limits {max_slope_deg, max_rough_m, source}. Traversable share = share of cells passing both limits (from the 2D histogram).
4. Score(E,T) = 100 * (1 - D), D = 0.5*|trav_E - trav_T| + 0.25*min(1, W1_slope/Sref) + 0.25*min(1, W1_rough/Rref). W1 = 1D earth-mover distance between marginals. Sref and Rref are fixed constants in code. Recomputable in the browser from the histograms.
5. Gap: a target is red when the best Earth score is below 70 (threshold shown). Second site: best score by site group; the gap closes if adding a group lifts the best above the threshold.
6. Blind test: scoring never receives site names; afterwards ranks of known sites are reported (AMADEE-18 area, Meteor Crater, Atacama).
7. Second method: independent slope via scipy.ndimage Sobel on separately read data (different code path) for a handful of windows, with a stated tolerance.

**Memory.** Windowed reads only; Mars read per 10 km window.

**Known limits.** 500 m baseline hides rocks and steps; rover slope limits apply at metre scale, so passing at 500 m is necessary, not sufficient. DSM vs bare ground. Moon south pole only.
