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

**Re-checked with Meteomatics (2026-11-15).** Pulled daily max/min, wind, humidity, sunshine duration and precipitation for 2019-2024 at the nearest point to the approximate AMADEE-18 site (18.19 N, 55.23 E) and 11 other Oman points, under the free access Meteomatics grants NASA Space Apps Challenge participants (`pipeline/meteomatics.py`; raw responses git-ignored in data/meteomatics, derived monthly values public in app/data/meteomatics.json). Comparing the same point and month against the POWER square average used above: Meteomatics February day max is 28.2 C and night min 14.9 C, against POWER's 36.0 C / 6.5 C for the same area and month — a large disagreement (about 8 C cooler max, 8 C warmer min). This pattern holds across the other 11 Oman points too: Meteomatics daily max is consistently several degrees below POWER's (typically 2-10 C, worse at Salalah where it reaches about 14 C in mid-summer), and Meteomatics daily min is consistently several degrees above POWER's (typically 2-12 C). Likely causes: Meteomatics returns a single-point downscaled value while POWER reports a roughly 50 km regional-cell average, and the two use different underlying models/reanalyses; we did not investigate further. Under Meteomatics' milder February numbers, the AMADEE-18 replay's February score rises to 100 and February IS among the planner's best months — the opposite conclusion from the POWER-based result above. We did NOT change our assumed needs (35 C day max limit, etc.) to produce this; both results are shown in the app (Replay tab) and the disagreement is stated plainly rather than picking the source that matches the real mission's February timing.

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

## 8. Jezero at 30 m (separate finer-scale check, method unchanged)
`pipeline/jezero.py`. The 1 m HiRISE DTM (about 21 km x 21 km, slanted footprint, 35% empty) is read in strips of at most 500 rows and block-averaged to 500 m (same method as Oman) and to 30 m. Window rule written before scoring: all 10 km windows on a 5-cell stride with at most 2% empty cells, non-overlapping; only ONE window qualifies (JEZ0). Jezero window at 500 m cells: slope p50 1.17 deg, p90 3.06 deg. At 30 m cells: slope p50 1.95 deg, p90 7.06 deg, 5% of cells above 10 deg, roughness median 0.22 m. Main method: closest Oman square E0128 (Dhofar, 17.33 N 54.14 E), distance 0.073 (match is below 0.081); closest anywhere is in the Meteor Crater area (0.041). 30 m check (ranking only, no calibrated threshold): closest Oman squares E0101, E0093, E0099 (Dhofar). The block-average step has a synthetic test (tests/test_terrain.py).

## 9. Whole-Oman 90 m (pool v2, a what-if; the app's main ranks still use the frozen pool v1)
Pool v1 = 627 squares (30 m tiles), recorded in meta.json. Pool v2 = v1 + 4756 squares from Copernicus GLO-90 in the box 16.5-26.5 N, 52-60 E (`pipeline/build_oman90.py`, `pipeline/pool_v2.py`; the box includes parts of neighbouring countries: for example the best square for Mawrth Vallis, 24.1 N 55.7 E, is near the UAE border). Recomputed scales and thresholds: match below 0.105 (was 0.081), partial below 0.238 (was 0.245). Oman tiers (17 targets): v1 4 match / 4 partial / 9 no qualifying candidate; v2 7 / 1 / 9. Changes: Gale landing area (Bradbury), Mawrth Vallis and Hellas floor move from partial to match (best squares H3510 22.4 N 59.6 E, H4333 24.1 N 55.7 E, H4584 25.7 N 59.4 E). No target changes into or out of "no qualifying candidate" (9 stay 9). Name-free check on pool v2: AMADEE-18 area top 9.8% mean / 18.2% best target (v1 10.7 / 24.0); Meteor Crater 4.4 / 17.6 (4.5 / 22.4); Atacama tile 50.7 / 5.1 (50.6 / 24.9). Baseline and stability checks were NOT re-run on pool v2, so they remain pool v1 results. The 90 m layer is an optional switch in the app (off by default); it is ranked against pool v1 and has no twin pictures or land-cover check. 90 m squares are area-averaged to 500 m cells like the others, but a 30 m and a 90 m source may differ slightly in roughness; that was not tested.

## 10. Access factor
OpenStreetMap distances to the nearest paved or main road and nearest town for 5174 squares inside the Oman box (`pipeline/access.py`). Not space data; permission to enter is unverified. Outside sites have no access data.

