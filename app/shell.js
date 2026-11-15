/* App shell: landing page, menus, example menu, phone step flow, star field and lit-sphere illustrations. Plain JS and canvas. */
(function () {
  'use strict';
  var $ = function (s) { return document.querySelector(s); };
  var $$ = function (s) { return [].slice.call(document.querySelectorAll(s)); };
  var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  var land = $('#landing');
  function ss(get, v) { try { if (get) return sessionStorage.getItem('ue_started'); sessionStorage.setItem('ue_started', v); } catch (e) { } return null; }

  /* ---------- landing ---------- */
  function showLanding() { land.classList.remove('gone'); document.body.classList.add('in-landing'); land.scrollTop = 0; startOrbs(); }
  function hideLanding() { land.classList.add('gone'); document.body.classList.remove('in-landing'); ss(false, '1'); window.dispatchEvent(new Event('resize')); }
  function go(view) {
    hideLanding();
    var t = $('.tab[data-view=' + view + ']'); if (t) t.click();
  }
  if (ss(true) === '1' || location.hash.length > 1) { land.classList.add('gone'); } else { document.body.classList.add('in-landing'); }
  $('#start').addEventListener('click', function () { hideLanding(); var t = $('.tab[data-view=map]'); if (t) t.click(); });
  $('#start-tour').addEventListener('click', function () { hideLanding(); setTimeout(function () { $('#tourbtn').click(); }, 150); });
  $('#logo').addEventListener('click', showLanding);
  document.addEventListener('click', function (ev) {
    var g = ev.target.closest && ev.target.closest('[data-go]');
    if (g) { ev.preventDefault(); go(g.getAttribute('data-go')); }
  });

  /* ---------- menus ---------- */
  function closeMenus(except) {
    $$('.menuwrap').forEach(function (w) { if (w !== except) { w.classList.remove('open'); var b = w.querySelector('.menubtn'); if (b) b.setAttribute('aria-expanded', 'false'); } });
  }
  $$('.menubtn').forEach(function (b) {
    b.addEventListener('click', function (ev) {
      ev.stopPropagation(); var w = b.parentNode, on = !w.classList.contains('open');
      closeMenus(w); w.classList.toggle('open', on); b.setAttribute('aria-expanded', on ? 'true' : 'false');
      if (on) { var f = w.querySelector('.menu button'); if (f) f.focus(); }
    });
  });
  document.addEventListener('click', function () { closeMenus(); });
  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape') { var open = $('.menuwrap.open'); if (open) { closeMenus(); var b = open.querySelector('.menubtn'); if (b) b.focus(); } }
    if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && document.activeElement && document.activeElement.closest && document.activeElement.closest('.menu')) {
      e.preventDefault(); var items = $$('.menuwrap.open .menu button'), i = items.indexOf(document.activeElement);
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length].focus();
    }
  });
  function markMore() {
    var on = $('.tab.on'), mb = $('#morebtn');
    if (mb) mb.classList.toggle('on', !!(on && on.closest('#moremenu')));
    document.body.classList.toggle('on-map', !!$('#v-map.on'));
  }
  $$('.tab').forEach(function (t) { t.addEventListener('click', function () { setTimeout(markMore, 0); closeMenus(); }); });

  /* ---------- example menu ---------- */
  $('#demobar').addEventListener('click', function (ev) {
    var b = ev.target.closest('button'); if (!b) return;
    var ex = b.getAttribute('data-ex'), d = b.getAttribute('data-demo');
    if (d && ['good', 'none', 'brief'].indexOf(d) >= 0) window.ueSetStep(3);
    if (d && ['good', 'none', 'brief'].indexOf(d) >= 0) setTimeout(showResult, 150);
    if (ex) {
      var t = $('.tab[data-view=' + ex + ']'); if (t) t.click();
      if (ex === 'sky') {
        var img = $('#marsimg'), tries = 0;
        (function fire() {
          if (img.complete && img.naturalWidth) {
            var r = img.getBoundingClientRect();
            img.dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width * 0.55, clientY: r.top + r.height * 0.42 }));
          } else if (tries++ < 20) setTimeout(fire, 150);
        })();
      }
    }
    if (d === 'fail') markMore();
    closeMenus();
  });

  /* ---------- phone step flow ---------- */
  var STEP = 1, NAMES = ['', 'Target', 'Test', 'Result'];
  function setStep(n) {
    STEP = Math.max(1, Math.min(3, n)); document.body.setAttribute('data-step', STEP);
    $('#steplabel').textContent = 'Step ' + STEP + ' of 3: ' + NAMES[STEP];
    $('#stepback').textContent = STEP === 1 ? 'Start page' : 'Back'; $('#stepnext').disabled = STEP === 3;
  }
  window.ueSetStep = setStep;
  $('#stepback').addEventListener('click', function () { if (STEP === 1) showLanding(); else setStep(STEP - 1); });
  $('#stepnext').addEventListener('click', function () { setStep(STEP + 1); });
  setStep(1);
  var res = $('#result');
  var hadV = false;
  function showResult() { /* the result opens in a card over the map (app.js) */ }
  window.ueShowResult = showResult;
  /* after Apply or a preset: phone goes to step 3, desktop scrolls the panel to the Result block */
  window.ueGoResult = function () {
    if (innerWidth <= 860) { window.ueSetStep(3); window.scrollTo(0, 0); return; }
    var b = $('#b-result'); if (b && b.scrollIntoView) b.scrollIntoView({ block: 'start', behavior: reduce ? 'auto' : 'smooth' });
  };
  if (res && window.MutationObserver) new MutationObserver(function () { var v = !!res.querySelector('.verdict'); if (v) window.ueSetStep(3); if (v && !hadV) setTimeout(showResult, 60); hadV = v; }).observe(res, { childList: true });
  $$('.tab').forEach(function (t) {
    t.addEventListener('click', function () {
      var v = t.dataset.view, showMap = v === 'map' || v === 'world';
      document.body.classList.toggle('show-map', showMap);
      if (showMap) {
        window.dispatchEvent(new Event('resize'));
        if (v === 'world') setTimeout(function () { window.dispatchEvent(new Event('resize')); var wb = $('.viewbtns [data-v=world]'); if (wb) wb.click(); }, 80);
      }
    });
  });
  document.body.classList.add('show-map');


  /* ---------- long intro text: first sentence stays, the rest sits behind "More" (nothing is removed) ---------- */
  var SHORTEN = '#v-world .sub,#v-sky .sub,#v-gap .sub,#v-jez .sub,#v-cal .sub,#base .sub,#base .note,#blind .sub,#blind .note,#replay .sub,#replay .note,#jez .sub,#jez .note,#worldlist .sub,#gaptable .sub,#v-about .sub,#cal .sub,#skyres .note';
  function shorten() {
    $$(SHORTEN).forEach(function (el) {
      if (el.getAttribute('data-sh') || el.querySelector('details')) return; el.setAttribute('data-sh', '1');
      var h = el.innerHTML; if (h.length < 230) return;
      var i = h.indexOf('. ', 70); if (i < 0) return;
      var lead = h.slice(0, i + 1), rest = h.slice(i + 2);
      if ((lead.match(/</g) || []).length !== (lead.match(/>/g) || []).length || (lead.match(/<b>/g) || []).length !== (lead.match(/<\/b>/g) || []).length) return;
      el.innerHTML = lead + ' <details class="more"><summary>More</summary>' + rest + '</details>';
    });
  }
  var shT = 0;
  function queueShorten() { clearTimeout(shT); shT = setTimeout(shorten, 60); }
  if (window.MutationObserver) { var mo = new MutationObserver(queueShorten); mo.observe($('#panel'), { childList: true, subtree: true }); }
  shorten();

  /* ---------- stars ---------- */
  function rng(seed) { return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
  function drawStars(cv, n, maxr, seed, alpha) {
    var w = cv.width = innerWidth + 40, h = cv.height = Math.max(innerHeight, 900) + 40, c = cv.getContext('2d'), r = rng(seed);
    c.clearRect(0, 0, w, h);
    for (var i = 0; i < n; i++) {
      var x = r() * w, y = r() * h, s = 0.3 + r() * maxr, a = alpha * (0.4 + r() * 0.6);
      c.fillStyle = 'rgba(' + (r() < 0.2 ? '190,210,255' : '255,255,255') + ',' + a.toFixed(2) + ')'; c.beginPath(); c.arc(x, y, s, 0, 7); c.fill();
    }
  }
  function stars() { drawStars($('#stars-a'), 220, 0.8, 7, 0.8); drawStars($('#stars-b'), 70, 1.5, 19, 0.95); }
  stars(); var rz; window.addEventListener('resize', function () { clearTimeout(rz); rz = setTimeout(stars, 200); });
  if (!reduce) land.addEventListener('pointermove', function (e) {
    var x = (e.clientX / innerWidth - 0.5), y = (e.clientY / innerHeight - 0.5);
    $('#stars-a').style.transform = 'translate(' + (-x * 10) + 'px,' + (-y * 6) + 'px)'; $('#stars-b').style.transform = 'translate(' + (-x * 24) + 'px,' + (-y * 14) + 'px)';
  });

  /* ---------- lit spheres (illustration: procedural surface, not our data) ---------- */
  function noiseTex(w, h, kind, seed) {
    var r = rng(seed), layers = [[8, 4], [16, 8], [32, 16], [64, 32]].map(function (g) { var a = []; for (var i = 0; i < g[0] * g[1]; i++) a.push(r()); return { gx: g[0], gy: g[1], a: a }; });
    function s(L, u, v) {
      var x = u * L.gx, y = v * (L.gy - 1), x0 = Math.floor(x), y0 = Math.floor(y), fx = x - x0, fy = y - y0;
      fx = fx * fx * (3 - 2 * fx); fy = fy * fy * (3 - 2 * fy);
      function g(i, j) { return L.a[Math.min(L.gy - 1, j) * L.gx + (((i % L.gx) + L.gx) % L.gx)]; }
      return (g(x0, y0) * (1 - fx) + g(x0 + 1, y0) * fx) * (1 - fy) + (g(x0, y0 + 1) * (1 - fx) + g(x0 + 1, y0 + 1) * fx) * fy;
    }
    var t = new Float32Array(w * h);
    for (var j = 0; j < h; j++) for (var i = 0; i < w; i++) {
      var u = i / w, v = j / h; t[j * w + i] = s(layers[0], u, v) * 0.4 + s(layers[1], u, v) * 0.3 + s(layers[2], u, v) * 0.2 + s(layers[3], u, v) * 0.1;
    }
    if (kind === 'moon') for (var k = 0; k < 110; k++) {
      var cx = r() * w, cy = h * 0.12 + r() * h * 0.76, rr = 2 + Math.pow(r(), 2.2) * 15, d0 = Math.ceil(rr * 1.3);
      for (var dy = -d0; dy <= d0; dy++) for (var dx = -d0; dx <= d0; dx++) {
        var d = Math.sqrt(dx * dx + dy * dy) / rr, X = (Math.round(cx) + dx + w) % w, Y = Math.round(cy) + dy; if (Y < 0 || Y >= h) continue;
        if (d < 1) t[Y * w + X] -= 0.28 * (1 - d * d); else if (d < 1.25) t[Y * w + X] += 0.12 * (1.25 - d) * 4;
      }
    }
    return t;
  }
  function Orb(cv, kind, seed, speed) {
    var W = 256, H = 128, tex = noiseTex(W, H, kind, seed), c = cv.getContext('2d'), S = cv.width, R = S * 0.46, img = c.createImageData(S, S), rot = seed % 6, L = [-0.55, -0.35, 0.76];
    var base = kind === 'moon' ? [168, 166, 162] : [188, 104, 66], dark = kind === 'moon' ? 0.5 : 0.55;
    this.draw = function (dt) {
      rot += dt * speed; var d = img.data;
      for (var y = 0; y < S; y++) for (var x = 0; x < S; x++) {
        var nx = (x - S / 2) / R, ny = (y - S / 2) / R, o = (y * S + x) * 4, q = nx * nx + ny * ny;
        if (q >= 1) { d[o + 3] = 0; continue; }
        var nz = Math.sqrt(1 - q), lon = Math.atan2(nx, nz) + rot, lat = Math.asin(-ny);
        var u = (((lon / 6.28318) % 1) + 1) % 1, fx = u * W, fy = Math.max(0, Math.min(H - 1.001, (lat / 3.14159 + 0.5) * H)), x0 = Math.floor(fx), y0 = Math.floor(fy), ax = fx - x0, ay = fy - y0, x1 = (x0 + 1) % W;
        var t = (tex[y0 * W + x0] * (1 - ax) + tex[y0 * W + x1] * ax) * (1 - ay) + (tex[(y0 + 1) * W + x0] * (1 - ax) + tex[(y0 + 1) * W + x1] * ax) * ay;
        var lit = Math.max(0, nx * L[0] + ny * L[1] + nz * L[2]), k = (dark + 1.0 * t) * (0.06 + 1.05 * Math.pow(lit, 0.85)), limb = 1 - 0.35 * q * q;
        d[o] = Math.min(255, base[0] * k * limb); d[o + 1] = Math.min(255, base[1] * k * limb); d[o + 2] = Math.min(255, base[2] * k * limb); d[o + 3] = 255;
      }
      c.putImageData(img, 0, 0);
    };
  }
  var orbs = [], raf = 0, last = 0;
  function startOrbs() {
    if (!orbs.length) { orbs = [new Orb($('#orb-moon'), 'moon', 11, 0.12), new Orb($('#orb-mars'), 'mars', 5, 0.1)]; orbs.forEach(function (o) { o.draw(0); }); }
    if (reduce || raf) return;
    raf = requestAnimationFrame(loop);
  }
  function loop(ts) {
    raf = 0;
    if (document.hidden || land.classList.contains('gone')) return;
    if (ts - last > 66) { var dt = Math.min(0.2, (ts - last) / 1000); last = ts; orbs.forEach(function (o) { o.draw(dt); }); }
    raf = requestAnimationFrame(loop);
  }
  document.addEventListener('visibilitychange', function () { if (!document.hidden) startOrbs(); });
  if (!land.classList.contains('gone')) startOrbs();
  markMore();
})();
