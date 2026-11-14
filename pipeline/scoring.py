"""Terrain similarity between two windows. Mirrors app/score.js (checked by tests/check_js_score.js).

Distance D = mean of six scaled differences (slope distribution W1, 90th percentile slope, steep share,
log roughness at 500 m and 1 km, log relief). Each term is divided by its spread (std) across all Earth
windows, so no term dominates. Rank = share of Earth windows closer to the target than this one.
Tiers by rank: top 5% MATCH, 5-20% PARTIAL, rest GAP (relative to the windows we hold).
"""
import numpy as np
from terrain import SLOPE_EDGES, ROUGH_EDGES

NS, NR = len(SLOPE_EDGES) - 1, len(ROUGH_EDGES) - 1
MATCH_RANK, PARTIAL_RANK = 0.05, 0.20
FEATS = ["slope_w1", "slope_p90", "steep_share", "ln_rough500", "ln_rough1k", "ln_relief"]

# Rover task: only the slope limit is sourced; used for the separate "drivable share" line.
TASKS = {
    "rover": {"name": "Rover driving", "max_slope_deg": 17.0, "slider": [5, 30],
              "source": "Mars-weight test vehicle: embedding near 17 deg in loose sand, 22 deg firm rock, 28 deg cohesive soil "
                        "(Traverse Performance Characterization for the MSL Rover); design target ~30 deg (NASA JPL)."},
}
SCALES = None  # set by set_scales()


def _h(hist):
    return np.asarray(hist, float).reshape(NS, NR)


def slope_marg(w):
    return _h(w["hist"]).sum(1)


def trav_share(hist, max_slope):
    sm = _h(hist).sum(1)
    acc = 0.0
    for i in range(NS):
        lo, hi = SLOPE_EDGES[i], SLOPE_EDGES[i + 1]
        if max_slope >= hi: acc += sm[i]
        elif max_slope > lo: acc += sm[i] * (max_slope - lo) / (hi - lo)
    return acc / sm.sum()


def w1(pa, pb, widths):
    ca, cb = np.cumsum(pa / pa.sum()), np.cumsum(pb / pb.sum())
    return float(np.sum(np.abs(ca - cb) * widths))


_SW = np.diff(np.asarray(SLOPE_EDGES, float))


def terms(a, b):
    return np.array([
        w1(slope_marg(a), slope_marg(b), _SW),
        abs(a["slope_p90"] - b["slope_p90"]),
        abs(a["steep_share"] - b["steep_share"]),
        abs(np.log1p(a["rough_med"]) - np.log1p(b["rough_med"])),
        abs(np.log1p(a["rough1k_med"]) - np.log1p(b["rough1k_med"])),
        abs(np.log1p(a["relief_m"]) - np.log1p(b["relief_m"])),
    ])


def feature_scales(earth):
    """Spread of each feature across Earth windows (the divisor for each term)."""
    p50 = [e["slope_p50"] for e in earth]
    raw = [float(np.std(p50)), float(np.std([e["slope_p90"] for e in earth])), float(np.std([e["steep_share"] for e in earth])),
            float(np.std([np.log1p(e["rough_med"]) for e in earth])), float(np.std([np.log1p(e["rough1k_med"]) for e in earth])),
            float(np.std([np.log1p(e["relief_m"]) for e in earth]))]
    return [max(x, 1e-3) for x in raw]  # floor avoids dividing by ~0 on degenerate sets


def set_scales(sc):
    global SCALES
    SCALES = np.asarray(sc, float)


def distance(a, b):
    return float(np.mean(terms(a, b) / SCALES))


def ranks(earth, target):
    """Rank fraction (0 = closest) of every Earth window for this target, plus raw distances."""
    d = np.array([distance(e, target) for e in earth])
    order = d.argsort().argsort()
    return order / len(d), d


def tier(rank_frac):
    return "match" if rank_frac < MATCH_RANK else ("partial" if rank_frac < PARTIAL_RANK else "gap")
