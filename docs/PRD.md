# Product requirements: Understudy Earth

## Problem
Teams rehearse Moon and Mars jobs on Earth, usually at sites chosen because they look alike and at whatever time suits them. Nobody checks the match with numbers for a specific test, says when the searched area has no good match, or shows which months suit the test.

## Users
Mission planners and field-test teams choosing where and when to rehearse. The local story is Oman: Dhofar hosted the AMADEE-18 Mars simulation in February 2018.

## Features
- Pick a Moon or Mars place and a test (rover, instrument, walking, cold), or type the test in a sentence. Advanced needs set temperature, wind, dryness, sunlight, swing and slope.
- Where: a map of 10 km Earth squares coloured by terrain match (teal good, amber partial, red hatched weak).
- When: a 12-month strip per square with the best months and the reason a month fails.
- Honest result: when nothing searched is close enough, the map goes grey and says "no qualifying candidate".
- Result card with a one-line verdict, details, twin terrain pictures and a 3D view.
- Test Site Brief (print or PDF), calendar and two-site plan, compare mode, share link.
- Click or type any spot on Mars (87 S to 87 N) or the lunar poles to see where it fits on Earth.
- World view of 45 chosen places, an Evidence page (baseline, name-free check, gap view, AMADEE-18 replay), and fine-scale checks at Jezero and Gale.
- Surface material (rough proxy), shown as context only.

## Out of scope
- Geology or chemistry matching, and gravity, atmosphere or radiation.
- A global best analog, mission requirements, a live server, voice input, AI at runtime.

## Success
The static app opens from a public link with no login, works on a phone, and shows its limits on every result. Python and JavaScript scoring agree, and the checks are reported plainly.
