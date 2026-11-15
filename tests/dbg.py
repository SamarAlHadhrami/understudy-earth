import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8769", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 1440, "height": 900})
        pg.on("console", lambda m: print("C", m.type, m.text[:200])); pg.on("pageerror", lambda e: print("E", str(e)[:300]))
        pg.add_init_script("sessionStorage.setItem('ue_started','1');localStorage.setItem('ue_tour_seen','1')"); pg.goto("http://localhost:8769/index.html"); pg.wait_for_timeout(4000)
        pg.screenshot(path=sys.argv[1] if len(sys.argv) > 1 else "dbg.png")
finally:
    srv.terminate()
