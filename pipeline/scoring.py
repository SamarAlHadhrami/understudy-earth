"""Match score between two windows for a task. Mirrors app/app.js exactly."""
import numpy as np
from terrain import SLOPE_EDGES, ROUGH_EDGES

NS, NR = len(SLOPE_EDGES) - 1, len(ROUGH_EDGES) - 1
S_REF = 5.0    # degrees: slope distance at which that term saturates (design constant, not a physical limit)
R_REF = 20.0   # metres: same for roughness
W_TRAV, W_SLOPE, W_ROUGH = 0.5, 0.25, 0.25
GAP_THRESHOLD = 70    # below = gap (red)
MATCH_THRESHOLD = 90  # at or above = match (green); between = partial (amber)

# rover task: only the slope limit is sourced (see docs/REFERENCES.md); roughness has no sourced limit,
# so it enters only as a distribution distance, never as a pass/fail limit.
TASKS = {
    "rover": {"name": "Rover driving", "max_slope_deg": 17.0, "slider": [5, 30],
              "source": "Mars-weight test vehicle: embedding near 17 deg in loose sand, 22 deg firm rock, 28 deg cohesive soil "
                        "(Traverse Performance Characterization for the MSL Rover); design target ~30 deg (NASA JPL)."},
}


def _h(hist):
    return np.asarray(hist, float).reshape(NS, NR)


def _w(edges):
    w = np.diff(np.asarray(edges, float))
    w[-1] = min(w[-1], 160.0 if edges[-1] > 1e6 else w[-1])
    return w


def trav_share(hist, max_slope):
    """Share of cells with slope <= max_slope (linear within bin)."""
    sm = _h(hist).sum(1)
    tot = sm.sum()
    acc = 0.0
    for i in range(NS):
        lo, hi = SLOPE_EDGES[i], SLOPE_EDGES[i + 1]
        if max_slope >= hi: acc += sm[i]
        elif max_slope > lo: acc += sm[i] * (max_slope - lo) / (hi - lo)
    return acc / tot


def w1(pa, pb, widths):
    ca, cb = np.cumsum(pa / pa.sum()), np.cumsum(pb / pb.sum())
    return float(np.sum(np.abs(ca - cb) * widths))


def score(ha, hb, max_slope):
    A, B = _h(ha), _h(hb)
    d_trav = abs(trav_share(ha, max_slope) - trav_share(hb, max_slope))
    d_s = min(1.0, w1(A.sum(1), B.sum(1), _w(SLOPE_EDGES)) / S_REF)
    d_r = min(1.0, w1(A.sum(0), B.sum(0), _w(ROUGH_EDGES)) / R_REF)
    D = W_TRAV * d_trav + W_SLOPE * d_s + W_ROUGH * d_r
    return 100.0 * (1.0 - D), {"d_trav": d_trav, "d_slope": d_s, "d_rough": d_r}
