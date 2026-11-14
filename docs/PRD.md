# PRD: Understudy Earth

**Problem.** Teams practise for Moon and Mars on Earth analog sites, mostly chosen because they look alike. Nobody checks the match with numbers for a specific task, or says where Earth has nothing good enough.

**User.** Mission planners and field-test teams choosing practice sites. Local story: Oman (Dhofar hosted AMADEE-18 in 2018).

**Goals.** Score small Earth windows against real Moon/Mars terrain windows using elevation data, for a chosen task. Show a gap map, prove the method with a blind test, show honest limits.

**Non-goals.** Geology or chemistry matching, matching gravity/atmosphere/radiation, a global best analog, a live server.

## Features
Core: Oman map (green/red), task selector (rover), target selector, live slider on task limits, score + reason + limits box, gap view, blind-test view.
Extras (priority order): NASA Earth temperature layer; click-anywhere on Mars; walking/landing tasks (only with cited limits); world view; thermal-inertia proxy.

## Success checks
Unit tests pass; second-method check agrees within tolerance; blind test reported honestly; static app opens from a public link with no login; limits box on every result.

## Judging map
Impact: planner user + Oman. Creativity: blind test, gap map, slider. Validity: same-scale method, second check, limits. Relevance: LOLA + MOLA + HiRISE core, NASA Earth layer. Presentation: 30 s red-to-green demo.
