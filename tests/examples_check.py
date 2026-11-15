"""Example menu: every item opens its page in a good state, no console errors, at desktop and phone width."""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8771", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3); errs = []
CHECK = {"good": "#result .verdict", "none": "#result .verdict", "fail": "#replay .best", "brief": "#brief .bar-top", "sky": "#skyres table, #skyres p", "world": "#worldlist tr", "base": "#base table", "replay": "#replay .best"}
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})]:
            pg = b.new_page(viewport=vp); pg.on("pageerror", lambda e: errs.append(str(e))); pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.add_init_script("try{localStorage.setItem('ue_tour_seen','1')}catch(e){}")
            pg.goto("http://localhost:8771/index.html"); pg.wait_for_timeout(1500)
            assert pg.is_visible("#landing") and pg.is_visible("#start"), "landing missing"
            pg.click("#start"); pg.wait_for_selector("#map svg path.leaflet-interactive", state="attached", timeout=15000)
            for key in ["good", "none", "fail", "brief", "sky", "world", "base", "replay"]:
                pg.click("#exbtn"); sel = f"[data-demo={key}]" if key in ("good", "none", "fail", "brief") else f"[data-ex={key}]"
                pg.click(sel); pg.wait_for_timeout(1800 if key == "sky" else 700)
                assert pg.locator(CHECK[key]).count() > 0, (name, key)
                if key == "brief": pg.evaluate("document.getElementById('brief').hidden=true")
                if key in ("sky", "good"): pg.screenshot(path=f"{ROOT}/docs/screens/redesign/{name}_ex_{key}.png")
            print(name, "examples ok")
        assert not errs, errs[:3]
finally:
    srv.terminate()
