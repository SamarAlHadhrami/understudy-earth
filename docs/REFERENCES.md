# References

Every data source, library and tool, one line each. Values we show are derived (terrain numbers, climate cells, distances); raw files are not published.

## Space and Earth data
- **LOLA 80 m south-pole elevation** (LDEM_80S_80MPP_ADJ), NASA/GSFC PGDA. NASA data; credit given. Also used for the 80 N to 90 N north-pole grid.
- **MOLA 463 m Mars elevation**, NASA MGS / USGS Astropedia. NASA data; credit given.
- **NASA POWER** monthly climatology, API v2.10.1, power.larc.nasa.gov (temperature, wind, humidity, solar, skin temperature; 2001 to 2025; accessed 2026-11-14). Temperature, wind and humidity are on about 50 km cells, solar on about 110 km cells; values are regional.
- **Copernicus DEM GLO-30 and GLO-90**, ESA, via AWS Open Data. Required credit: "Copernicus Digital Elevation Model (DEM) was accessed on [date] from https://registry.opendata.aws/copernicus-dem." (accessed 2026-11-14/15). The registry names no specific licence; we credit ESA / Copernicus.
- **ESA WorldCover 10 m 2021 v200**, ESA / VITO, CC BY 4.0. Credit shown: "Contains ESA WorldCover data, CC BY 4.0".
- **OpenStreetMap** roads and towns via the Overpass API, ODbL. Credit shown: "Map data (c) OpenStreetMap contributors (ODbL)". Only per-square distances are published, not road geometry.
- **Mars 2020 TRN HiRISE DTM mosaic of Jezero**, USGS Astrogeology (1 m). Only derived numbers and a small relief picture are published.
- **30 m HRSC DTM mosaic of Gale Crater**, Persaud, Putri and Muller (2021), Zenodo, doi 10.5281/zenodo.5808354, CC BY 4.0 (ESA Mars Express HRSC).
- **THEMIS thermal inertia mosaic** (100 m, 60 S to 60 N), USGS/ASU; method of Fergason et al. (2006). Context only, never scored.
- **GLiM v1.0 rock-type map**, Hartmann and Moosdorf (2012), doi 10.1029/2012GC004370, CC BY 3.0, data at PANGAEA doi 10.1594/PANGAEA.788537. 0.5 degree cells, context only.
- **NASA GIBS satellite tiles** (MODIS Terra and Aqua true colour, Blue Marble), gibs.earthdata.nasa.gov, no login. Optional layer, off by default.
- **Meteomatics Weather API**, Meteomatics AG, used under the Space Apps challenge participant access; monthly means for 12 Oman points are shown as a cross-check beside NASA POWER. Credit: "Weather data by Meteomatics (meteomatics.com), accessed via NASA Space Apps Challenge participant access." Written confirmation of display rights was not obtained separately.

## Rover slope reference points (observed values, not limits)
- Curiosity maximum tilt 25.34 degrees: Rankin et al., "Driving Curiosity: Mars Rover Mobility Trends During the First Seven Years", JPL, 2019, Table 1.
- Opportunity tilt reached 32 degrees: NASA JPL, "Rover Takes on Steepest Slope Ever Tried on Mars", 2016.
- Perseverance climbed about 20 degrees on slippery sand: NASA JPL, "NASA's Perseverance Rover Looks Back While Climbing Slippery Slope", 2024.
- No official safe-driving slope limit was found; the slope limit in the app is set by the user.

## Background
- **AMADEE-18**, Austrian Space Forum (OeWF), oewf.org/en/amadee-18: Mars field simulation in Dhofar, Oman, February 2018. The exact site is not confirmed; the Marmul area (18.19 N, 55.23 E) is used as an approximate centre.
- Geology notes: Leask, Ehlmann et al. (2021), Earth and Space Science 8, doi 10.1029/2021EA001637.
- Sanganeria (2026), NHSJS, "Finding Earth's Best Testbeds for Moon and Mars Rovers: A Quantitative Terrain Comparison": an independent image-texture study, read for context only.
- Ready-made test numbers (rover, instrument, walking, cold) and the fade margins are our assumptions, not sourced requirements.

## Tools and libraries
- Leaflet 1.9.4 (BSD-2-Clause) for the map.
- Base map: Esri World Dark Gray tiles with English labels (Esri, HERE, Garmin, FAO, NOAA, USGS, OpenStreetMap contributors); OpenStreetMap tiles are the fallback.
- Fonts, self-hosted, SIL Open Font License 1.1: IBM Plex Sans (IBM) and Space Grotesk (Florian Karsten).
- Python: numpy, scipy, rasterio, pyproj for data processing; Playwright for browser tests.
- Icons and the landing-page Moon and Mars are drawn for this project; the spheres are an illustration, not LOLA or MOLA data.

## Not built
- Moon rock abundance (LRO Diviner covers 60 S to 60 N only, so it misses the poles) and Earth MODIS land surface temperature (needs a separate login, and day-night values do not compare honestly with Moon or Mars surfaces).
