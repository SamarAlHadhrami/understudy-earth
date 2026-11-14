import json, os, glob
ROOT = os.path.join(os.path.dirname(__file__), "..")
P = json.load(open(os.path.join(ROOT, "app", "data", "climate_power.json")))
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]


def test_months_and_units():
    assert P["months"] == MONTHS and P["units"]["T2M"] == "C"
    for c in P["cells"].values():
        for k in P["params"]: assert len(c[k]) == 12


def test_temperature_order():
    for c in P["cells"].values():
        for m in range(12): assert c["T2M_MIN"][m] <= c["T2M"][m] <= c["T2M_MAX"][m]


def test_matches_raw_cache():
    raw = glob.glob(os.path.join(ROOT, "data", "power_cache", "*.json"))
    if not raw: return  # raw cache is git-ignored
    for f in raw[:5]:
        k = os.path.basename(f)[:-5]; d = json.load(open(f))
        for p in P["params"]:
            assert P["cells"][k][p] == [d["properties"]["parameter"][p][m] for m in MONTHS]


def test_marmul_reasonable():
    k = [k for k, c in P["cells"].items() if abs(c["lat"] - 18.25) < 0.01 and abs(c["lon"] - 55.3125) < 0.01]
    assert k, "Marmul cell missing"
    c = P["cells"][k[0]]
    assert c["T2M_MAX"][6] > c["T2M_MAX"][0]  # July hotter than January
    assert all(0 <= x <= 100 for x in c["RH2M"])
