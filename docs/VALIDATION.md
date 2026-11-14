# VALIDATION (sanity checks, not proof)

All checks below are retrospective sanity checks. The method (10 km squares, 500 m cells, six-term distance, 5% / 20% pair-distance thresholds) was fixed before them. We did look at results while building, and the check sites were chosen because they are known analogs, so none of this is independent validation.

## 1. AMADEE-18 historical illustration (needs written before the replay)
Page read: Austrian Space Forum, AMADEE-18 page, https://www.oewf.org/en/amadee-18/ (opened 2026-11-14). Text used:
- "In February 2018 ... a highly international Mars analog field simulation in the Dhofar region, Oman."
- "The actual field mission took place during four weeks in February 2018."
- "The test site offers a wide range of sand and rocky surfaces combined with a broad variability in inclination."
- "The nearest major city is Salalah, expected temperatures at the test site in February typically range between 16-27 C with less than 10 mm of precipitation."
- Experiments include EVA work by analog astronauts, a mobile inflatable greenhouse, drone and rover tests, ground-penetrating radar, field spectrometry.
The page gives no numeric test limits for temperature, wind or sunlight. Needs for the replay are therefore OUR ASSUMPTIONS for outdoor crew and equipment work: day highs up to 35 C, night lows at least 5 C, sunlight at least 4 kWh/m2/day, wind and humidity not limited. These were fixed before this re-run and are the same as in the first run, so they were not adjusted to the outcome. The page's expected February range (16-27 C) is shown only as a reference.
The region is a 15 km circle around 18.19 N, 55.23 E (Marmul area). The exact AMADEE-18 site is approximate. Wording in the app: "historical illustration with assumed needs".

Result: see section 4 (filled from the app output).

## 2. Baseline check (retrospective)
`pipeline/baseline.py` -> app/data/baseline.json. For each of 17 targets, each known site's median rank among all 627 Earth squares is compared with 100 random draws of the same number of squares. Median rank over targets (lower is closer; random is about 50%):

| Site | Mars targets (11): median rank / random / targets better than random p5 | Moon targets (6) |
|---|---|---|
| AMADEE-18 area | 20.9% / 50.2% / 6 of 11 | 63.8% / 48.9% / 0 of 6 |
| Meteor Crater area | 18.0% / 49.9% / 2 of 11 | 55.0% / 51.4% / 0 of 6 |
| Atacama tile | 66.3% / 50.0% / 4 of 11 | 29.3% / 49.9% / 6 of 6 |
| Muscat area | 93.6% / 49.5% / 1 of 11 | 7.2% / 49.8% / 6 of 6 |
| Dhofar squares | 44.8% / 49.9% / 6 of 11 | 71.1% / 50.0% / 0 of 6 |

Plain reading: the Mars analog sites AMADEE-18 and Meteor Crater rank about 20% on Mars targets, better than random (about 50%), but with a wide spread and not on every target. The Atacama tile, a known Mars analog region, ranks worse than random for Mars at this window size because our tile is mostly steep Andes terrain. The Muscat mountains look like lunar south-pole terrain in this metric, which shows the metric sees roughness and slope only and says nothing about whether a site is a good Moon analog.

## 3. Stability check
`pipeline/stability.py` -> app/data/stability.json. Settings: 5, 10, 20 km windows; 500 m and 1000 m cells; match/partial thresholds at 5/20% and 10/30% of Earth-pair distances (8 combinations per target; the main method is the 10 km / 500 m / 5-20% one). Targets whose tier changes across settings are marked "threshold-sensitive" in the app. Results: 13 of 17 targets change tier in at least one setting (only Shackleton, Malapert, Gale mound south flank and Meridiani Planum are stable). Treat every tier as approximate.

## 4. Mask check
ESA WorldCover 10 m 2021 v200 (CC BY 4.0, read over HTTP). Squares with 10% or more trees, crops or buildings are flagged: 55 of 627 (7 of 418 in Oman). Hiding them changes no target's tier (`pipeline/mask_check.py`).

## 5. Name-free check
Formerly "blind test". The scorer sees only terrain numbers; names are looked up afterwards. It is a sanity check, not validation: AMADEE-18 area ranks top 11% on average over Mars targets and top 24% on its best single target; Meteor Crater 4.5% / 22%; Atacama tile 51% / 25%.
