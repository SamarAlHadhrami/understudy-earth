# Submission text (edit before pasting; fill the two links)

**Project name:** Understudy Earth

**Demo link (video, 30 s max, public):** <add after recording>
**Project link (public):** <GitHub Pages link> and https://github.com/SamarAlHadhrami/understudy-earth

**High-level summary:**
Understudy Earth scores 10 km windows of Earth terrain (Oman and two check sites) against real Moon and Mars terrain for a chosen task (rover driving), using elevation data at one shared 500 m scale. It shows where Earth matches (MATCH), partly matches (PARTIAL) or has nothing good enough (GAP), and whether adding a second site closes a gap. A blind test and an independent second calculation check the method, and every result lists what Earth cannot copy. It helps mission planners choose practice sites with numbers, starting with Oman, which hosted the AMADEE-18 Mars analog mission in Dhofar in 2018.

**Detailed description:**
What it does: pick a Moon or Mars target and a rover slope limit; the map recolours live. Result cards give a 0-100 score and the reasons (drivable share, slope, roughness, relief). A gap view lists all targets with Oman alone vs Oman plus check sites. How it works: Copernicus GLO-30, LOLA south-pole and MOLA global elevation are averaged to 500 m cells, cut into 10 km windows, and each window gets slope and roughness histograms. Score = 100 x (1 - D), with D = 50% difference in drivable share + 25% slope-distribution distance + 25% roughness-distribution distance. Results (rover, 17 deg limit): 627 Earth windows, 17 targets; Oman alone gives 8 MATCH, 5 PARTIAL, 4 GAP; with the Arizona and Atacama tiles 12 / 1 / 4. Four targets (Shackleton rim/wall, Malapert, Faustini, Gale mound south flank) stay GAP: nothing we hold matches. Blind test: AMADEE-18 area ranks top 10% on average over Mars targets but only top 37% on the best single target; the test discriminates weakly because many Mars targets are flat. Second check: independent slope calculation agreed on 17 of 17 windows. Tools: Python (numpy, scipy, rasterio, pyproj), JavaScript, Leaflet, GitHub Pages.
Limits: 500 m cells hide rocks and steps; rover slope limits are rover-scale benchmarks from published tests, so a pass is necessary, not sufficient; Earth data is a surface model; Moon data covers 80S-90S only; Oman coverage is only the tiles we hold; terrain match is not a geology match; no match for gravity, air or radiation.

**NASA data used:** LRO LOLA south-pole elevation and slope products (LDEM_80S_80MPP_ADJ, LDSM_80S_80MPP_ADJ; NASA/GSFC); Mars Global Surveyor MOLA 463 m global DEM (NASA/USGS).
(The Jezero HiRISE DTM was downloaded but is not used in the current results; do not list it as used.)

**Space Agency partner data and references:** Copernicus DEM GLO-30 (ESA, via AWS open data). Libraries: numpy, scipy, rasterio, pyproj, Playwright (testing), Leaflet. Basemap (c) OpenStreetMap contributors. Rover limit benchmarks: see docs/REFERENCES.md. AMADEE-18: Austrian Space Forum (OeWF).

**Use of AI (SI) - draft, edit before use:**
The project idea and its direction were chosen by me. I used AI tools for research, checking sources, help writing and debugging code, and help with text. AI-assisted code and text are described in the repository README. No AI-made images or videos are used.
