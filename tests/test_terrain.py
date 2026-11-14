import math
import numpy as np
import sys, os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "pipeline"))
import terrain as t


def test_flat_plane_zero_slope():
    z = np.full((20, 20), 100.0)
    assert np.allclose(t.slope_deg(z), 0)
    assert np.allclose(t.roughness_m(z), 0)


def test_known_ramp_slope():
    # rises 10 deg: tan(10) * 500 m per cell in x
    rise = math.tan(math.radians(10)) * t.BASELINE_M
    z = np.tile(np.arange(20) * rise, (20, 1))
    assert np.allclose(t.slope_deg(z), 10, atol=1e-6)
    assert np.allclose(t.roughness_m(z), 0, atol=1e-6)  # a plane has no roughness


def test_roughness_bump():
    z = np.zeros((20, 20)); z[10, 10] = 9.0
    assert abs(t.roughness_m(z)[9, 9] - 8.0) < 1e-9


def test_scale_matching_average():
    # area averaging a 2x finer checkerboard to half size gives its mean
    import rasterio
    from rasterio.io import MemoryFile
    from rasterio.transform import from_origin
    fine = np.indices((400, 400)).sum(axis=0) % 2 * 10.0
    prof = dict(driver="GTiff", height=400, width=400, count=1, dtype="float32",
                crs="EPSG:3857", transform=from_origin(0, 0, 25, 25))
    with MemoryFile() as mf:
        with mf.open(**prof) as d:
            d.write(fine.astype("float32"), 1)
        with mf.open() as s:
            z = t.read_baseline(s, rasterio.windows.Window(0, 0, 400, 400))
    assert z.shape == (20, 20) and np.allclose(z, 5.0, atol=0.2)


def test_features_hist_total():
    z = np.random.default_rng(0).normal(0, 5, (20, 20)).cumsum(0)
    f = t.window_features(z)
    assert sum(f["hist"]) == 18 * 18