## 11. Click anywhere on Mars / Moon pole, and the world set (no change to the pool or method)
Mars grid: windows are 10 km, spaced 25 km, 87 S to 87 N (area-correct: the window's longitude width scales as 1/cos(lat) so it covers about the same ground area at every latitude; beyond about 87 degrees a window would span most of a full circle of longitude, so those spots are left unknown); the clicked spot is mapped to the nearest window, so numbers describe that window (up to about 18 km away), not the exact spot. Spot check against the named targets (target value vs nearest grid window): Gusev p50 0.24 vs 0.46 deg; Meridiani 0.17 vs 0.31; Oxia 0.47 vs 0.57 (flat sites agree in size); Jezero 0.57 vs 4.43 deg and Hellas floor 0.80 vs 2.21 deg differ because the nearest window straddles the crater rim or basin edge. So click results near steep ground can differ a lot from a named target. Moon: south pole only (LOLA); outside the circle is "unknown". Windows with missing data show "unknown" and no match.
World set: 45 chosen places at 90 m (dots, coarse) plus Meteor Crater, the Atacama tile and Oman from the main set. The world squares are NOT added to the reference pool, so pool v1 stays frozen and the baseline and stability checks are unchanged (nothing to re-run). Stages b (GCC region) and c (wider Middle East / other belts) are now partly covered, as single reference points rather than a full regional tile scan (see World set v2 below); a full stage-d global tile scan was not attempted (time).

### World set v2 (rule written before adding or scoring any new place, 2026-11-15)
Rule: add single reference points (not a full tile scan, for time reasons) to the existing 90 m world-sites pipeline (`pipeline/world_sites.py`), grouped into the categories the challenge names ("beyond well-known sites"): (a) GCC countries beyond what is already covered (UAE, Saudi Arabia, Qatar, Bahrain, Kuwait); (b) wider Middle East and North Africa (Sahara belt countries, Levant, Arabian Peninsula highlands); (c) other arid and volcanic belts worldwide (Central Asia, Southwest US, Andes/Puna, East African rift, Canary/Atlantic islands, Kamchatka/Aleutians) and polar/mountain areas, extending what pool already has rather than duplicating it. Famous already-cited sites (Atacama, Meteor Crater, Haughton, Death Valley, Antarctica, Iceland, Hawaii) are NOT duplicated; only new places are added. Coordinates are approximate reference points picked by the agent from public place names/gazetteers before any scoring was run; no place was chosen or dropped because of how it scored. Still a chosen and scanned set, not every place on Earth, and no claim of a global best. Same method, same thresholds, no tuning. Results (rank/tier changes, if any) are reported in the Finish summary, not hidden.

## 12. Gale crater fine-scale check (second fine terrain model, 2026-11-15)
A second fine terrain model beyond Jezero, to satisfy "2 to 4 more fine terrain models for key landing sites" where freely licensed data could actually be found in the time available. Attempted first: a single-pair HiRISE 1 m DTM over Oxia Planum (DTEEC_063839_1980_064261_1980_H01, NASA/JPL-Caltech/UArizona, PDS3, 333 MB) — downloaded and opened fine with rasterio's PDS driver, but its footprint is only about 5.5 km wide, too narrow for even one 10 km window, so it was discarded (not committed, not counted). Used instead: the 30-m HRSC DTM Mosaic of Gale Crater (Persaud/Putri/Muller 2021, CC BY 4.0, see REFERENCES.md), which covers a wide area (227 x 308 km) around Gale crater. `pipeline/gale.py` reads 10 km windows directly by geo-coordinate (never the whole ~210 MB file at once), keeps candidates within 90 km of the crater centre (-5.4, 137.8) with at most 2% missing data, and picks 6 non-overlapping windows lowest on missing data first — a rule fixed before scoring, same style as the Jezero window rule. Because the source is already 30 m native, there is no finer sub-check here (Jezero starts from 1 m and has a 30 m step in between; Gale does not). Result: the 6 windows land near the northern part of the crater (about 50-65 km from centre, within the 90 km search radius but not at the exact centre, since the search simply takes the least-missing-data windows in that radius). Best window's closest square in the searched area: see the app's Fine-scale checks tab for the live number (varies slightly with any future re-run); several windows land in PARTIAL or MATCH tiers against the searched-area pool, consistent with Gale crater's existing MATCH/PARTIAL status in the main 463 m MOLA-based pool results. This is a second, independently sourced cross-check, not a new target and not added to the reference pool.
