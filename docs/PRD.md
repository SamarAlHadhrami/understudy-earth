# PRD: Understudy Earth (where and when test planner)

**Problem.** Teams rehearse Moon and Mars jobs on Earth, mostly at sites chosen because they look alike, and at whatever time suits them. Nobody checks the match with numbers for a specific test, or says where the searched area has no qualifying candidate, or which months suit the test.

**User.** Mission planners and field-test teams choosing where and when to rehearse. Local story: Oman (Dhofar hosted AMADEE-18 in February 2018).

**Core idea (frozen).** The user states the test. The app shows WHERE (terrain similarity to a chosen Moon or Mars target) and WHEN (months whose temperature, wind, dryness and sunlight meet the test's needs). Terrain similarity and test needs are separate things; we do not claim Earth copies Mars temperatures.

**Goals.** Rank-based terrain similarity; "no qualifying candidate in the searched area" result with an absolute reference; 12-month fit strip with reasons; Test Site Brief (print/PDF); AMADEE-18 historical illustration; baseline check against random squares; stability check; independent second check; honest limits everywhere.

**Non-goals.** Geology/chemistry matching; matching gravity, atmosphere or radiation; a global best analog; a live server; mission requirements; voice input; AI at runtime.

## Features
Core: map, target selector, test-needs sliders and ready-made tests (our assumptions), month strip, reasons and close-month note, combined where+when colouring, calm "no qualifying candidate" state, second-site toggle, Test Site Brief, name-free check, baseline and stability tab, one-click demo.
Extras: typed sentence box (rule-based, refuses unknown input), Fit Verdict (user-weighted soft score), twin shaded-relief pictures (64 x 64), slope chart, compare mode, rehearsal calendar and two-site plan, share link, confidence badge, tree/crop/building flag (ESA WorldCover).
Also built: geology notes, access factor (OpenStreetMap), Jezero story at 30 m, optional whole-Oman 90 m layer. Also built: click-anywhere on Mars (463 m) and on the lunar south pole, a world set of chosen places. Not built: GCC and Middle East 90 m stages, rocks/dust proxy (see docs/EXTRA_FACTORS_RESEARCH.md), 3D view (see docs/3D_FEASIBILITY.md).

## Success checks
Python and JS tests pass; second-method check agrees; checks reported plainly; static app opens from a public link; limits box on every result.

## Judging map
Impact: planner user, Oman. Creativity: where+when, no-candidate state. Validity: same-scale method, absolute reference, baseline and stability checks, limits. Relevance: LOLA, MOLA, NASA POWER. Presentation: 30 s demo button.
