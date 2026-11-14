# VALIDATION (sanity checks, not proof)

All checks below are retrospective sanity checks. The method (10 km squares, 500 m cells, six-term distance, 5% / 20% pair-distance thresholds) was fixed before them. We looked at results while building, and the check sites were chosen because they are known analogs, so none of this is independent validation. The tool is a screening aid.

**Method change in this round: none.** Weights, thresholds and features are untouched. Results (`results.json`) were regenerated and match the earlier numbers (Oman alone 4 match / 4 partial / 9 no qualifying candidate; with check sites 7 / 5 / 5).

## 1. AMADEE-18 historical illustration (needs written before the replay)
Page read: Austrian Space Forum, AMADEE-18 page, https://www.oewf.org/en/amadee-18/ (opened 2026-11-14). Text used:
- "In February 2018 ... a highly international Mars analog field simulation in the Dhofar region, Oman."
- "The actual field mission took place during four weeks in February 2018."
- "The test site offers a wide range of sand and rocky surfaces combined with a broad variability in inclination."
- "The nearest major city is Salalah, expected temperatures at the test site in February typically range between 16-27 C with less than 10 mm of precipitation."
The page gives no numeric test limits. Needs for the replay are therefore OUR ASSUMPTIONS for outdoor crew and equipment work: day highs up to 35 C, night lows at least 5 C, sunlight at least 4 kWh/m2/day, wind and humidity not limited. They were fixed before the first replay and have not been changed since. The page's 16-27 C was NOT copied as a limit because it is a quoted typical range, not a requirement.
Region: 15 km circle around 18.19 N, 55.23 E (Marmul area). Exact site approximate. Wording in the app: "historical illustration with assumed needs".

**Result: the planner does not pick February.** Numbers (NASA POWER cell 216_376, 2001-2025 climatology; fit = weakest factor):

| Month | Jan | Feb | Mar | Nov | Dec |
|---|---|---|---|---|---|
| Day max C | 31.1 | 36.0 | 38.6 | 36.5 | 32.7 |
| Night min C | 6.5 | 6.5 | 9.7 | 12.1 | 8.0 |
| Wind m/s | 2.8 | 3.1 | 3.1 | 2.6 | 2.8 |
| Sun kWh/m2/day | 5.35 | 6.17 | 6.92 | 5.45 | 5.03 |

Cause: only temperature. February day max is 36.0 C, 1 C above our assumed 35 C limit, so the temperature penalty is 1/5 and the fit is 80 (a good month). January (31.1 C) and December (32.7 C) are inside the window and score 100. Wind and sunlight pass in February. The needs were not wrongly copied from the page, so they were not changed. Side observation: POWER's February mean temperature (20.9 C) lies inside the page's 16-27 C, which suggests the page quotes a mean; POWER's daily max and min are more extreme. A different assumed day-max limit would change the answer; we did not tune it.

## 2. Baseline check (retrospective)
`pipeline/baseline.py` -> app/data/baseline.json. Per target, each known site's median rank among all 627 Earth squares is compared with 100 random draws of the same number of squares (fixed seed per target and site). Rule fixed in advance for the reading: 10 points or more below the random median = better than random, 10 or more above = worse, otherwise about random. Median over the targets of one body:

| Site | Mars (11 targets): rank / random / reading | Moon (6 targets) |
|---|---|---|
| AMADEE-18 area (15 km) | 20.9% / 49.4% / better than random (ahead of 95% of random draws on 5 of 11) | 63.8% / 48.7% / worse than random |
| Meteor Crater (1 square, 7.5 km, original) | 18.0% / 49.8% / better (1 of 11) | 55.0% / 50.0% / about random |
| Meteor Crater (15 km rule, 3 squares) | 18.0% / 51.1% / better (5 of 11) | 55.0% / 51.6% / about random |
| Atacama whole tile (original, 110 squares) | 66.3% / 50.2% / worse than random (4 of 11) | 29.3% / 50.2% / better |
| Atacama 15 km around tile centre (7 squares) | 41.1% / 49.4% / about random (3 of 11) | 34.9% / 49.1% / better |
| Muscat area | 93.6% / 50.2% / worse than random | 7.2% / 50.0% / better |
| Dhofar squares | 44.8% / 50.0% / about random | 71.1% / 49.9% / worse |

