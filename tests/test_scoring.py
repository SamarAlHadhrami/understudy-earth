import os, sys, math
import numpy as np
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "pipeline"))
import terrain as t
import scoring as sc


def win(z):
    return t.window_features(z)


def ramp(deg):
    r = math.tan(math.radians(deg)) * t.BASELINE_M
    return np.tile(np.arange(20) * r, (20, 1))


def setup_module(_):
    ws = [win(ramp(d)) for d in (0.1, 1, 2, 5, 8, 12, 20)]
    sc.set_scales(sc.feature_scales(ws))


def test_identical_distance_zero():
    a = win(ramp(5)); assert sc.distance(a, a) == 0


def test_closer_slope_closer_distance():
    a = win(ramp(5))
    assert sc.distance(a, win(ramp(6))) < sc.distance(a, win(ramp(15)))


def test_rank_orders_by_distance():
    ws = [win(ramp(d)) for d in (1, 5, 8, 20)]
    r, d = sc.ranks(ws, win(ramp(5.5)))
    assert r[1] == 0 and r[3] > r[2] > r[1]


def test_tiers():
    assert sc.tier(0.01) == "match" and sc.tier(0.1) == "partial" and sc.tier(0.5) == "gap"


def test_drivable_share():
    h = win(ramp(10))["hist"]
    assert sc.trav_share(h, 17) == 1.0 and sc.trav_share(h, 5) == 0.0
