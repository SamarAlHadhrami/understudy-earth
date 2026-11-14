# REFERENCES
## NASA data (core)
- LOLA LDEM/LDSM_80S_80MPP_ADJ, NASA/GSFC PGDA, pgda.gsfc.nasa.gov/products/90.
- MGS MOLA DEM 463 m global mosaic, NASA/USGS Astropedia.
- NASA POWER (Prediction Of Worldwide Energy Resources), monthly and annual climatology API v2.10.1, power.larc.nasa.gov, community RE, endpoint /api/temporal/climatology/point, parameters T2M, T2M_MAX, T2M_MIN, WS2M, RH2M, PRECTOTCORR, ALLSKY_SFC_SW_DWN, 25-year climatology Jan 2001 to Dec 2025, accessed 2026-11-14. Temperature, wind and humidity (MERRA-2 based) on about 0.5 x 0.625 degree cells (about 50 km); solar (CERES SYN1deg based) on about 1 degree cells (about 110 km), per power.larc.nasa.gov/docs/methodology/data/sources/ (seen in a search excerpt; one POWER FAQ gives half-degree for some solar products). Values are regional and approximate.
## Partner and other data
- Copernicus DEM GLO-30, ESA, via AWS open data (copernicus-dem-30m). ESA partner data.
- ESA WorldCover 10 m 2021 v200, ESA / VITO, CC BY 4.0 (AWS registry listing), bucket esa-worldcover, anonymous HTTP reads, no login. Windowed reads of cloud-optimised tiles over HTTPS. Derived tree/crop/built-up shares per square are shown with the credit "Contains ESA WorldCover data, CC BY 4.0". Licence taken from the AWS Open Data registry listing; full licence text not reopened.
- AMADEE-18: Austrian Space Forum, oewf.org/en/amadee-18 (opened 2026-11-14): February 2018, four weeks, Dhofar; expected February temperatures 16-27 C, under 10 mm precipitation; no numeric test limits.
- Mars 2020 TRN HiRISE DTM mosaic of Jezero, USGS Astrogeology, 2020 (downloaded, not used in current results).
## Rover limit benchmarks (confirm against primary sources before final)
- Curiosity and Perseverance designed for about 30 deg slopes; Perseverance Jezero exit climbed more than 20 deg: NASA JPL news, "NASA's Perseverance Rover Looks Back While Climbing Slippery Slope", nasa.gov.
- Curiosity maximum tilt 25.34 degrees (sol 2477) and maximum pitch 25.22 degrees (sol 2476) through sol 2488: Rankin, Maimone, Biesiadecki, Patel, Levine, Toupet, "Driving Curiosity: Mars Rover Mobility Trends During the First Seven Years", JPL, 2019 (robotics.jpl.nasa.gov/media/documents/2020-mobility-trending.pdf), Table 1. Observed peaks, not limits.
- Opportunity tilt reached 32 degrees on 2016-03-10, the steepest slope driven by any Mars rover: NASA JPL news, "Rover Takes on Steepest Slope Ever Tried on Mars", 2016-03-31, jpl.nasa.gov.
- Perseverance climbed a slope of about 20 degrees on slippery sand and dust, covering only about 50% (once 20%) of the planned distance: NASA JPL news, "NASA's Perseverance Rover Looks Back While Climbing Slippery Slope", 2024-10-28, jpl.nasa.gov.
- No official safe-driving slope limit was found or used. The slope limit in the app is user-set. The older 17/22/28 degree values were removed because the study was not opened.
## Test needs
- Ready-made test numbers (rover, instrument, walking, cold) and the fade margins are OUR ASSUMPTIONS, not sourced requirements.
## Background
- AMADEE-18, Austrian Space Forum (OeWF), oewf.org/en/amadee-18: field simulation in the Dhofar region of Oman, February 2018. Exact site not confirmed; Marmul area (18.19 N, 55.23 E, Global Energy Monitor) used as approximate centre.
## Libraries
numpy, scipy, rasterio, pyproj, Playwright (testing), Leaflet 1.9.4; basemap tiles (c) OpenStreetMap contributors.
## Research notes (not used as data)
- Candidate extra factors with access and licence status: docs/EXTRA_FACTORS_RESEARCH.md (terms checked or marked UNVERIFIED there). No data from those candidates is published.
- Marlow, Martins and Sephton (2010) review of Mars analogue sites, Astrobiology (seen in search results only); InSight landing-site assessment, PMC7507760 (excerpt only); NHSJS 2026 "Finding Earth's Best Testbeds for Moon and Mars Rovers" (excerpt only).
