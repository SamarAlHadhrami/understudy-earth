# Extra factors for judging an Earth analog site (research, read 2026-11-14)

Only what I opened or saw in a search result is stated as fact. Everything else is UNVERIFIED. Hours = one person with a coding agent. Nothing here is built yet.

**What the sources say.** A review of Mars analogue sites (Marlow, Martins and Sephton, Astrobiology 2010, seen in search results, full text not opened) groups site criteria into physical, thermophysical (albedo, thermal inertia) and environmental, and says good analogue soils should match Mars in mineralogy, elemental content, volatiles and organics. InSight landing-site assessment (PMC7507760, search excerpt) used thermal inertia, rock abundance (shadows, thermal differencing) and slope together. A 2026 student paper (NHSJS, "Finding Earth's Best Testbeds for Moon and Mars Rovers") says analog choice is still mostly heuristic and that its own image-texture ranking is a screening tool, not a physics assessment. No source I found gives one agreed threshold list. That supports labelling our score a screening aid.

| Factor | Why used (source) | Best data and access | Licence / public derived values | Size | Hours | Verdict |
|---|---|---|---|---|---|---|
| Rock abundance + thermal inertia | InSight and MER landing-site work (PMC7507760) | Moon: LRO Diviner rock abundance (GDR_L3), -60 to +60 deg lat (verified: PDS Orbital Data Explorer page-help, ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/GDR_L3.htm, "All maps are simple cylindrical projections covering the latitude range -60 to +60 degrees at 32 ppd resolution"), no login. Mars: THEMIS thermal inertia mosaics 100 m, 24 tiles, +-60 deg, USGS Astropedia (Edwards et al. 2011, doi 10.1029/2010JE003755). Earth: MODIS day-minus-night land surface temperature (MOD11A2, 1 km, 8-day, LP DAAC) | NASA data, normally open; Earth side needs Earthdata login (UNVERIFIED terms page not opened) | Diviner and Mars tiles confirmed within +-60 deg | 8-12; the three bodies use different physics, so "rough proxy" only | HARD |
| Soil grain size | Same thermophysical group (Marlow et al., not opened) | Derived from thermal inertia; no separate global product found | n/a | n/a | n/a | SKIP |
| Mineralogy / rock type | Marlow et al. (above) | Mars CRISM / TES, Earth geology maps; not checked | UNVERIFIED | UNVERIFIED | 15+ | SKIP (a terrain match is not a geology match) |
| Albedo | Marlow et al. (thermophysical) | Not checked | UNVERIFIED | UNVERIFIED | 6 | SKIP for now |
| Dust and wind-blown sand | Perseverance slipped on loose dust and sand at about 20 deg (JPL, 2024-10-28, opened) | No simple global map; NASA POWER wind is already used | n/a | n/a | n/a | SKIP |
| Crater and boulder density, surface age | Standard planetary practice, not checked | Needs image counts per site | UNVERIFIED | UNVERIFIED | 20+ | SKIP |
| Day-night temperature swing | Linked to thermal inertia above | NASA POWER T2M_MAX minus T2M_MIN (already held, about 50 km cells) | NASA POWER, derived values may be shown | none | 1-2 | EASY (but it is Earth air temperature, not Mars surface) |
| Illumination and shadow (Moon) | South-pole mission planning | LOLA is held; illumination maps not checked | UNVERIFIED | UNVERIFIED | 10+ | HARD |
| Elevation / air pressure | Pressure falls with height on Earth, still far above Mars | Copernicus DEM (held) | ESA, open | held | 1 | EASY, but low value |
| Trees, crops, buildings (surface-model bias) | Copernicus is a surface model | ESA WorldCover 10 m 2021 v200, AWS bucket esa-worldcover (no account to list), CC BY 4.0 per AWS registry, attribution required, 3x3 degree tiles | CC BY 4.0: derived flags may be shown with credit | a few small tiles for Oman | 3-4 | EASY |
| Access and logistics | Practical test planning | OpenStreetMap extract, ODbL (UNVERIFIED terms not reopened) | ODbL needs attribution; derived values only | large extract, derive small | 4-6 | EASY-MEDIUM |
| Salinity / water | Astrobiology relevance (AMADEE-18 page mentions salt domes, opened) | Not checked | UNVERIFIED | UNVERIFIED | n/a | SKIP |

**Final verdicts (re-checked 2026-11-15, after the Meteomatics and world-set work).** No new network access was done for this pass; verdicts below restate the table above in BUILT / CONTEXT ROW ONLY / SKIPPED terms, with one change (day-night swing).
- Rock abundance + thermal inertia: SKIPPED for the Moon, DONE for Mars (THEMIS, see REFERENCES.md and VALIDATION.md). Confirmed by reading the PDS Orbital Data Explorer page-help for GDR_L3 (ode.rsl.wustl.edu/moon/pagehelp/Content/Missions_Instruments/LRO/DIVINER/GDR_L3.htm): Moon Diviner rock abundance is -60 to +60 deg lat (does not cover our 80S-90S or 80N-90N pole data), Mars THEMIS is +-60 deg (different physics, different grid, DONE as a context row for Mars targets), Earth MODIS LST needs an Earthdata login we have not set up. Scoring Moon and Earth as one measure with Mars would be dishonest; not built for those two.
- Day-night temperature swing: BUILT, but as a CONTEXT-ROW-TO-TEST-NEED upgrade, not a terrain score. It is now a user-set test need (NASA POWER T2M_MAX minus T2M_MIN, per month) scored alongside temperature, wind, dryness and sunlight in the Fit Verdict; it stays out of the terrain similarity method. The app states plainly that Moon and Mars surface swings are far larger than Earth air swings, so this checks test tolerance, not a target match.
- Trees/crops/buildings (surface-model bias): BUILT earlier (ESA WorldCover land-cover flag, already in app/data/landcover.json, credited CC BY 4.0).
- Access and logistics: BUILT earlier (OpenStreetMap road/town distance, app/data/access.json, credited ODbL, explicitly "not space data").
- Elevation/air pressure: SKIPPED (low value, already implicitly covered by Copernicus DEM relief numbers; a separate air-pressure proxy was not built).
- Mineralogy/rock type, albedo, dust/wind-blown sand, crater/boulder density, illumination/shadow (Moon), salinity/water, soil grain size: SKIPPED, same reasons as above (no honest, lined-up, freely licensed cross-body product found in the time available).

**Sentence box options (reasoning, nothing downloaded).**
1. Keep rules (current): no network, no key, no cost, predictable; it can only understand what the rules cover, so it must refuse unknown input. SAFEST.
2. Tiny in-browser model (for example a WebAssembly/WebGPU model): no key, but model size (tens to hundreds of MB), load time and wrong guesses are UNVERIFIED risks; not worth it before the deadline.
3. Free serverless proxy holding a key: the key stays off the page, but it adds a server, rate limits, abuse and cost risk, and sends users' text to a third party. Least safe for a "no server" submission.
Recommendation: option 1, typed input only.
