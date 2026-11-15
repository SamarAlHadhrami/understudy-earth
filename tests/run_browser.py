"""Headless browser check: map renders, controls change results, brief opens, no console errors, phone width OK."""
import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8765", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(3)
errs, miss = [], []
def T(pg, sel):
    pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true);")
    return pg.inner_text(sel)

try:
    with sync_playwright() as p:
        b = p.chromium.launch()
        for name, vp in [("desktop", {"width": 1440, "height": 900}), ("phone", {"width": 390, "height": 844})]:
            pg = b.new_page(viewport=vp); pg.add_init_script("try{localStorage.setItem('ue_tour_seen','1');sessionStorage.setItem('ue_started','1')}catch(e){}")
            pg.on("console", lambda m: errs.append(m.text) if m.type == "error" else None)
            pg.on("pageerror", lambda e: errs.append(str(e)))
            pg.on("response", lambda r: miss.append(r.url) if r.status == 404 else None)
            pg.goto("http://localhost:8765/index.html"); pg.wait_for_selector("#map svg path.leaflet-interactive", state="attached", timeout=15000)
            pg.wait_for_timeout(1500)
            pg.evaluate("document.querySelectorAll('details').forEach(d=>d.open=true);window.ueSetStep=function(){};document.body.setAttribute('data-step','all')")
            n = pg.locator("#map svg path.leaflet-interactive").count(); assert n > 300, "map did not render windows"
            fills = lambda: pg.evaluate("[...document.querySelectorAll('#map svg path.leaflet-interactive')].map(p=>p.getAttribute('fill')).join()")
            f0 = fills()
            pg.click("#presets button[data-p=cold]"); pg.wait_for_timeout(300); f1 = fills()
            assert f0 != f1, "cold preset did not change map"
            pg.click("#presets button[data-p=rover]"); pg.select_option("#target", label="Nobile (threshold-sensitive)"); pg.select_option("#mode", "terrain"); pg.wait_for_timeout(300)
            a = T(pg,"#badge"); pg.check("#s_atacama"); pg.wait_for_timeout(300); c = T(pg,"#badge")
            print(name, "windows", n, "| Nobile terrain badge Oman:", a, "-> +Atacama:", c)
            pg.fill("#sentence", "rover test, slopes 10 to 20 degrees, dry, 5 to 30 degrees"); pg.click("#go"); pg.wait_for_timeout(200)
            assert "Understood" in T(pg,"#understood") and pg.input_value("#thi") == "30"
            pg.select_option("#mode", "both")
            pg.evaluate("document.querySelectorAll('#map svg path.leaflet-interactive')[200].dispatchEvent(new MouseEvent('click',{bubbles:true}))"); pg.wait_for_timeout(300)
            assert pg.locator("#result .strip .mc").count() == 12 and "Best months" in T(pg,"#result")
            assert "Best fit for your test" in T(pg,"#result .verdict"); a = T(pg,"#result .vhead"); pg.evaluate("var r=document.querySelector('[data-w=terrain]'); r.value=0; r.dispatchEvent(new Event('input',{bubbles:true}))"); pg.wait_for_timeout(150); print(name, "verdict:", a, "->", T(pg,"#result .vhead"))
            assert pg.locator(".twins img").count() == 2 and pg.evaluate("[...document.querySelectorAll('.twins img')].every(i=>i.complete&&i.naturalWidth==64)"), "twin pictures missing"
            assert "Why months fail" in T(pg,"#result")
            print(name, "best months line:", T(pg,"#result .best"))
            pg.fill("#sentence", "build me a spaceship"); pg.click("#go"); pg.wait_for_timeout(100); assert "could not understand" in T(pg,"#understood") and pg.input_value("#thi") == "30"
            pg.click("[data-act=addcal]"); pg.evaluate("document.querySelector('.tab[data-view=cal]').click()"); pg.wait_for_timeout(200); assert pg.locator("table.cal td.cc").count() == 12; pg.check("#split"); assert "Phase" in T(pg,"#splitres") or "One site" in T(pg,"#splitres") or "enough" in T(pg,"#splitres")
            pg.evaluate("document.querySelector('.tab[data-view=base]').click()"); pg.wait_for_timeout(200); assert "retrospective" in T(pg,"#base") and "Known failures" in T(pg,"#base") and "threshold-sensitive" in T(pg,"#base")
            pg.evaluate("document.querySelector('.tab[data-view=map]').click()")
            pg.evaluate("document.querySelector('[data-demo=none]').click()"); pg.wait_for_timeout(300); assert "No qualifying candidate" in T(pg,"#hook"); pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_nocand.png"))
            pg.evaluate("document.querySelector('[data-demo=good]').click()"); pg.wait_for_timeout(300); assert "No qualifying candidate" not in T(pg,"#hook"); assert "Best fit for your test" in T(pg,"#result") and "Meridiani" in T(pg,"#hook") and "robust" in T(pg,"#result")
            pg.evaluate("document.querySelector('.tab[data-view=jez]').click()"); pg.wait_for_timeout(300); assert "finer-scale check" in T(pg,"#jez") and pg.evaluate("document.querySelector('#jez img').naturalWidth") == 64
            pg.evaluate("document.querySelector('.tab[data-view=map]').click()"); pg.evaluate("document.querySelector('[data-demo=good]').click()"); pg.wait_for_timeout(300); assert "paved or main road" in T(pg,"#result") and "geology note" in T(pg,"#result")
            n0 = pg.locator("#map svg path.leaflet-interactive").count(); pg.check("#show90"); pg.wait_for_timeout(4000); n1 = pg.locator("#map svg path.leaflet-interactive").count(); assert n1 > n0 + 4000, (n0, n1)
            pg.evaluate("document.querySelectorAll('#map svg path.leaflet-interactive')[%d].dispatchEvent(new MouseEvent('click',{bubbles:true}))" % (n1 - 5)); pg.wait_for_timeout(400); assert "90 m data" in T(pg,"#result")
            pg.uncheck("#show90"); pg.wait_for_timeout(500)
            pg.evaluate("document.getElementById('brief').hidden=true"); pg.evaluate("document.querySelector('.tab[data-view=sky]').click()"); pg.wait_for_function("document.getElementById('marsimg').complete && document.getElementById('marsimg').naturalWidth>0"); pg.wait_for_timeout(1500)
            pg.locator("#marsimg").scroll_into_view_if_needed(); bb = pg.locator("#marsimg").bounding_box(); pg.mouse.click(bb["x"] + bb["width"] * (77.5 + 180) / 360, bb["y"] + bb["height"] * (87 - 18.4) / 174);
            try: pg.wait_for_selector("#skyres h3", timeout=15000)
            except Exception: print("SKY DEBUG", pg.evaluate("(function(){var e=document.elementFromPoint(%f,%f);return e.tagName+'#'+e.id+'.'+e.className})()" % (bb["x"] + bb["width"] * 0.714, bb["y"] + bb["height"] * 0.35)), errs[-3:], T(pg,"#skyres")[:200], pg.evaluate("document.getElementById('v-sky').className"), bb); raise
            pg.wait_for_timeout(500)
            assert "Mars near" in T(pg,"#skyres") and "coarse 463 m" in T(pg,"#skyres").lower() and "Closest squares in the searched area" in T(pg,"#skyres") and "Best fit for your test" in T(pg,"#skyres")
            pg.click("#skytabs button[data-body=moon]"); pg.wait_for_timeout(1500); pg.locator("#moonc").scroll_into_view_if_needed(); cb = pg.locator("#moonc").bounding_box(); pg.mouse.click(cb["x"] + cb["width"] * 0.5, cb["y"] + cb["height"] * 0.5); pg.wait_for_timeout(2000); assert "Moon near" in T(pg,"#skyres") and "south pole" in T(pg,"#skyres")
            pg.mouse.click(cb["x"] + 2, cb["y"] + 2); pg.wait_for_timeout(300); assert "Unknown" in T(pg,"#skyres")
            pg.evaluate("document.querySelector('.tab[data-view=world]').click()"); pg.wait_for_timeout(2500); assert "not every place on Earth" in T(pg,"#v-world") and pg.locator("#worldlist tr").count() > 25
            pg.evaluate("document.querySelector('.tab[data-view=map]').click()")
            pg.evaluate("document.querySelector('[data-demo=fail]').click()"); pg.wait_for_timeout(300); assert "does NOT pick February" in T(pg,"#replay") and "Why February" in T(pg,"#replay"); pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_fail.png")); pg.evaluate("document.querySelector('.tab[data-view=map]').click()"); pg.evaluate("document.querySelector('[data-demo=good]').click()"); pg.wait_for_timeout(200)
            pg.click("[data-act=brief]"); pg.wait_for_timeout(200); assert "Test Site Brief" in T(pg,"#brief"); pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_brief.png"))
            pg.click("[data-act=closebrief]")
            pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + ".png"), full_page=(name == "phone"))
            pg.evaluate("document.querySelector('.tab[data-view=replay]').click()"); pg.wait_for_timeout(200); assert "Real mission" in T(pg,"#replay"); print(name, T(pg,"#replay .best"))
            pg.screenshot(path=os.path.join(ROOT, "docs", "screens", name + "_replay.png"))
            pg.evaluate("document.querySelector('.tab[data-view=gap]').click()"); assert pg.locator("#gaptable tr").count() > 10
            pg.evaluate("document.querySelector('.tab[data-view=blind]').click()"); assert "Honest reading" in T(pg,"#blind")
            sw = pg.evaluate("document.documentElement.scrollWidth"); assert sw <= vp["width"] + 1, "horizontal scroll %d" % sw
            pg.close()
        b.close()
finally:
    srv.terminate()
real = [e for e in errs if "favicon" not in e]
print("console errors:", real or "none")
sys.exit(1 if real else 0)
