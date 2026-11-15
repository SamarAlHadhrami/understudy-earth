import subprocess, sys, time, os
from playwright.sync_api import sync_playwright
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
srv = subprocess.Popen([sys.executable, "-m", "http.server", "8769", "-d", os.path.join(ROOT, "app")], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(2)
try:
    with sync_playwright() as p:
        b = p.chromium.launch(); pg = b.new_page(viewport={"width": 390, "height": 844})
        pg.on("console", lambda m: print("C", m.type, m.text[:200])); pg.on("pageerror", lambda e: print("E", str(e)[:300]))
        pg.add_init_script("sessionStorage.setItem('ue_started','1');localStorage.setItem('ue_tour_seen','1')"); pg.goto("http://localhost:8769/index.html"); pg.wait_for_timeout(3000); pg.evaluate("window.ueSetStep=function(){};document.body.setAttribute('data-step','all')"); print(pg.evaluate("(()=>{let e=document.querySelector('#presets button');let o=[];while(e&&e!==document.body){let c=getComputedStyle(e);o.push(e.tagName+'#'+e.id+':'+c.display+'/'+c.visibility);e=e.parentElement}return o.join(' | ')})()"))
        pg.screenshot(path=sys.argv[1] if len(sys.argv) > 1 else "dbg.png")
finally:
    srv.terminate()
