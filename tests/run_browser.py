"""Headless browser check: map renders, controls change results, brief opens, no console errors, phone width OK."""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
errs, miss = [], []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})]:
            pg = b.new_page(viewport=vp)
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("response", lambda r: miss.append(r.url) if r.status == 404 else None)
            pg.goto("http://localhost:8765/index.html"); pg.wait_for_selector("#map svg path.leaflet-interactive", state="attached", timeout=15000)
            pg.wait_for_timeout(1500)
            n = pg.locator("#map svg path.leaflet-interactive").count(); assert n > 300, "map did not render windows"
            fills = lambda: pg.evaluate("[...document.querySelectorAll('#map svg path.leaflet-interactive')].map(p=>p.getAttribute('fill')).join()")
            f0 = fills()
            pg.click("#presets button[data-p=cold]"); pg.wait_for_timeout(300); f1 = fills()
            assert f0 != f1, "cold preset did not change map"
            pg.click("#presets button[data-p=rover]"); pg.select_option("#target", label="Nobile"); pg.select_option("#mode", "terrain"); pg.wait_for_timeout(300)
            a = pg.inner_text("#badge"); pg.check("#s_atacama"); pg.wait_for_timeout(300); c = pg.inner_text("#badge")
            print(name, "windows", n, "| Nobile terrain badge Oman:", a, "-> +Atacama:", c)
            pg.fill("#sentence", "rover test, slopes 10 to 20 degrees, dry, 5 to 30 degrees"); pg.click("#go"); pg.wait_for_timeout(200)
            assert "Understood" in pg.inner_text("#understood") and pg.input_value("#thi") == "30"
            pg.select_option("#mode", "both")
            pg.evaluate("document.querySelectorAll('#map svg path.leaflet-interactive')[200].dispatchEvent(new MouseEvent('click',{bubbles:true}))"); pg.wait_for_timeout(300)
            assert pg.locator("#result .strip .mc").count() == 12 and "Best months" in pg.inner_text("#result")
            print(name, "best months line:", pg.inner_text("#result .best"))
            pg.click("[data-act=brief]"); pg.wait_for_timeout(200); assert "Test Site Brief" in pg.inner_text("#brief"); pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_brief.png"))
            pg.click("[data-act=closebrief]")
            pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + ".png"), full_page=(name == "phone"))
            pg.click(".tab[data-view=replay]"); pg.wait_for_timeout(200); assert "Real mission" in pg.inner_text("#replay"); print(name, pg.inner_text("#replay .best"))
            pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_replay.png"))
            pg.click(".tab[data-view=gap]"); assert pg.locator("#gaptable tr").count() > 10
            pg.click(".tab[data-view=blind]"); assert "Honest reading" in pg.inner_text("#blind")
            sw = pg.evaluate("document.documentElement.scrollWidth"); assert sw <= vp["width"] + 1, "horizontal scroll %d" % sw
            pg.close()
        b.close()
finally:
    srv.terminate()
real = [e for e in errs if "favicon" not in e]
print("console errors:", real or "none")
sys.exit(1 if real else 0)