The "of 11" counts move by one or so with the random draws (an earlier unseeded run gave 6 and 2); the medians do not.

**Site-selection rule (written down, applied to every site the same way):** a known site is all squares whose centre is within 15 km of its reference point. Reference points: AMADEE-18 = 18.19 N 55.23 E (approximate); Meteor Crater = 35.027 N 111.023 W; Atacama = centre of the 1-degree tile (24.5 S 69.5 W), because we have no verified analog coordinate for it. This rule was written after we had seen the original tile-median result, so it is a fix we looked for, not a blind test; both versions are shown.

## 3. Diagnosis of the weak results (no method change)
**Atacama.** The tile covers 24.94-24.04 S, 69.95-69.06 W (110 squares). Median square: slope p50 2.5 deg, p90 5.1 deg, roughness 2.8 m, relief 503 m. Mars target medians: slope p50 0.8 deg, p90 2.4 deg, roughness 0.7 m, relief 305 m. West third of the tile: slope p50 1.3 deg, relief 296 m; middle 2.2 deg, 493 m; east third (Andes foothills) 3.6 deg, 701 m. Only 22% of squares have relief under 300 m. So the whole-tile median is dominated by foothill terrain; the tile choice, not the scoring, is the main cause. A "flattest 100 km block" rule cannot help because the tile is itself about 100 km wide; picking a flatter Atacama tile now would be choosing after seeing scores, so we did not.
**Muscat mountains vs the Moon.** Mean scaled terms against Moon targets: the slope-distribution, 90th-percentile slope and steep-share terms carry most of the distance (for Nobile 1.5, 1.1 and 1.6 versus 0.4-0.8 for roughness and relief). Muscat squares have slope p50 5.8 deg, p90 13.9 deg and 24% steep share, much closer to lunar south-pole terrain (p50 about 10 deg) than flat desert is. The metric sees only slope and roughness, not rock type or dust. This sentence is now in the app's limits box. A further terrain number (for example larger-scale relief or curvature) was considered and NOT added: no cited science reason was verified in this session, and there is no independent set of sites to test it on without tuning.
**AMADEE-18 month.** See section 1.

## 4. Stability check
`pipeline/stability.py` -> app/data/stability.json. 8 settings per target: window 5, 10, 20 km and 1 km cells, thresholds 5/20% and 10/30%. 4 of 17 targets keep the same tier in all settings (robust): Meridiani Planum (match), Shackleton rim/wall, Malapert massif, Gale mound south flank (no qualifying candidate). The other 13 change tier (threshold-sensitive). The app shows robust or threshold-sensitive next to each result, in the target list and in the brief; the opening screen and demo use the robust targets.

## 5. Mask check
ESA WorldCover 10 m 2021 v200 (CC BY 4.0). Squares with 10% or more trees, crops or buildings: 55 of 627 (7 of 418 in Oman). Hiding them changes no target's tier (`pipeline/mask_check.py`).

## 6. Name-free check
Formerly "blind test". The scorer sees only terrain numbers; names are looked up afterwards. Sanity check, not validation: AMADEE-18 area top 11% on average over Mars targets and top 24% on its best single target; Meteor Crater 4.5% / 22%; Atacama tile 51% / 25%.

## 7. More known sites
None added. The only Earth terrain we hold is Oman (Muscat, Dhofar), the Meteor Crater tile and the Atacama tile, and no other real analog test location inside those tiles has a verified coordinate. We do not add sites we have not checked.

## Known failures (also shown in the app)
1. Atacama tile ranks worse than random for Mars as a whole tile (66% vs 50%); about random (41%) around its centre.
2. Muscat mountains rank top 7% for the Moon only because of slope and roughness; terrain numbers do not see rock type or dust.
3. AMADEE-18: planner picks December and January, not February (day max 36.0 C vs our assumed 35 C).
4. 13 of 17 target tiers change under other window, cell or threshold settings.
