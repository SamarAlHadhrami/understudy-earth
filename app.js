(function () {
  'use strict';
  var GROUPS = { oman_muscat: 'Oman (Muscat area)', oman_dhofar: 'Oman (Dhofar)', meteor_crater: 'Meteor Crater area, Arizona (outside Oman)', atacama: 'Atacama / Andes edge, Chile (outside Oman)' };
  var N = window.UENeeds, D = {}, SC, map, rects = {}, sel = null, selB = null, cmpNext = false;
  var st = { weights: { terrain: 1, temp: 1, wind: 1, dry: 1, sun: 1 }, target: null, mode: 'both', month: 'best', n: Object.assign({}, N.DEFAULT) };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LABEL = { match: 'GOOD', partial: 'PARTIAL', gap: 'POOR' };
  var GLABEL = { match: 'MATCH', partial: 'PARTIAL', gap: 'GAP' };
  var COL = { match: '#2ec4b6', partial: '#f6c453', gap: '#ff5a5f' };
  var FIELDS = ['tlo', 'thi', 'wmin', 'wmax', 'rhmax', 'smin', 'limit'];

  function load(f, opt) { return fetch('data/' + f).then(function (r) { if (!r.ok) { if (opt) return null; throw new Error(f + ' ' + r.status); } return r.json(); }).catch(function (e) { if (opt) return null; throw e; }); }
  Promise.all([load('meta.json'), load('earth.json'), load('targets.json'), load('results.json'), load('second_check.json'), load('climate_power.json'), load('relief.json', true)]).then(function (a) {
    D.meta = a[0]; D.earth = a[1]; D.targets = a[2]; D.results = a[3]; D.second = a[4]; D.power = a[5]; D.relief = a[6];
    SC = UEScore(D.meta); init();
  }).catch(function (e) {
    var el = $('loaderr'); el.hidden = false; el.textContent = 'Could not load the data files (' + e.message + '). Reload the page; if it persists the site files are missing.';
  });

  function climate(e) {
    if (e._c) return e._c;
    var c = D.power.cells[D.power.win[e.id]];
    return (e._c = { tmax: c.T2M_MAX, tmin: c.T2M_MIN, wind: c.WS2M, rh: c.RH2M, srad: c.ALLSKY_SFC_SW_DWN, src: 'NASA POWER climatology 2001-2025, cells ~50 km wide (regional, not local)', coarse: true });
  }

  function init() {
    var tsel = $('target'), html = '';
    ['Mars', 'Moon'].forEach(function (b) {
      html += '<optgroup label="' + b + (b === 'Moon' ? ' (south pole data only)' : '') + '">';
      D.targets.forEach(function (t) { if (t.body === b) html += '<option value="' + t.id + '">' + esc(t.name) + '</option>'; });
      html += '</optgroup>';
    });
    tsel.innerHTML = html;
    var def = D.targets.filter(function (t) { return t.name === 'Gale mound (Aeolis Mons)'; })[0];
    st.target = def; tsel.value = def.id;
    var mh = '<option value="best">Best month for each square</option>';
    N.MON.forEach(function (m, i) { mh += '<option value="' + i + '">' + m + '</option>'; });
    $('month').innerHTML = mh;
    $('limsrc').textContent = 'Limit source: ' + D.meta.tasks.rover.source;
    if (window.SpeechRecognition || window.webkitSpeechRecognition) $('mic').hidden = false;
    readHash(); initMap(); bind(); syncInputs(); renderAll(); renderBlind(); renderSecond(); renderReplay();
  }

  function tierOf(e) {
    var tt = SC.mapTier(e.rank), nt = N.needTier(e._fit);
    return st.mode === 'terrain' ? tt : (st.mode === 'needs' ? nt : N.worse(tt, nt));
  }

  function initMap() {
    map = L.map('map', { zoomControl: true }).setView([20.3, 56.4], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, className: 'dark-tiles', attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var r = L.svg({ padding: 0.5 }); r.addTo(map);
    var ns = 'http://www.w3.org/2000/svg', defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ff5a5f"/><rect width="3" height="6" fill="#5a1620"/></pattern>';
    r._container.insertBefore(defs, r._container.firstChild);
    var bounds = [];
    D.earth.filter(function (e) { return e.group.indexOf('oman') === 0; }).forEach(function (e) {
      var dlat = 5 / 111.32, dlon = 5 / (111.32 * Math.cos(e.lat * Math.PI / 180));
      var b = [[e.lat - dlat, e.lon - dlon], [e.lat + dlat, e.lon + dlon]];
      var rc = L.rectangle(b, { renderer: r, weight: 1, color: '#0a1020', fillOpacity: 0.85 }).addTo(map);
      rc.on('click', function () { pick(e); });
      rc.bindTooltip(function () { return 'Terrain top ' + Math.max(1, Math.round(e.rank * 100)) + '% | ' + (e._best.length ? 'best ' + N.monthsText(e._best) : 'no month fits'); }, { sticky: true });
      rects[e.id] = rc; bounds.push(b[0], b[1]);
    });
    state_views = { dhofar: [[16.9, 53.9], [19.0, 56.1]], muscat: [[22.9, 57.9], [24.1, 59.1]], all: bounds };
    map.fitBounds(state_views.dhofar, { padding: [20, 20] });
    var ctl = L.control({ position: 'topright' });
    ctl.onAdd = function () {
      var d = L.DomUtil.create('div', 'viewbtns');
      d.innerHTML = '<button data-v="dhofar">Dhofar</button><button data-v="muscat">Muscat</button><button data-v="all">All Oman</button>';
      L.DomEvent.disableClickPropagation(d);
      d.addEventListener('click', function (ev) { var v = ev.target.getAttribute('data-v'); if (v) map.fitBounds(state_views[v], { padding: [20, 20] }); });
      return d;
    };
    ctl.addTo(map);
  }
  var state_views;

  function pick(e) { if (cmpNext) { selB = e; cmpNext = false; } else { sel = e; } renderAll(); }

  function bind() {
    $('target').addEventListener('change', function () { st.target = D.targets.filter(function (t) { return t.id === $('target').value; })[0]; renderAll(); });
    FIELDS.forEach(function (f) { $(f).addEventListener('input', function () { st.n[f] = parseFloat($(f).value); syncInputs(true); renderAll(); }); });
    $('result').addEventListener('input', function (ev) { var k = ev.target.getAttribute && ev.target.getAttribute('data-w'); if (k) { st.weights[k] = +ev.target.value; renderResult(); var r = $('result').querySelector('[data-w="' + k + '"]'); if (r) r.focus(); } });
    $('mode').addEventListener('change', function () { st.mode = $('mode').value; renderAll(); });
    $('month').addEventListener('change', function () { st.month = $('month').value; renderAll(); });
    ['s_meteor', 's_atacama'].forEach(function (id) { $(id).addEventListener('change', renderGapCard); });
    $('presets').addEventListener('click', function (ev) {
      var p = N.PRESETS[ev.target.getAttribute('data-p')]; if (!p) return;
      FIELDS.forEach(function (f) { st.n[f] = p[f]; }); $('understood').textContent = p.label + ': numbers are our assumption, adjust them to your test.'; syncInputs(); renderAll();
    });
    $('go').addEventListener('click', applySentence);
    $('sentence').addEventListener('keydown', function (e) { if (e.key === 'Enter') applySentence(); });
    $('mic').addEventListener('click', function () {
      var R = window.SpeechRecognition || window.webkitSpeechRecognition, r = new R(); r.lang = 'en-US';
      r.onresult = function (ev) { $('sentence').value = ev.results[0][0].transcript; applySentence(); };
      r.onerror = function () { $('understood').textContent = 'Speech input not available here; type the sentence instead.'; };
      r.start();
    });
    $('copylink').addEventListener('click', function () {
      writeHash(); var u = location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { $('copied').textContent = 'copied'; }, function () { $('copied').textContent = 'copy the address bar'; });
    });
    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
        document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('on'); });
        $('v-' + b.dataset.view).classList.add('on');
        if (b.dataset.view === 'gap') renderGapTable();
        if (b.dataset.view === 'replay') renderReplay();
      });
    });
    document.addEventListener('click', function (ev) {
      var a = ev.target.getAttribute && ev.target.getAttribute('data-act');
      if (a === 'brief') openBrief(); else if (a === 'cmp') { cmpNext = true; $('result').insertAdjacentHTML('afterbegin', '<p class="hint">Now click a second square to compare.</p>'); }
      else if (a === 'closebrief') $('brief').hidden = true; else if (a === 'print') window.print(); else if (a === 'clearb') { selB = null; renderResult(); }
    });
  }

  function applySentence() {
    var r = N.parseSentence($('sentence').value, st.n); st.n = r.needs;
    $('understood').innerHTML = r.said.length ? 'Understood: ' + r.said.map(esc).join('; ') + '. Adjust the sliders if this is wrong.' : 'Nothing recognised. Try: "rover test, slopes 10 to 20 degrees, dry, 5 to 30 degrees".';
    syncInputs(); renderAll();
  }

  function syncInputs(fromUser) {
    var n = st.n;
    if (n.tlo > n.thi) { if (fromUser) n.tlo = n.thi = n.tlo; }
    FIELDS.forEach(function (f) { if (document.activeElement !== $(f)) $(f).value = n[f]; });
    $('tv').textContent = n.tlo + ' to ' + n.thi + ' °C (day max / night min)';
    $('wv').textContent = (n.wmin > 0 ? n.wmin : 0) + ' to ' + (n.wmax >= 12 ? '12+' : n.wmax) + ' m/s';
    $('rv').textContent = n.rhmax >= 100 ? 'not limited' : '≤ ' + n.rhmax + '%';
    $('sv').textContent = n.smin > 0 ? '≥ ' + n.smin + ' kWh/m²/day' : 'not limited';
    $('limval').textContent = n.limit + '°';
  }

  function recompute() {
    SC.rankAll(D.earth, st.target);
    D.earth.forEach(function (e) {
      e._fits = N.allFits(climate(e), st.n); e._best = N.bestMonths(e._fits);
      e._fit = st.month === 'best' ? Math.max.apply(null, e._fits) : e._fits[+st.month];
      e._tier = tierOf(e);
    });
  }

  function renderAll() {
    recompute(); var t = st.target;
    $('hook').innerHTML = '<b>Where and when</b> to rehearse a job like <b>' + esc(t.name) + '</b> (' + t.body + '). Each square is 10 km. ' +
      (st.mode === 'terrain' ? 'Colour = terrain match.' : (st.mode === 'needs' ? 'Colour = fit to your test needs.' : 'Colour = terrain match AND a month that fits your test.'));
    D.earth.forEach(function (e) {
      var rc = rects[e.id]; if (!rc) return;
      var k = e._tier, isSel = (sel && sel.id === e.id) || (selB && selB.id === e.id);
      rc.setStyle({ fillColor: k === 'gap' ? 'url(#hatch)' : COL[k], fillOpacity: k === 'gap' ? 0.9 : 0.8, weight: isSel ? 3 : 1, color: isSel ? '#fff' : '#0a1020' });
      if (rc._path) rc._path.setAttribute('fill', k === 'gap' ? 'url(#hatch)' : COL[k]);
    });
    renderGapCard(); renderResult(); writeHash();
    if ($('v-gap').classList.contains('on')) renderGapTable();
    if ($('v-replay').classList.contains('on')) renderReplay();
  }

  function bestOf(f) { var b = null; D.earth.forEach(function (e) { if (f(e) && (!b || e.d < b.d)) b = e; }); return b; }

  function renderGapCard() {
    var bo = bestOf(function (e) { return e.group.indexOf('oman') === 0; }), shown = bo.d, extra = [];
    [['meteor_crater', 's_meteor'], ['atacama', 's_atacama']].forEach(function (x) {
      if ($(x[1]).checked) { var b = bestOf(function (e) { return e.group === x[0]; }); extra.push({ g: x[0], b: b }); if (b.d < shown) shown = b.d; }
    });
    var k0 = SC.gapTier(bo.d), kk = SC.gapTier(shown), improved = shown < bo.d;
    $('badge').textContent = GLABEL[kk]; $('badge').className = 'badge ' + kk;
    $('gcscore').textContent = 'top ' + Math.max(1, Math.round(bo.rank * 100)) + '%';
    var txt = k0 === 'gap' ? 'Nothing in Oman is close enough to this target.' : (k0 === 'partial' ? 'Oman is a partial match only.' : 'Oman has a strong terrain match.');
    if (extra.length && improved && kk !== k0) txt = 'Oman alone: ' + GLABEL[k0] + '. With the second site: ' + GLABEL[kk] + '.';
    else if (extra.length) txt = 'The second site does not improve on Oman here.';
    $('gctext').textContent = txt;
    var lines = ['Oman alone: ' + GLABEL[k0] + ' (distance ' + bo.d.toFixed(2) + ')'];
    extra.forEach(function (x) { lines.push(GROUPS[x.g].replace(' (outside Oman)', '') + ': ' + GLABEL[SC.gapTier(x.b.d)] + ' (distance ' + x.b.d.toFixed(2) + ') at ' + x.b.lat.toFixed(2) + ', ' + x.b.lon.toFixed(2)); });
    $('secondres').innerHTML = lines.map(esc).join('<br>') + '<br><small>Distance: lower is closer. MATCH below ' + D.meta.thr_match_dist.toFixed(2) + ', PARTIAL below ' + D.meta.thr_partial_dist.toFixed(2) + '.</small>';
  }

  function stripHtml(e) {
    var c = climate(e), h = '<div class="strip" role="list" aria-label="Fit by month">';
    for (var m = 0; m < 12; m++) {
      var f = e._fits[m], k = N.needTier(f), star = e._best.indexOf(m) >= 0;
      h += '<div class="mc ' + k + (star ? ' best' : '') + '" role="listitem" title="' + N.MON[m] + ': ' + Math.round(f) + ' (day max ' + c.tmax[m].toFixed(0) + '°, night min ' + c.tmin[m].toFixed(0) + '°, wind ' + c.wind[m].toFixed(1) + ' m/s, humidity ' + Math.round(c.rh[m]) + '%, sun ' + c.srad[m].toFixed(1) + ')"><span>' + N.MON[m].charAt(0) + '</span><b>' + Math.round(f) + '</b><i>' + (star ? '★' : (k === 'gap' ? '×' : (k === 'partial' ? '~' : '✓'))) + '</i></div>';
    }
    return h + '</div>';
  }

  function confidence(e) {
    var c = climate(e), items = ['Terrain: surface model, 500 m cells'];
    items.push('Climate: NASA POWER values are regional and approximate (about 50 km cells), typical year');
    if (e.group === 'oman_dhofar' && e.approx) items.push('Site location approximate');
    var low = c.coarse || e.group.indexOf('oman') !== 0;
    return { level: low ? 'Medium-low' : 'Medium', items: items };
  }

  function metricRows(e) {
    var t = st.target, n = st.n;
    return [['Terrain rank for this target', 'top ' + Math.max(1, Math.round(e.rank * 100)) + '% of ' + D.earth.length + ' squares'],
      ['Median / 90th pct slope', e.slope_p50.toFixed(1) + '° / ' + e.slope_p90.toFixed(1) + '° (target ' + t.slope_p50.toFixed(1) + '° / ' + t.slope_p90.toFixed(1) + '°)'],
      ['Roughness 500 m / 1 km', e.rough_med.toFixed(1) + ' m / ' + e.rough1k_med.toFixed(1) + ' m (target ' + t.rough_med.toFixed(1) + ' / ' + t.rough1k_med.toFixed(1) + ')'],
      ['Relief', Math.round(e.relief_m) + ' m (target ' + Math.round(t.relief_m) + ' m)'],
      ['Drivable share (slope ≤ ' + n.limit + '°)', Math.round(SC.trav(e, n.limit) * 100) + '% (target ' + Math.round(SC.trav(t, n.limit) * 100) + '%)'],
      ['Best months for your test', e._best.length ? N.monthsText(e._best) : 'none fits']];
  }

  function chart(e) {
    var cv = $('slopechart'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, t = st.target, nb = 16;
    function dist(w) { var m = new Array(nb).fill(0), tot = 0; for (var a = 0; a < D.meta.slope_edges.length - 1; a++) { var bin = Math.min(nb - 1, Math.floor(D.meta.slope_edges[a])); var cnt = 0; for (var b = 0; b < D.meta.rough_edges.length - 1; b++) cnt += w.hist[a * (D.meta.rough_edges.length - 1) + b]; m[bin] += cnt; tot += cnt; } return m.map(function (x) { return x / tot; }); }
    var a = dist(e), b = dist(t), mx = Math.max.apply(null, a.concat(b)) || 1;
    ctx.clearRect(0, 0, W, H); var bw = (W - 20) / nb;
    for (var i = 0; i < nb; i++) {
      ctx.fillStyle = '#7aa2ff'; ctx.fillRect(10 + i * bw, H - 18 - (H - 30) * b[i] / mx, bw * 0.42, (H - 30) * b[i] / mx);
      ctx.fillStyle = '#2ec4b6'; ctx.fillRect(10 + i * bw + bw * 0.46, H - 18 - (H - 30) * a[i] / mx, bw * 0.42, (H - 30) * a[i] / mx);
    }
    ctx.fillStyle = '#9fb0d3'; ctx.font = '11px system-ui'; ctx.fillText('slope 0°', 10, H - 4); ctx.fillText('15°+', W - 36, H - 4);
  }


  function verdictHtml(e) {
    var c = climate(e), m = e._best.length ? e._best[0] : e._fits.indexOf(Math.max.apply(null, e._fits));
    if (st.month !== 'best') m = +st.month;
    var mf = N.monthFactors(c, m, st.n), f = { terrain: N.terrainFit(SC.distance(e, st.target), D.meta.thr_match_dist, D.meta.thr_partial_dist), temp: mf.temp, wind: mf.wind, dry: mf.dry, sun: mf.sun };
    var v = N.fitVerdict(f, st.weights), cf = N.confidenceLevel(e.group.indexOf('oman') === 0, !!e.approx);
    var cls = v.overall >= 75 ? 'match' : (v.overall >= 50 ? 'partial' : 'gap');
    var fix = v.worst === 'terrain' ? 'A second site with closer terrain would help most (tick one above).' : 'A different month or relaxed ' + v.worstName.toLowerCase() + ' needs would help most.';
    var bars = Object.keys(f).map(function (k) {
      return '<div class="vrow"><label>' + N.FACTOR_NAMES[k] + '</label><div class="vbar"><i class="' + (f[k] >= 75 ? 'match' : (f[k] >= 50 ? 'partial' : 'gap')) + '" style="width:' + Math.round(f[k]) + '%"></i></div><b>' + Math.round(f[k]) + '</b><input type="range" min="0" max="3" step="1" value="' + st.weights[k] + '" data-w="' + k + '" aria-label="Weight for ' + N.FACTOR_NAMES[k] + '"></div>';
    }).join('');
    return '<div class="verdict ' + cls + '"><div class="vhead">Best fit for your test: <b>' + v.overall + '%</b> &middot; ' + v.label + '</div><p class="sub">Here is what is missing: weakest factor is ' + esc(v.worstName) + ' (' + Math.round(f[v.worst]) + '). ' + fix + ' Month used: ' + N.MON[m] + '. Confidence: ' + cf + ' (terrain ' + (e.group.indexOf('oman') === 0 ? '30 m source' : 'outside site') + ', climate about 50 km).</p>' + bars + '<small>Sliders set each factor weight 0-3 (0 = ignore). Rule-based fit from our assumptions, not a mission verdict.</small></div>';
  }


  // Shaded relief from a 20 x 20 grid of heights (m above window mean), cells 500 m. Same sun and exaggeration for every picture.
  function shade(cv, g) {
    var n = 20, EX = 3, AZ = 315 * Math.PI / 180, ALT = 45 * Math.PI / 180, cell = 500;
    cv.width = n; cv.height = n; var ctx = cv.getContext('2d'), im = ctx.createImageData(n, n);
    function z(r, c) { r = Math.max(0, Math.min(n - 1, r)); c = Math.max(0, Math.min(n - 1, c)); return g[r * n + c] * EX; }
    for (var r = 0; r < n; r++) for (var c = 0; c < n; c++) {
      var dzdx = (z(r, c + 1) - z(r, c - 1)) / (2 * cell), dzdy = (z(r + 1, c) - z(r - 1, c)) / (2 * cell);
      var slope = Math.atan(Math.hypot(dzdx, dzdy)), asp = Math.atan2(dzdy, -dzdx);
      var h = Math.cos(ALT) * Math.cos(slope) + Math.sin(ALT) * Math.sin(slope) * Math.cos(AZ - asp);
      var v = Math.round(255 * Math.max(0, Math.min(1, h))), i = (r * n + c) * 4;
      im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 255;
    }
    ctx.putImageData(im, 0, 0);
  }
  function twinHtml(e) {
    if (!D.relief || !D.relief[e.id] || !D.relief[st.target.id]) return '';
    var res = { Mars: '463 m (MOLA)', Moon: '80 m (LOLA)' }[st.target.body];
    return '<h3>Twin pictures</h3><div class="twins"><figure><canvas id="tw_t" aria-label="Shaded relief of the target"></canvas><figcaption>' + esc(st.target.name) + '<br>source ' + res + '</figcaption></figure><figure><canvas id="tw_e" aria-label="Shaded relief of this Earth square"></canvas><figcaption>This Earth square<br>source 30 m (Copernicus)</figcaption></figure></div>' +
      '<small>Both pictures are 10 km wide (bar = 5 km), resampled to the same 500 m cells, same sun (from top left) and 3x height exaggeration. Resampled for the picture only; the scoring uses the same cells.</small>';
  }
  function drawTwins(e) {
    var a = $('tw_t'), b = $('tw_e'); if (!a || !b) return; shade(a, D.relief[st.target.id]); shade(b, D.relief[e.id]);
  }

  function renderResult() {
    var el = $('result');
    if (!sel) { el.innerHTML = '<p class="hint">Click a square on the map to see where it fits, when it fits, and what Earth cannot copy.</p>'; return; }
    var e = sel, k = e._tier, c = climate(e), cf = confidence(e);
    var rows = metricRows(e).map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var h = '<div><span class="chip ' + k + '">' + LABEL[k] + '</span> <span class="sub">' + esc(GROUPS[e.group]) + ' &middot; ' + e.lat.toFixed(3) + ', ' + e.lon.toFixed(3) + '</span></div>' +
      verdictHtml(e) + '<div class="best">Best months: <b>' + (e._best.length ? esc(N.monthsText(e._best)) : 'none fits your test') + '</b></div>' + stripHtml(e) +
      '<small>★ best, ✓ good, ~ partial, × poor (number = fit 0-100, weakest factor). Source: ' + esc(c.src) + '.</small>' +
      '<table>' + rows + '</table><div class="chartbox"><canvas id="slopechart" width="340" height="90"></canvas><small><i class="dot b"></i>target slope spread <i class="dot g"></i>this square</small></div>' +
      twinHtml(e) + '<div class="conf"><b>Confidence: ' + cf.level + '.</b> ' + cf.items.map(esc).join('; ') + '.</div>' +
      '<div class="limits"><b>What this test cannot copy.</b> Gravity, thin air and radiation. Real ' + (st.target.body === 'Moon' ? 'lunar' : 'Martian') + ' temperatures: Earth air temperature here only tells you when conditions suit your test. A terrain match is not a geology match. 500 m cells hide rocks and steps. Earth heights include trees and buildings. Climate is a typical-year average.</div>' +
      '<div class="btns"><button data-act="brief">Test site brief (print / PDF)</button><button data-act="cmp">Compare with another square</button></div>';
    if (selB) {
      var A = metricRows(sel), B = metricRows(selB);
      h += '<h3>Compare</h3><table><tr><th></th><th>A ' + sel.lat.toFixed(2) + ', ' + sel.lon.toFixed(2) + '</th><th>B ' + selB.lat.toFixed(2) + ', ' + selB.lon.toFixed(2) + '</th></tr>' + A.map(function (r, i) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(B[i][1]) + '</td></tr>'; }).join('') + '</table><button data-act="clearb">Clear B</button>';
    }
    el.innerHTML = h; chart(e); drawTwins(e);
  }

  function openBrief() {
    if (!sel) return; var e = sel, t = st.target, n = st.n, c = climate(e), cf = confidence(e);
    var second = '';
    var gt = SC.gapTier(bestOf(function (x) { return x.group.indexOf('oman') === 0; }).d);
    if (gt !== 'match') { var alt = bestOf(function (x) { return x.group.indexOf('oman') !== 0; }); if (alt) second = '<p><b>Second-site suggestion:</b> best outside square is ' + esc(GROUPS[alt.group]) + ' at ' + alt.lat.toFixed(2) + ', ' + alt.lon.toFixed(2) + ' (terrain: ' + GLABEL[SC.gapTier(alt.d)] + ').</p>'; }
    var need = 'Air temperature ' + n.tlo + ' to ' + n.thi + ' °C; wind ' + n.wmin + ' to ' + (n.wmax >= 12 ? '12+' : n.wmax) + ' m/s; humidity ' + (n.rhmax >= 100 ? 'not limited' : '≤ ' + n.rhmax + '%') + '; sunlight ' + (n.smin > 0 ? '≥ ' + n.smin + ' kWh/m2/day' : 'not limited') + '.';
    $('brief').innerHTML = '<div class="bar-top"><button data-act="print">Print / save as PDF</button><button data-act="closebrief">Close</button></div>' +
      '<h1>Test Site Brief</h1><p class="sub">Understudy Earth &middot; generated ' + new Date().toISOString().slice(0, 10) + ' &middot; Blue Ember</p>' +
      '<h2>Location</h2><p>' + esc(GROUPS[e.group]) + ', 10 km square centred at ' + e.lat.toFixed(3) + ', ' + e.lon.toFixed(3) + '.</p>' +
      '<h2>Test and target</h2><p>Stand-in for: <b>' + esc(t.name) + '</b> (' + t.body + ').</p><p>Test needs (user choice or our assumption, not a mission requirement): ' + esc(need) + '</p>' +
      '<h2>Terrain match</h2><table>' + metricRows(e).map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' +
      '<h2>When: 12-month fit</h2>' + stripHtml(e) + '<p>Best months: <b>' + (e._best.length ? esc(N.monthsText(e._best)) : 'none fits') + '</b>. Data: ' + esc(c.src) + '. Typical-year average, not a forecast.</p>' + second +
      '<h2>What this test cannot copy</h2><ul><li>Gravity, thin air and radiation.</li><li>Real Moon/Mars temperatures: Earth temperature only shows when conditions suit the test.</li><li>Geology and chemistry; rocks, steps and slopes below 500 m; dust storms.</li></ul>' +
      '<h2>Confidence and data</h2><p>' + esc(cf.level) + '. ' + cf.items.map(esc).join('; ') + '.</p><p class="sub">Data: Copernicus DEM GLO-30 (ESA), LOLA and MOLA (NASA), NASA POWER climatology' + '' + '. See docs/REFERENCES.md.</p>';
    $('brief').hidden = false; window.scrollTo(0, 0);
  }

  function renderGapTable() {
    var rows = '';
    D.targets.forEach(function (t) {
      var bo = 1e9, ba = 1e9;
      D.earth.forEach(function (e) { var d = SC.distance(e, t); ba = Math.min(ba, d); if (e.group.indexOf('oman') === 0) bo = Math.min(bo, d); });
      var a = SC.gapTier(bo), b = SC.gapTier(ba);
      rows += '<tr><td>' + esc(t.name) + '<br><small>' + t.body + '</small></td><td><span class="chip ' + a + '">' + GLABEL[a] + '</span></td><td><span class="chip ' + b + '">' + GLABEL[b] + '</span>' + (b !== a ? ' &larr; second site helps' : '') + '</td></tr>';
    });
    $('gaptable').innerHTML = '<table><tr><th>Target</th><th>Oman only</th><th>+ Meteor Crater, Atacama</th></tr>' + rows + '</table><p class="sub">GAP = no square we hold is as close to the target as the closest 5% of Earth-square pairs are to each other.</p>';
  }

  function renderBlind() {
    var b = D.results.blind_test, h = '<p class="sub">The scorer never sees site names, groups or coordinates, only terrain numbers. Afterwards we look up where known practice sites landed among all ' + D.results.n_earth_windows + ' Earth squares (lower % = better).</p><table><tr><th>Known site</th><th>Rank on best Mars target</th><th>Rank on average over Mars targets</th></tr>';
    b.forEach(function (x) { h += '<tr><td>' + esc(x.site) + '</td><td class="mono">top ' + x.top_pct_best_mars_target + '%</td><td class="mono">top ' + x.top_pct_mean_over_mars_targets + '%</td></tr>'; });
    h += '</table><div class="limits"><b>Honest reading.</b> The AMADEE-18 area (Marmul, about 15 km radius, approximate) ranks top ' + b[0].top_pct_mean_over_mars_targets + '% on average over Mars targets but only top ' + b[0].top_pct_best_mars_target + '% on its single best target. Meteor Crater ranks well on average (top ' + b[1].top_pct_mean_over_mars_targets + '%); the Atacama tile is mid-table on average (top ' + b[2].top_pct_mean_over_mars_targets + '%) because it is mostly steep Andes terrain. A site ranking high is a sanity check, not proof.</div>';
    $('blind').innerHTML = h;
  }

  function renderSecond() {
    var s = D.second, h = '<p class="sub">Slope recomputed by an independent code path (integer block means + Sobel, native reads): ' + s.rows.filter(function (r) { return r.pass; }).length + ' of ' + s.rows.length + ' windows agree (' + esc(s.tolerance) + ').</p>';
    h += '<p class="sub">Leave-one-out sensitivity (targets in GAP, Oman only): ' + D.results.sensitivity.map(function (x) { return x.left_out + ': ' + x.oman_only.gap; }).join(', ') + '.</p>';
    $('second').innerHTML = h;
  }

  function renderReplay() {
    var t = st.target, M = 12, mar = D.earth.filter(function (e) { var dx = (e.lon - 55.23) * 111.32 * Math.cos(e.lat * Math.PI / 180), dy = (e.lat - 18.19) * 111.32; return Math.sqrt(dx * dx + dy * dy) <= 15; });
    if (!mar.length) { $('replay').innerHTML = '<p>No squares near Marmul in the data.</p>'; return; }
    SC.rankAll(D.earth, t);
    var ranks = mar.map(function (e) { return e.rank; }).sort(function (a, b) { return a - b; }), med = ranks[Math.floor(ranks.length / 2)];
    var needs = { tlo: 5, thi: 35, wmin: 0, wmax: 12, rhmax: 100, smin: 4 };
    var avg = { tmax: [], tmin: [], wind: [], rh: [], srad: [] };
    for (var m = 0; m < M; m++) Object.keys(avg).forEach(function (k) { avg[k].push(mar.reduce(function (s, e) { return s + climate(e)[k][m]; }, 0) / mar.length); });
    var fits = N.allFits(avg, needs), best = N.bestMonths(fits), feb = fits[1], mx = Math.max.apply(null, fits);
    var strip = '<div class="strip">' + fits.map(function (f, i) { var k = N.needTier(f), star = best.indexOf(i) >= 0; return '<div class="mc ' + k + (star ? ' best' : '') + '"><span>' + N.MON[i].charAt(0) + '</span><b>' + Math.round(f) + '</b><i>' + (star ? '★' : (k === 'gap' ? '×' : (k === 'partial' ? '~' : '✓'))) + '</i></div>'; }).join('') + '</div>';
    var verdict = best.indexOf(1) >= 0 ? 'The planner picks February among its best months.' : 'The planner does NOT pick February as a best month (best: ' + N.monthsText(best) + ', fit ' + Math.round(mx) + '). February still scores ' + Math.round(feb) + ' (' + (N.needTier(feb) === 'match' ? 'a good month' : N.needTier(feb) === 'partial' ? 'a partial month' : 'a poor month') + ') under these assumptions.';
    $('replay').innerHTML = '<p class="sub">Region: Marmul area, Dhofar (approximate; the exact AMADEE-18 site is not confirmed). ' + mar.length + ' squares within 15 km of 18.19&deg;N 55.23&deg;E.</p>' +
      '<p><b>Terrain:</b> median rank top ' + Math.max(1, Math.round(med * 100)) + '% of ' + D.earth.length + ' squares for target <b>' + esc(t.name) + '</b> (change the target on the Planner tab).</p>' +
      '<p><b>Test needs used (our assumption, not the mission\'s):</b> field work with day max ≤ 35 °C, night min ≥ 5 °C, sunlight ≥ 4 kWh/m²/day. Source: ' + esc(climate(mar[0]).src) + '.</p>' + strip +
      '<p class="best">Planner\'s best months: <b>' + esc(N.monthsText(best)) + '</b></p><p><b>Real mission:</b> the AMADEE-18 field phase ran in <b>February 2018</b> in the Dhofar region of Oman (Austrian Space Forum, oewf.org/en/amadee-18).</p><p><b>Verdict:</b> ' + esc(verdict) + '</p>' +
      '<div class="limits"><b>Honest reading.</b> The mission\'s real constraints (logistics, team schedule, season for the local hosts) are unknown to us, so a different month does not mean the planner is wrong or the mission was. Climate is a typical-year average, not February 2018 weather.</div>' +
      '<div class="btns"><button id="rp-go">Show these squares on the map</button></div>';
    var go = $('rp-go'); if (go) go.onclick = function () { FIELDS.forEach(function (f) { if (needs[f] !== undefined) st.n[f] = needs[f]; }); syncInputs(); document.querySelector('.tab[data-view=map]').click(); map.setView([18.19, 55.23], 9); sel = mar[0]; renderAll(); };
  }

  // share link
  function writeHash() {
    var p = ['t=' + st.target.id, 'mode=' + st.mode, 'month=' + st.month].concat(FIELDS.map(function (f) { return f + '=' + st.n[f]; }));
    try { history.replaceState(null, '', '#' + p.join('&')); } catch (e) { /* ignore */ }
  }
  function readHash() {
    if (!location.hash) return;
    location.hash.slice(1).split('&').forEach(function (kv) {
      var a = kv.split('='), k = a[0], v = decodeURIComponent(a[1] || '');
      if (k === 't') { var t = D.targets.filter(function (x) { return x.id === v; })[0]; if (t) { st.target = t; $('target').value = t.id; } }
      else if (k === 'mode' && /^(both|terrain|needs)$/.test(v)) { st.mode = v; $('mode').value = v; }
      else if (k === 'month' && (v === 'best' || (+v >= 0 && +v < 12))) { st.month = v; $('month').value = v; }
      else if (FIELDS.indexOf(k) >= 0 && isFinite(+v)) st.n[k] = +v;
    });
  }
})();
