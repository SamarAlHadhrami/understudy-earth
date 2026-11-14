# PRD: Understudy Earth (where and when test planner)

**Problem.** Teams rehearse Moon and Mars jobs on Earth, mostly at sites chosen because they look alike, and at whatever time suits them. Nobody checks the match with numbers for a specific test, or says where Earth has nothing good enough, or which months suit the test.

**User.** Mission planners and field-test teams choosing where and when to rehearse. Local story: Oman (Dhofar hosted AMADEE-18 in February 2018).

**Core idea.** The user states the test. The app shows WHERE (terrain similarity to a chosen Moon or Mars target) and WHEN (months whose temperature, wind, dryness and sunlight meet the test's needs). Two separate things: MATCH THE TARGET (terrain shape) and MEET THE TEST NEEDS (user-entered needs; we do not claim Earth copies Mars temperatures).

**Goals.** Rank-based terrain similarity; gap result with an absolute reference; 12-month fit strip; Test Site Brief (print/PDF); AMADEE-18 replay; blind test and independent second check; honest limits everywhere.

**Non-goals.** Geology/chemistry matching; matching gravity, atmosphere or radiation; a global best analog; a live server; claiming mission requirements.

## Features
Core: map, target selector, test-needs sliders and ready-made tests (our assumptions), month strip and best months, combined where+when colouring, gap card with second-site toggle, Test Site Brief, AMADEE-18 replay, blind-test and gap views.
Extras done: sentence box with rule-based matcher and optional speech input, slope-distribution chart, compare mode, share link, confidence badge.
Extras not done: whole-Oman 90 m tiles, click-anywhere on Mars.

## Success checks
Python and JS tests pass; second-method check agrees; blind test reported honestly; static app opens from a public link; limits box on every result.

## Judging map
Impact: planner user, Oman. Creativity: where+when, gap, blind test. Validity: same-scale method, absolute gap reference, second check, limits. Relevance: LOLA, MOLA, NASA POWER. Presentation: 30 s demo.
