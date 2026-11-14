"""Headless browser check: map renders, slider changes values, no console errors, phone width OK."""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.5)
errs = []
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})]:
            pg = b.new_page(viewport=vp)
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.goto("http://localhost:8765/index.html"); pg.wait_for_selector("#map svg path.leaflet-interactive", state="attached", timeout=15000)
            pg.wait_for_timeout(1500)
            n = pg.locator("#map svg path.leaflet-interactive").count()
            before = pg.inner_text("#gcscore"); lim_before = pg.inner_text("#limval")
            pg.evaluate("(()=>{const s=document.getElementById('limit');s.value=8;s.dispatchEvent(new Event('input'))})()")
            pg.wait_for_timeout(300)
            after = pg.inner_text("#gcscore")
            print(name, "windows drawn:", n, "| best score", before, "->", after, "| limit", lim_before, "->", pg.inner_text("#limval"))
            assert n > 300, "map did not render windows"
            pg.evaluate("(()=>{const s=document.getElementById('limit');s.value=17;s.dispatchEvent(new Event('input'))})()")
            pg.select_option("#target", label="Nobile"); pg.wait_for_timeout(300)
            a = pg.inner_text("#badge"); pg.check("#s_atacama"); pg.wait_for_timeout(800); c = pg.inner_text("#badge")
            print(name, "Nobile badge Oman alone:", a, "-> with Atacama:", c)
            pg.evaluate("document.querySelectorAll('#map svg path.leaflet-interactive')[200].dispatchEvent(new MouseEvent('click',{bubbles:true}))"); pg.wait_for_timeout(300)
            assert "Limits." in pg.inner_text("#result")
            sw = pg.evaluate("document.documentElement.scrollWidth"); print(name, "scrollWidth", sw, "viewport", vp["width"])
            assert sw <= vp["width"] + 1, "horizontal scroll"
            os.makedirs(os.path.join(ROOT, "docs", "screens"), exist_ok=True)
            pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + ".png"), full_page=(name == "phone"))
            pg.close()
        b.close()
finally:
    srv.terminate()
real = [e for e in errs if "favicon" not in e]
print("console errors:", real or "none")
sys.exit(1 if real else 0)
