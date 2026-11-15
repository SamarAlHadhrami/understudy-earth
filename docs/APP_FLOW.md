# APP FLOW
0. Landing page first (Start planning, Quick tour, page tiles). Top bar: Planner, World, Evidence, About, More menu, Try an example menu (one click to a good state on any main page), Quick tour. Planner opens on a world map; click Oman to zoom in. Phone: three steps (Target, Test, Result).
1. Planner tab (first view, Jezero crater target, rover preset): map of Oman squares showing a mix of GOOD, PARTIAL and WEAK (hatched). Panel: choose target, describe the test with a preset button, the typed sentence box (examples shown; unknown input is refused) or sliders.
2. Map mode: where+when (default), terrain only, or needs only. Month: best month per square or a chosen month. Checkbox hides squares with 10% or more trees, crops or buildings.
3. Gap card: best terrain match in Oman. If no square qualifies, the map turns grey, the nearest square is outlined and the card says "no qualifying candidate in Oman"; tick Meteor Crater or Atacama to add a second site. A stability note says whether the tier is threshold-sensitive.
4. Click a square: Fit Verdict (user-weighted soft score), tier, best months, 12-month strip with close-month note and "why months fail", metrics vs target, slope chart, twin pictures, confidence, limits; buttons: Test Site Brief, Add to calendar, Compare.
5. Calendar tab: months across, chosen squares down; optional two-site plan for splittable test phases.
6. Baseline check tab: known sites vs random squares, stability table.
7. Gap view, Name-free check, AMADEE-18 replay (historical illustration with assumed needs, circle on map), How it works.
8. Demo bar on the map: 1 Good match, 2 No qualifying candidate, 3 Brief (real computed outputs).
9. Share link: choices are stored in the address (#t=...&tlo=...).
10. Fine-scale checks tab: finer-scale checks against the Jezero DTM (1 m, with a 30 m step) and the Gale crater HRSC mosaic (30 m, second site), each with twin pictures and the closest squares in the searched area. Result card also shows access (OpenStreetMap) and geology notes for Dhofar and Muscat squares. Checkbox "Show whole-Oman 90 m squares" adds an optional coarser layer.
11. Click Mars / Moon tab: click the Mars slope map (87 S to 87 N) or the lunar south-pole disc; shows the nearest window, its numbers, closest Oman squares, Fit Verdict and a Low-confidence note. Unknown where data is missing.
12. World set tab: dots for 45 chosen places plus Meteor Crater, Atacama and Oman, coloured by terrain tier for the chosen target; the large Oman dot opens the fine map.

## App feel pass (2026-11-15)
- Planner: each step has a one-line instruction. Step 2 shows the 4 presets and the typed box; examples sit under a small "Examples" link.
- A click on a square, a world dot, or a Mars/Moon spot opens its result in a card over the map (bottom sheet on phone) with a Close button. Result card: one verdict line, 12-month strip with one legend, buttons Test site brief, Add to calendar, Compare, Compare terrain pictures, 3D view, then one folded "Details" (weights, numbers, pictures, access and geology, confidence, limits).
- One verdict per square: the headline follows the terrain tier; the fit score is shown as a number, never as "Strong fit" beside a PARTIAL tier.
- Oman dot zooms to the scored squares (Muscat and Dhofar), not the whole country.
- Calendar is a main tab with a count badge; empty state has "Add the 3 best squares for my test"; rows have Remove; "Added to calendar" pop-up offers Open calendar or Keep planning.
- Test site brief is a dark pop-up; print and PDF are black on white A4, notes folded out.
- Evidence is one page with four cards (Baseline, Name-free, Gap view, AMADEE-18 replay); the old Gap, Name-free and AMADEE-18 menu items scroll to their card.
- Click Mars / Moon has Latitude and Longitude boxes and a Go button (Mars 87 S to 87 N, Moon south 80 S to 90 S, Moon north 80 N to 90 N), with a range message.
- Every page except Planner has a Back to Planner button. Quick tour is 5 steps (the other steps are kept in the code).
- Look: warm graphite, one Mars-rust accent; teal, amber and brick stay map and verdict colours. The landing page is unchanged.

