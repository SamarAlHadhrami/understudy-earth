import json, os
D = os.path.join(os.path.dirname(__file__), "..", "app", "data")
L = lambda f: json.load(open(os.path.join(D, f)))

def test_baseline_shape():
    b = L("baseline.json")
    assert len(b["rows"]) == 17 and all(len(r["sites"]) == 7 for r in b["rows"])
    assert all(0 <= s["rank_full_pct"] <= 100 and 30 < s["random_median_pct"] < 70 for r in b["rows"] for s in r["sites"])

def test_stability_flags():
    s = L("stability.json")["summary"]
    assert len(s) == 17 and all(("threshold_sensitive" in x) and x["band_pct"][0] <= x["band_pct"][1] for x in s)
    assert any(x["threshold_sensitive"] for x in s) and any(not x["threshold_sensitive"] for x in s)

def test_landcover_and_relief():
    lc = L("landcover.json"); e = L("earth.json")
    assert set(lc) == {w["id"] for w in e}
    assert sum(1 for v in lc.values() if sum(v) >= 10) > 0
    assert all(os.path.exists(os.path.join(D, "relief", w["id"] + ".png")) for w in e)


def test_mars_moon_world_files():
    m = L("mars_grid.json"); sz = os.path.getsize(os.path.join(D, "mars_grid.bin"))
    assert sz == m["n"] * m["bytes_per_window"] and sum(m["rows"]) == m["n"] and sz < 20 * 1024 * 1024
    assert all(w["lat"] <= -80 for w in L("moon_grid.json"))
    w = L("world.json"); assert len(w) >= 20 and all(len(x["windows"]) >= 1 for x in w)
