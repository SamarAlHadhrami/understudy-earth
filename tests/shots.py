"""Screenshot every tab at desktop and phone width: python tests/shots.py OUTDIR"""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
out = sys.argv[1]; os.makedirs(out, exist_ok=True)
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8766", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})]:
            pg = b.new_page(viewport=vp)
            pg.add_init_script("try{localStorage.setItem('ue_tour_seen','1')}catch(e){}")
            pg.goto("http://localhost:8766/index.html"); pg.wait_for_selector("#map svg path.leaflet-interactive", state="attached", timeout=15000); pg.wait_for_timeout(1500)
            pg.screenshot(path=f"{out}/{name}_start.png")
            pg.click("#demobar button[data-demo=good]"); pg.wait_for_timeout(1200)
            pg.screenshot(path=f"{out}/{name}_good.png")
            pg.screenshot(path=f"{out}/{name}_good_full.png", full_page=True)
            for v in ["gap","cal","jez","sky","world","base","blind","replay","about"]:
                pg.click(f".tab[data-view={v}]"); pg.wait_for_timeout(700)
                pg.screenshot(path=f"{out}/{name}_{v}.png", full_page=(name=="phone"))
            pg.click(".tab[data-view=map]"); pg.click("#demobar button[data-demo=none]"); pg.wait_for_timeout(900)
            pg.screenshot(path=f"{out}/{name}_nocand.png")
finally:
    srv.terminate()
