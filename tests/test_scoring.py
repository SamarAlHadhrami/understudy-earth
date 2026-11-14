import os, sys
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "pipeline"))
import terrain as t
import scoring as sc


def hist_of(z):
    return t.window_features(z)["hist"]


def ramp(deg):
    import math
    r = math.tan(math.radians(deg)) * t.BASELINE_M
    return np.tile(np.arange(20) * r, (20, 1))


def test_identical_scores_100():
    h = hist_of(ramp(5))
    assert abs(sc.score(h, h, 17)[0] - 100) < 1e-9


def test_flat_vs_steep_low():
    assert sc.score(hist_of(np.zeros((20, 20))), hist_of(ramp(25)), 17)[0] < 40


def test_closer_slope_scores_higher():
    a = hist_of(ramp(5))
    assert sc.score(a, hist_of(ramp(6)), 17)[0] > sc.score(a, hist_of(ramp(15)), 17)[0]


def test_trav_share_limit():
    h = hist_of(ramp(10))
    assert sc.trav_share(h, 17) == 1.0 and sc.trav_share(h, 5) == 0.0
