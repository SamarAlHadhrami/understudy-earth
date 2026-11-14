# Extra factors for judging an Earth analog site (research, read 2026-11-14)

Only what I opened or saw in a search result is stated as fact. Everything else is UNVERIFIED. Hours = one person with a coding agent. Nothing here is built yet.

**What the sources say.** A review of Mars analogue sites (Marlow, Martins and Sephton, Astrobiology 2010, seen in search results, full text not opened) groups site criteria into physical, thermophysical (albedo, thermal inertia) and environmental, and says good analogue soils should match Mars in mineralogy, elemental content, volatiles and organics. InSight landing-site assessment (PMC7507760, search excerpt) used thermal inertia, rock abundance (shadows, thermal differencing) and slope together. A 2026 student paper (NHSJS, "Finding Earth's Best Testbeds for Moon and Mars Rovers") says analog choice is still mostly heuristic and that its own image-texture ranking is a screening tool, not a physics assessment. No source I found gives one agreed threshold list. That supports labelling our score a screening aid.

| Factor | Why used (source) | Best data and access | Licence / public derived values | Size | Hours | Verdict |
|---|---|---|---|---|---|---|
| Rock abundance + thermal inertia | InSight and MER landing-site work (PMC7507760) | Moon: LRO Diviner rock abundance, 128 pixels/degree, +-70 deg lat, PDS Geosciences Node / ODE, no login (Bandfield et al. 2011, doi 10.1029/2011JE003866). Mars: THEMIS thermal inertia mosaics 100 m, 24 tiles, +-60 deg, USGS Astropedia (Edwards et al. 2011, doi 10.1029/2010JE003755). Earth: MODIS day-minus-night land surface temperature (MOD11A2, 1 km, 8-day, LP DAAC) | NASA data, normally open; Earth side needs Earthdata login (UNVERIFIED terms page not opened) | Mars tiles and Diviner maps UNVERIFIED (large) | 8-12; the three bodies use different physics, so "rough proxy" only | HARD |
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

**Sentence box options (reasoning, nothing downloaded).**
1. Keep rules (current): no network, no key, no cost, predictable; it can only understand what the rules cover, so it must refuse unknown input. SAFEST.
2. Tiny in-browser model (for example a WebAssembly/WebGPU model): no key, but model size (tens to hundreds of MB), load time and wrong guesses are UNVERIFIED risks; not worth it before the deadline.
3. Free serverless proxy holding a key: the key stays off the page, but it adds a server, rate limits, abuse and cost risk, and sends users' text to a third party. Least safe for a "no server" submission.
Recommendation: option 1, typed input only.
