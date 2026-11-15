# UI audit (15 Nov 2026)
Before screenshots: docs/screens/before. After: docs/screens/after.

## Problems found
- Dark navy theme with gradients, pill tabs and many boxed cards; hard to scan.
- Ten tabs in one flat row; a new person cannot tell what to open first.
- Demo bar and legend overlapped on the map, worst on phones.
- Tier colours were bright; month cells and charts used different colours from the map.
- Monospace text for all numbers; three type sizes with no scale.
- Panel boxes inside boxes (needs, gap card, result).

## Plan and what was done
1. Light theme from one set of CSS tokens (colour, type, space, radius, focus).
2. One font pair, self-hosted (IBM Plex Sans, Source Serif 4), tabular numbers.
3. Tabs grouped Plan, Compare, Evidence, About. Nothing removed.
4. Header is name, one line, Quick tour button.
5. Controls split into three numbered blocks separated by thin rules; boxes removed.
6. Legend and demo bar share one strip; on phones they sit under the map, not on it.
7. Tier colours: teal (match), amber (partial), brick red hatched (gap), grey (no candidate). Hatch, dots and text carry the meaning as well as colour.
8. Limits box is a calm amber-tinted block, always visible below the result.
9. Quick tour: 9 steps, keyboard and screen-reader friendly, bottom sheet on phones.
10. Reduced-motion respected; focus rings on every control.
