# Validation

These are retrospective sanity checks, not proof. The method (10 km squares, 500 m cells, six-term terrain distance, 5% and 20% pair-distance thresholds) was fixed first, and the check sites are known analogs.

## What we checked
| Check | Result |
|---|---|
| Baseline: known site rank versus 100 random draws (627 Earth squares) | AMADEE-18 area ranks 20.9% for Mars (random 49.4%): better than random. Meteor Crater 18.0%: better. Atacama whole tile 66.3%: worse than random; about random (41.1%) around its centre. |
| Name-free check: scorer sees only terrain numbers | AMADEE-18 area top 11% on average over Mars targets; Meteor Crater 4.5%; Atacama tile 51%. |
| Stability: 8 settings (window 5, 10, 20 km; 1 km cells; thresholds 5/20% and 10/30%) | 4 of 17 targets keep the same tier in all settings (Meridiani Planum, Shackleton rim/wall, Malapert massif, Gale mound south flank). 13 change tier. |
| Land-cover mask (ESA WorldCover) | 55 of 627 squares have 10% or more trees, crops or buildings. Hiding them changes no target's tier. |
| Second method (integer block means and Sobel slopes, 17 windows) | Agrees within tolerance. |
| AMADEE-18 month replay | The planner picks December and January, not February: February day max is 36.0 C against our assumed 35 C limit. |
| Jezero at 30 m, Gale at 30 m | Finer-scale checks with the same method; one Jezero window qualified. |

## Plain reading
- Terrain matching ranks the AMADEE-18 area and Meteor Crater better than random for Mars. It ranks the Atacama tile and the Muscat area worse than random for Mars.
- It does not see rock or dust: Muscat mountains rank top 7% for the Moon only because of slope and roughness.
- Results near a threshold can flip, so the app marks each target robust or threshold-sensitive.
- The planner is a screening aid. It does not prove a site is a good analog.
