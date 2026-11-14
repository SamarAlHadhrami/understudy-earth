# PROGRESS

## RESUME HERE
- Current step: Phase 1 (docs) in progress, then Step 1 (pipeline).
- Half-done: nothing yet.
- Next action: finish docs, commit, then write pipeline/terrain.py + tests.
- Run tests: `python -m pytest tests -q`
- Open problems: reference PDF was only attached in chat, not on disk (not in docs/reference/).
- Latest commit: none yet.

## Decisions
- 2026-11-14: repo root = project folder; raw data folder renamed `data/` (git-ignored).
- Git identity taken from existing global git config.
- Common baseline 500 m. All DEMs are area-averaged to 500 m cells by windowed reads (rasterio out_shape + average). Windows are 10 km (20x20 cells).
- Rover limits: see docs/REFERENCES.md. Sources give design/test benchmarks (30 deg design, 22 deg firm rock, 17 deg loose sand embedding), not one flight limit; they are applied as regional gates and labelled so.
- AMADEE-18: Marmul area, Dhofar (news reports). Exact tile still to be checked from OeWF mission report.

## Log
- Setup: git init, remote added, rasterio/tifffile installed, all 9 data files open.

## Steps
1 first score: todo | 2 gate: todo | 3 blind test: todo | 4 gap map: todo | 5 web app: todo | 6 demo+submission text: todo | 7 extras: todo
