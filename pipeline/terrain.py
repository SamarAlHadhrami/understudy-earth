"""Terrain measures at a common baseline. Windows are read small; nothing is loaded whole."""
import math
import numpy as np
import rasterio
from rasterio.windows import Window
from rasterio.enums import Resampling

BASELINE_M = 500.0
WINDOW_KM = 10.0
N = int(WINDOW_KM * 1000 / BASELINE_M)  # 20 cells per side

SLOPE_EDGES = list(range(0, 31)) + [35, 45, 90]  # degrees
ROUGH_EDGES = [0, 5, 10, 20, 40, 80, 160, 1e9]            # metres


def slope_deg(z, dx=BASELINE_M, dy=BASELINE_M):
    """Central-difference slope in degrees on interior cells."""
    gx = (z[1:-1, 2:] - z[1:-1, :-2]) / (2 * dx)
    gy = (z[2:, 1:-1] - z[:-2, 1:-1]) / (2 * dy)
    return np.degrees(np.arctan(np.hypot(gx, gy)))


def roughness_m(z):
    """RMS deviation of each interior cell from the mean of its 3x3 neighbourhood."""
    s = np.zeros_like(z[1:-1, 1:-1])
    for i in range(3):
        for j in range(3):
            s += z[i:z.shape[0] - 2 + i, j:z.shape[1] - 2 + j]
    return np.abs(z[1:-1, 1:-1] - s / 9.0)


def window_features(z):
    """z: NxN elevation grid at the baseline (m). Returns dict or None if invalid."""
    if z is None or not np.isfinite(z).all():
        return None
    sl = slope_deg(z)
    ro = roughness_m(z)
    h, _, _ = np.histogram2d(sl.ravel(), ro.ravel(), bins=[SLOPE_EDGES, ROUGH_EDGES])
    return {
        "hist": h.astype(int).ravel().tolist(),
        "slope_p50": float(np.percentile(sl, 50)),
        "slope_p90": float(np.percentile(sl, 90)),
        "rough_med": float(np.median(ro)),
        "relief_m": float(z.max() - z.min()),
    }


def read_baseline(src, window, nodata_ok=0.05):
    """Windowed read, area-averaged to NxN. Returns array or None when too much nodata."""
    arr = src.read(1, window=window, out_shape=(N, N), resampling=Resampling.average,
                   boundless=False, masked=True)
    if arr.mask.any() and arr.mask.mean() > nodata_ok:
        return None
    if arr.mask.any():
        arr = arr.filled(np.nanmean(arr.compressed()))
    return np.asarray(arr, dtype="float64")


def earth_windows(path, step_km=WINDOW_KM):
    """Tile a Copernicus 1-degree tile into 10 km windows. Yields (lat, lon, z)."""
    with rasterio.open(path) as s:
        b = s.bounds
        lat0 = (b.top + b.bottom) / 2
        px_m_y = abs(s.res[1]) * 111_320.0
        px_m_x = abs(s.res[0]) * 111_320.0 * math.cos(math.radians(lat0))
        hy = int(round(step_km * 1000 / px_m_y))
        hx = int(round(step_km * 1000 / px_m_x))
        for r in range(0, s.height - hy + 1, hy):
            for c in range(0, s.width - hx + 1, hx):
                z = read_baseline(s, Window(c, r, hx, hy))
                lon, lat = s.xy(r + hy // 2, c + hx // 2)
                yield lat, lon, z


def window_at(src, x, y, half_m=WINDOW_KM * 500):
    """Window centred on projected (x, y) metres, for polar-stereo Moon or equirectangular Mars."""
    resx, resy = abs(src.res[0]), abs(src.res[1])
    col, row = src.index(x, y)[1], src.index(x, y)[0]
    wx, wy = int(round(half_m * 2 / resx)), int(round(half_m * 2 / resy))
    col0, row0 = col - wx // 2, row - wy // 2
    if col0 < 0 or row0 < 0 or col0 + wx > src.width or row0 + wy > src.height:
        return None
    return read_baseline(src, Window(col0, row0, wx, wy))
