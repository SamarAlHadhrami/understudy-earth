# REFERENCES
## NASA data (core)
- LOLA LDEM/LDSM_80S_80MPP_ADJ, NASA/GSFC PGDA, pgda.gsfc.nasa.gov/products/90.
- MGS MOLA DEM 463 m global mosaic, NASA/USGS Astropedia.
- NASA POWER (Prediction Of Worldwide Energy Resources), monthly and annual climatology API v2.10.1, power.larc.nasa.gov, community RE, endpoint /api/temporal/climatology/point, parameters T2M, T2M_MAX, T2M_MIN, WS2M, RH2M, PRECTOTCORR, ALLSKY_SFC_SW_DWN, 25-year climatology Jan 2001 to Dec 2025, accessed 2026-11-14. Native cells about 0.5 x 0.625 degrees (about 50 km), so values are regional.
## Partner and other data
- Copernicus DEM GLO-30, ESA, via AWS open data (copernicus-dem-30m). ESA partner data.
- WorldClim 2.1 monthly climate, 2.5 arc-minute, 1970-2000 average: Fick, S.E. and Hijmans, R.J. (2017), WorldClim 2: new 1-km spatial resolution climate surfaces for global land areas, International Journal of Climatology 37(12), 4302-4315. Licence (worldclim.org/about.html, checked 2026-11-14): "freely available for academic use and other non-commercial use. Redistribution or commercial use is not allowed without prior permission." Derived per-window values are therefore kept local and NOT published; the public app uses NASA POWER. Permission would be needed to publish them.
- Mars 2020 TRN HiRISE DTM mosaic of Jezero, USGS Astrogeology, 2020 (downloaded, not used in current results).
## Rover limit benchmarks (confirm against primary sources before final)
- Curiosity and Perseverance designed for about 30 deg slopes; Perseverance Jezero exit climbed more than 20 deg: NASA JPL news, "NASA's Perseverance Rover Looks Back While Climbing Slippery Slope", nasa.gov.
- Mars-weight test vehicle traction (22 deg firm bedrock, 28 deg cohesive soil, embedding near 17 deg in loose sand): "Traverse Performance Characterization for the Mars Science Laboratory Rover", Journal of Field Robotics.
## Test needs
- Ready-made test numbers (rover, instrument, walking, cold) and the fade margins are OUR ASSUMPTIONS, not sourced requirements.
## Background
- AMADEE-18, Austrian Space Forum (OeWF), oewf.org/en/amadee-18: field simulation in the Dhofar region of Oman, February 2018. Exact site not confirmed; Marmul area (18.19 N, 55.23 E, Global Energy Monitor) used as approximate centre.
## Libraries
numpy, scipy, rasterio, pyproj, Playwright (testing), Leaflet 1.9.4; basemap tiles (c) OpenStreetMap contributors.
