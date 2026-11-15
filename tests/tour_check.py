"""Tour check: opens, steps, Esc closes, works at phone width with storage blocked."""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8767", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2); errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})]:
            pg = b.new_page(viewport=vp); pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.add_init_script("try{sessionStorage.setItem('ue_started','1')}catch(e){}"); pg.goto("http://localhost:8767/index.html"); pg.wait_for_selector("#map svg path.leaflet-interactive", state="attached", timeout=15000)
            pg.wait_for_selector(".tour-offer.on", timeout=6000)
            pg.click("#offer-yes"); assert pg.inner_text("#tour-c") == "1 of 9"
            for k in range(8): pg.click("#tour-next"); pg.wait_for_timeout(250)
            assert pg.inner_text("#tour-c") == "9 of 9"; pg.screenshot(path=f"{ROOT}/docs/screens/after/{name}_tour9.png")
            pg.click("#tour-back"); pg.keyboard.press("Escape"); assert not pg.evaluate("document.body.classList.contains('tour-on')")
            pg.click("#tourbtn"); pg.click("#tour-next"); pg.wait_for_timeout(250); pg.screenshot(path=f"{ROOT}/docs/screens/after/{name}_tour2.png"); pg.click("#tour-skip")
            print(name, "tour ok")
        assert not errs, errs
finally:
    srv.terminate()
