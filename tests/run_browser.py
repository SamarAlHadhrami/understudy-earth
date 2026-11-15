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
            pg.click("#presets button[data-p=rover]"); pg.select_option("#target", label="Nobile (threshold-sensitive)"); pg.select_option("#mode", "terrain"); pg.wait_for_timeout(300)
            a = pg.inner_text("#badge"); pg.check("#s_atacama"); pg.wait_for_timeout(300); c = pg.inner_text("#badge")
            print(name, "windows", n, "| Nobile terrain badge Oman:", a, "-> +Atacama:", c)
            pg.fill("#sentence", "rover test, slopes 10 to 20 degrees, dry, 5 to 30 degrees"); pg.click("#go"); pg.wait_for_timeout(200)
            assert "Understood" in pg.inner_text("#understood") and pg.input_value("#thi") == "30"
            pg.select_option("#mode", "both")
            pg.evaluate("document.querySelectorAll('#map svg path.leaflet-interactive')[200].dispatchEvent(new MouseEvent('click',{bubbles:true}))"); pg.wait_for_timeout(300)
            assert pg.locator("#result .strip .mc").count() == 12 and "Best months" in pg.inner_text("#result")
            assert "Best fit for your test" in pg.inner_text("#result .verdict"); a = pg.inner_text("#result .vhead"); pg.evaluate("var r=document.querySelector('[data-w=terrain]'); r.value=0; r.dispatchEvent(new Event('input',{bubbles:true}))"); pg.wait_for_timeout(150); print(name, "verdict:", a, "->", pg.inner_text("#result .vhead"))
            assert pg.locator(".twins img").count() == 2 and pg.evaluate("[...document.querySelectorAll('.twins img')].every(i=>i.complete&&i.naturalWidth==64)"), "twin pictures missing"
            assert "Why months fail" in pg.inner_text("#result")
            print(name, "best months line:", pg.inner_text("#result .best"))
            pg.fill("#sentence", "build me a spaceship"); pg.click("#go"); pg.wait_for_timeout(100); assert "could not understand" in pg.inner_text("#understood") and pg.input_value("#thi") == "30"
            pg.click("[data-act=addcal]"); pg.click(".tab[data-view=cal]"); pg.wait_for_timeout(200); assert pg.locator("table.cal td.cc").count() == 12; pg.check("#split"); assert "Phase" in pg.inner_text("#splitres") or "One site" in pg.inner_text("#splitres") or "enough" in pg.inner_text("#splitres")
            pg.click(".tab[data-view=base]"); pg.wait_for_timeout(200); assert "retrospective" in pg.inner_text("#base") and "Known failures" in pg.inner_text("#base") and "threshold-sensitive" in pg.inner_text("#base")
            pg.click(".tab[data-view=map]")
            pg.click("[data-demo=none]"); pg.wait_for_timeout(300); assert "No qualifying candidate" in pg.inner_text("#hook"); pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_nocand.png"))
            pg.click("[data-demo=good]"); pg.wait_for_timeout(300); assert "No qualifying candidate" not in pg.inner_text("#hook"); assert "Best fit for your test" in pg.inner_text("#result") and "Meridiani" in pg.inner_text("#hook") and "robust" in pg.inner_text("#result")
            pg.click(".tab[data-view=jez]"); pg.wait_for_timeout(300); assert "finer-scale check" in pg.inner_text("#jez") and pg.evaluate("document.querySelector('#jez img').naturalWidth") == 64
            pg.click(".tab[data-view=map]"); pg.click("[data-demo=good]"); pg.wait_for_timeout(300); assert "paved or main road" in pg.inner_text("#result") and "geology note" in pg.inner_text("#result")
            n0 = pg.locator("#map svg path.leaflet-interactive").count(); pg.check("#show90"); pg.wait_for_timeout(4000); n1 = pg.locator("#map svg path.leaflet-interactive").count(); assert n1 > n0 + 4000, (n0, n1)
            pg.evaluate("document.querySelectorAll('#map svg path.leaflet-interactive')[%d].dispatchEvent(new MouseEvent('click',{bubbles:true}))" % (n1 - 5)); pg.wait_for_timeout(400); assert "90 m data" in pg.inner_text("#result")
            pg.uncheck("#show90"); pg.wait_for_timeout(500)
            pg.evaluate("document.getElementById('brief').hidden=true"); pg.click(".tab[data-view=sky]"); pg.wait_for_function("document.getElementById('marsimg').complete && document.getElementById('marsimg').naturalWidth>0"); pg.wait_for_timeout(1500)
            pg.locator("#marsimg").scroll_into_view_if_needed(); bb = pg.locator("#marsimg").bounding_box(); pg.mouse.click(bb["x"] + bb["width"] * (77.5 + 180) / 360, bb["y"] + bb["height"] * (87 - 18.4) / 174);
            try: pg.wait_for_selector("#skyres h3", timeout=15000)
            except Exception: print("SKY DEBUG", pg.evaluate("(function(){var e=document.elementFromPoint(%f,%f);return e.tagName+'#'+e.id+'.'+e.className})()" % (bb["x"] + bb["width"] * 0.714, bb["y"] + bb["height"] * 0.35)), errs[-3:], pg.inner_text("#skyres")[:200], pg.evaluate("document.getElementById('v-sky').className"), bb); raise
            pg.wait_for_timeout(500)
            assert "Mars near" in pg.inner_text("#skyres") and "coarse 463 m" in pg.inner_text("#skyres").lower() and "Closest squares in the searched area" in pg.inner_text("#skyres") and "Best fit for your test" in pg.inner_text("#skyres")
            pg.click("#skytabs button[data-body=moon]"); pg.wait_for_timeout(1500); pg.locator("#moonc").scroll_into_view_if_needed(); cb = pg.locator("#moonc").bounding_box(); pg.mouse.click(cb["x"] + cb["width"] * 0.5, cb["y"] + cb["height"] * 0.5); pg.wait_for_timeout(2000); assert "Moon near" in pg.inner_text("#skyres") and "south pole" in pg.inner_text("#skyres")
            pg.mouse.click(cb["x"] + 2, cb["y"] + 2); pg.wait_for_timeout(300); assert "Unknown" in pg.inner_text("#skyres")
            pg.click(".tab[data-view=world]"); pg.wait_for_timeout(2500); assert "not every place on Earth" in pg.inner_text("#v-world") and pg.locator("#worldlist tr").count() > 25
            pg.click(".tab[data-view=map]")
            pg.click("[data-demo=fail]"); pg.wait_for_timeout(300); assert "does NOT pick February" in pg.inner_text("#replay") and "Why February" in pg.inner_text("#replay"); pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_fail.png")); pg.click(".tab[data-view=map]"); pg.click("[data-demo=good]"); pg.wait_for_timeout(200)
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
