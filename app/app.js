(function () {
  'use strict';
  var GROUPS = { oman_muscat: 'Oman (Muscat area)', oman_dhofar: 'Oman (Dhofar)', oman90: 'Searched area, 90 m data (whole Oman box; includes land near the border)', meteor_crater: 'Meteor Crater area, Arizona (outside Oman)', atacama: 'Atacama / Andes edge, Chile (outside Oman)' };
  var N = window.UENeeds, D = {}, SC, map, rects = {}, sel = null, selB = null, cmpNext = false, R3D_META = null;
  var st = { cal: [], split: false, noCand: false, nearest: null, weights: { terrain: 1, temp: 1, wind: 1, dry: 1, sun: 1, swing: 1, access: 0 }, target: null, mode: 'both', month: 'best', n: Object.assign({}, N.DEFAULT) };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };
  var LABEL = { match: 'GOOD', partial: 'PARTIAL', gap: 'WEAK', none: 'NO CANDIDATE' };
  var GLABEL = { match: 'MATCH', partial: 'PARTIAL', gap: 'NO QUALIFYING CANDIDATE' };
  var SLOPE_REF = 'Observed reference points, not limits: Curiosity maximum tilt 25.34° through sol 2488 (Rankin et al., JPL, 2019); Opportunity tilt 32° on 2016-03-10 (JPL news, 2016-03-31); Perseverance climbed about 20° on slippery sand (JPL news, 2024-10-28). The slope limit here is user-set.';
  var POWER_NOTE = 'NASA POWER climatology v2.10.1, community RE, years 2001-2025. T2M_MAX and T2M_MIN (2 m air, °C), WS2M (wind, m/s), RH2M (%), ALLSKY_SFC_SW_DWN (sunlight, kWh/m²/day). Temperature, wind and humidity cells are about 50 km (0.5 x 0.625°); solar is about 110 km (1°). Regional and approximate.';
  var AMADEE_NEEDS = { tlo: 5, thi: 35, wmin: 0, wmax: 12, rhmax: 100, smin: 4, swmax: 60 };
  var COL = { match: '#17766a', partial: '#d9a63a', gap: '#a23d4a' };
  var FIELDS = ['tlo', 'thi', 'wmin', 'wmax', 'rhmax', 'smin', 'swmax', 'limit'];

  function load(f, opt) { return fetch('data/' + f).then(function (r) { if (!r.ok) { if (opt) return null; throw new Error(f + ' ' + r.status); } return r.json(); }).catch(function (e) { if (opt) return null; throw e; }); }
  Promise.all([load('meta.json'), load('earth.json'), load('targets.json'), load('results.json'), load('second_check.json'), load('climate_power.json'), load('landcover.json', true), load('baseline.json', true), load('stability.json', true), load('notes.json', true), load('access.json', true), load('jezero.json', true), load('meteomatics.json', true), load('gale.json', true), load('lithology.json', true), load('thermal_mars.json', true), load('relief3d.json', true)]).then(function (a) {
    D.meta = a[0]; D.earth = a[1]; D.targets = a[2]; D.results = a[3]; D.second = a[4]; D.power = a[5]; D.lc = a[6]; D.base = a[7]; D.stab = a[8]; D.notes = a[9]; D.acc = a[10]; D.jez = a[11]; D.mm = a[12]; D.gale = a[13]; D.lith = a[14]; D.thermal = a[15]; R3D_META = a[16];
    SC = UEScore(D.meta); init();
  }).catch(function (e) {
    var el = $('loaderr'); el.hidden = false; el.textContent = 'Could not load the data files (' + e.message + '). Reload the page; if it persists the site files are missing.';
  });

  function climate(e) {
    if (e._c) return e._c;
    var c = D.power.cells[D.power.win[e.id]];
    return (e._c = { tmax: c.T2M_MAX, tmin: c.T2M_MIN, wind: c.WS2M, rh: c.RH2M, srad: c.ALLSKY_SFC_SW_DWN, tsmax: c.TS_MAX, tsmin: c.TS_MIN, src: 'NASA POWER climatology 2001-2025 (regional and approximate: temperature, wind and humidity cells about 50 km, solar about 110 km)', coarse: true });
  }

  function init() {
    var tsel = $('target'), html = '';
    ['Mars', 'Moon'].forEach(function (b) {
      html += '<optgroup label="' + b + (b === 'Moon' ? ' (south pole data only)' : '') + '">';
      D.targets.filter(function (t) { return t.body === b; }).sort(function (a, c) { var ra = stabOf(a) && stabOf(a).threshold_sensitive ? 1 : 0, rc = stabOf(c) && stabOf(c).threshold_sensitive ? 1 : 0; return ra - rc; }).forEach(function (t) { html += '<option value="' + t.id + '">' + esc(t.name) + ' (' + robustText(t) + ')</option>'; });
      html += '</optgroup>';
    });
    tsel.innerHTML = html;
    var def = D.targets.filter(function (t) { return t.name === 'Meridiani Planum'; })[0];
    st.target = def; tsel.value = def.id;
    var mh = '<option value="best">Best month for each square</option>';
    N.MON.forEach(function (m, i) { mh += '<option value="' + i + '">' + m + '</option>'; });
    $('month').innerHTML = mh;
    $('limsrc').textContent = SLOPE_REF; renderChips();
        readHash(); initMap(); bind(); syncInputs(); renderAll(); renderBlind(); renderSecond(); renderReplay();
  }

  function lcflag(e) { var v = D.lc && D.lc[e.id]; return !!(v && v[0] + v[1] + v[2] >= 10); }
  function masked(e) { return !!($('mask') && $('mask').checked && lcflag(e)); }
  function tierOf(e) {
    if (st.noCand) return 'none';
    var tt = SC.mapTier(e.rank), nt = N.needTier(e._fit);
    return st.mode === 'terrain' ? tt : (st.mode === 'needs' ? nt : N.worse(tt, nt));
  }

  // NASA GIBS true-colour imagery, optional picture layer, off by default. No login, CORS open (checked 2026-11-15).
  // Core map features never depend on this: it only ever ADDS a layer, and any load problem silently leaves the OSM base shown.
  function addGibsLayer(map) {
    var day = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10); // most recent imagery lags by about a day
    var gibs = L.tileLayer('https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/' + day + '/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg',
      { maxZoom: 9, attribution: 'NASA EOSDIS GIBS (MODIS Terra true colour)' });
    var failed = false;
    gibs.on('tileerror', function () { if (!failed) { failed = true; map.removeLayer(gibs); } });
    return gibs;
  }
  function initMap() {
    map = L.map('map', { zoomControl: true }).setView([20.3, 56.4], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var gibsLayer = null;
    var gt = document.getElementById('gibs_toggle');
    if (gt) gt.addEventListener('change', function () {
      if (gt.checked) { gibsLayer = addGibsLayer(map); gibsLayer.addTo(map); } else if (gibsLayer) { map.removeLayer(gibsLayer); gibsLayer = null; }
    });
    var r = L.svg({ padding: 0.5 }); r.addTo(map);
    var ns = 'http://www.w3.org/2000/svg', defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#f3dfe0"/><rect width="3" height="6" fill="#a23d4a"/></pattern>';
    r._container.insertBefore(defs, r._container.firstChild);
    var bounds = [];
    D.earth.filter(function (e) { return e.group.indexOf('oman') === 0; }).forEach(function (e) {
      var dlat = 5 / 111.32, dlon = 5 / (111.32 * Math.cos(e.lat * Math.PI / 180));
      var b = [[e.lat - dlat, e.lon - dlon], [e.lat + dlat, e.lon + dlon]];
      var rc = L.rectangle(b, { renderer: r, weight: 1, color: '#f5f4ef', fillOpacity: 0.85 }).addTo(map);
      rc.on('click', function () { pick(e); });
      rc.bindTooltip(function () { return 'Terrain top ' + Math.max(1, Math.round(e.rank * 100)) + '% | ' + (e._best.length ? 'best ' + N.monthsText(e._best) : 'no month fits'); }, { sticky: true });
      rects[e.id] = rc; bounds.push(b[0], b[1]);
    });
    state_views = { dhofar: [[16.9, 53.9], [19.0, 56.1]], muscat: [[22.9, 57.9], [24.1, 59.1]], all: bounds, oman: [[16.5, 52], [26.5, 60]] };
    map.fitBounds(state_views.dhofar, { padding: [20, 20] });
    var ctl = L.control({ position: 'topright' });
    ctl.onAdd = function () {
      var d = L.DomUtil.create('div', 'viewbtns');
      d.innerHTML = '<button data-v="dhofar">Dhofar</button><button data-v="muscat">Muscat</button><button data-v="all">All Oman</button><button data-v="oman">Oman box</button>';
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
    $('copylink').addEventListener('click', function () {
      writeHash(); var u = location.href;
      (navigator.clipboard ? navigator.clipboard.writeText(u) : Promise.reject()).then(function () { $('copied').textContent = 'copied'; }, function () { $('copied').textContent = 'copy the address bar'; });
    });
    $('mask').addEventListener('change', renderAll);
    bindSky();
    $('show90').addEventListener('change', function () { set90($('show90').checked); });
    $('demobar').addEventListener('click', function (ev) { var k = ev.target.getAttribute('data-demo'); if (k) runDemo(k); });
    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
        document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('on'); });
        $('v-' + b.dataset.view).classList.add('on');
        if (b.dataset.view === 'gap') renderGapTable();
        if (b.dataset.view === 'replay') renderReplay();
        if (b.dataset.view === 'cal') renderCal();
        if (b.dataset.view === 'base') renderBase();
        if (b.dataset.view === 'jez') renderJezero();
        if (b.dataset.view === 'sky') renderSky();
        if (b.dataset.view === 'world') renderWorld();
      });
    });
    document.addEventListener('click', function (ev) {
      var a = ev.target.getAttribute && ev.target.getAttribute('data-act');
      if (a === 'brief') openBrief(); else if (a === 'cmp') { cmpNext = true; $('result').insertAdjacentHTML('afterbegin', '<p class="hint">Now click a second square to compare.</p>'); }
      else if (a === 'addcal') { addCal(); } else if (a === 'clearcal') { st.cal = []; renderCal(); } else if (a === 'closebrief') $('brief').hidden = true; else if (a === 'print') window.print(); else if (a === 'clearb') { selB = null; renderResult(); }
      else if (a === 't3d') openT3D(); else if (a === 'rot3d') { t3d.angle += (+ev.target.getAttribute('data-dir')) * 0.35; renderT3D(); } else if (a === 'closet3d') $('t3d').hidden = true;
    });
  }

  var EXAMPLES = ['rover test, slopes up to 20 degrees, dry', 'wind below 5 m/s, sun at least 5, between 10 and 30 degrees', 'cold, calm'];
  function renderChips() {
    $('chips').innerHTML = '<span class="sub">Examples:</span> ' + EXAMPLES.map(function (x, i) { return '<button data-ex="' + i + '">' + esc(x) + '</button>'; }).join('');
    $('chips').onclick = function (ev) { var k = ev.target.getAttribute('data-ex'); if (k !== null) { $('sentence').value = EXAMPLES[+k]; applySentence(); } };
  }
  function applySentence() {
    var r = N.parseSentence($('sentence').value, st.n);
    if (r.refused) {
      $('understood').innerHTML = 'I could not understand that, so nothing was changed. I only know: preset names (rover, instrument, walking, cold), slope limits, temperature ranges in °C, wind in m/s, humidity %, sunlight kWh/m²/day, and words like dry, calm, windy, sunny, hot, cold.' + (r.unknown.length ? ' Not understood: ' + esc(r.unknown.join(', ')) + '.' : '');
      return;
    }
    st.needs_said = r.said; st.n = r.needs;
    $('understood').innerHTML = '<b>Understood:</b> ' + r.said.map(function (x) { return esc(x.text); }).join('; ') + '.' + (r.unknown.length ? ' <b>Not understood and ignored:</b> ' + esc(r.unknown.join(', ')) + '.' : '') + ' Check the sliders.';
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
    $('swv').textContent = n.swmax < 60 ? '≤ ' + n.swmax + ' °C' : 'not limited';
    $('limval').textContent = n.limit + '°';
  }

  function allSq() { return st.show90 && D.e90 ? D.earth.concat(D.e90) : D.earth; }
  function lowerBound(a, x) { var lo = 0, hi = a.length; while (lo < hi) { var m = (lo + hi) >> 1; if (a[m] < x) lo = m + 1; else hi = m; } return lo; }
  function addRects90() {
    if (!D.e90 || D.e90._drawn) return; D.e90._drawn = true;
    var r = map._rend90 || L.svg({ padding: 0.5 }); if (!map._rend90) { map._rend90 = r; r.addTo(map); }
    D.e90.forEach(function (e) {
      var dlat = 5 / 111.32, dlon = 5 / (111.32 * Math.cos(e.lat * Math.PI / 180));
      var rc = L.rectangle([[e.lat - dlat, e.lon - dlon], [e.lat + dlat, e.lon + dlon]], { renderer: r, weight: 0.5, color: '#f5f4ef', fillOpacity: 0.6 }).addTo(map);
      rc.on('click', function () { pick(e); }); rects[e.id] = rc;
    });
  }
  function set90(on) {
    st.show90 = on;
    if (on && !D.e90) { fetch('data/earth90.json').then(function (r) { return r.json(); }).then(function (a) { D.e90 = a; addRects90(); renderAll(); }).catch(function () { $('show90').checked = false; st.show90 = false; }); return; }
    if (on) addRects90();
    D.e90 && D.e90.forEach(function (e) { var rc = rects[e.id]; if (rc) rc.setStyle({ opacity: on ? 1 : 0, fillOpacity: on ? 0.6 : 0, interactive: on }); if (rc && rc._path) rc._path.style.display = on ? '' : 'none'; });
    renderAll();
  }
  function recompute() {
    SC.rankAll(D.earth, st.target);
    if (st.show90 && D.e90) {
      var pd = D.earth.map(function (e) { return e.d; }).sort(function (a, b) { return a - b; });
      D.e90.forEach(function (e) { e.d = SC.distance(e, st.target); e.rank = lowerBound(pd, e.d) / pd.length; });
    }
    var bo0 = bestOf(function (e) { return e.group.indexOf('oman') === 0; });
    st.noCand = !!bo0 && SC.gapTier(bo0.d) === 'gap'; st.nearest = bo0 ? bo0.id : null;
    allSq().forEach(function (e) {
      e._fits = N.allFits(climate(e), st.n); e._best = N.bestMonths(e._fits);
      e._fit = st.month === 'best' ? Math.max.apply(null, e._fits) : e._fits[+st.month];
      e._tier = tierOf(e);
    });
  }

  function renderAll() {
    recompute(); var t = st.target;
    $('hook').innerHTML = '<b>Where and when</b> to rehearse a job like <b>' + esc(t.name) + '</b> (' + t.body + '). Each square is 10 km. ' + (st.noCand ? '<b>No qualifying candidate in the searched area for this target:</b> squares are grey; the nearest one is outlined. ' : '') +
      (st.noCand ? '' : st.mode === 'terrain' ? 'Colour = terrain match.' : (st.mode === 'needs' ? 'Colour = fit to your test needs.' : 'Colour = terrain match AND a month that fits your test.'));
    allSq().forEach(function (e) {
      var rc = rects[e.id]; if (!rc) return;
      var k = e._tier, isSel = (sel && sel.id === e.id) || (selB && selB.id === e.id);
      var near = st.noCand && st.nearest === e.id, mk = masked(e);
      var fillc = k === 'gap' ? 'url(#hatch)' : (k === 'none' ? '#848a92' : COL[k]);
      rc.setStyle({ fillColor: fillc, fillOpacity: mk ? 0.2 : (k === 'gap' ? 0.9 : (k === 'none' ? 0.55 : 0.8)), weight: isSel || near ? 3 : 1, color: isSel || near ? '#1c1f23' : '#f5f4ef', dashArray: mk ? '3 4' : null });
      if (rc._path) rc._path.setAttribute('fill', fillc);
    });
    renderGapCard(); renderResult(); writeHash();
    if ($('v-gap').classList.contains('on')) renderGapTable();
    if ($('v-replay').classList.contains('on')) renderReplay();
  }

  function bestOf(f) { var b = null; D.earth.forEach(function (e) { if (f(e) && !masked(e) && (!b || e.d < b.d)) b = e; }); return b; }

  function accessOf(e) { return D.acc && D.acc[e.id] ? D.acc[e.id] : null; }
  function accessLine(e) {
    var a = accessOf(e);
    return a ? 'Nearest paved or main road ' + a[0] + ' km; nearest town ' + (a[2] ? a[2] + ' ' : '') + a[1] + ' km. Source: OpenStreetMap contributors (ODbL). Not space data; permission to enter is unverified.' : 'No access data (outside the OpenStreetMap extract for Oman).';
  }
  function notesHtml(e) {
    var n = D.notes && D.notes[e.group];
    var lith = D.lith && D.lith.by_id && D.lith.by_id[e.id];
    var lithLine = lith ? '<p class="note">Rock type on real data (GLiM, not a score): <b>' + esc(lith.name) + '</b>. 0.5&deg; cell (about 55 km), coarse; a class for the whole cell, not proof of this square\'s composition; source: ' + esc(D.lith.source) + '.</p>' : '';
    if (!n && !lithLine) return '';
    if (!n) return '<div class="geo">' + lithLine + '</div>';
    return '<div class="geo"><h3>' + esc(n.title) + '</h3><ul>' + n.notes.map(function (x) { return '<li>' + esc(x.text) + ' <small>(' + esc(x.source) + ')</small></li>'; }).join('') + '</ul>' + lithLine + '<small>' + esc(n.caveat) + '</small></div>';
  }
  function robustText(t) { var x = stabOf(t); return x ? (x.threshold_sensitive ? 'threshold-sensitive' : 'robust') : 'not checked'; }
  function stabOf(t) { if (!D.stab) return null; var r = D.stab.summary.filter(function (x) { return x.target === t.name; })[0]; return r || null; }

  function renderGapCard() {
    var bo = bestOf(function (e) { return e.group.indexOf('oman') === 0; }), shown = bo.d, extra = [];
    [['meteor_crater', 's_meteor'], ['atacama', 's_atacama']].forEach(function (x) {
      if ($(x[1]).checked) { var b = bestOf(function (e) { return e.group === x[0]; }); extra.push({ g: x[0], b: b }); if (b.d < shown) shown = b.d; }
    });
    var k0 = SC.gapTier(bo.d), kk = SC.gapTier(shown), improved = shown < bo.d;
    $('badge').textContent = GLABEL[kk]; $('badge').className = 'badge ' + (kk === 'gap' ? 'none' : kk);
    $('gcscore').textContent = 'top ' + Math.max(1, Math.round(bo.rank * 100)) + '%';
    var txt = k0 === 'gap' ? 'No qualifying candidate in the searched area for this target (not all of Earth). Nearest square is outlined on the map.' : (k0 === 'partial' ? 'The searched area is a partial match only.' : 'The searched area has a strong terrain match (best fit among the squares we searched).');
    var sn = stabOf(st.target); if (sn) txt += (sn.threshold_sensitive ? ' THRESHOLD-SENSITIVE: the tier changes with window size, cell size or threshold (' + sn.tiers_seen.map(function (k) { return GLABEL[k]; }).join(' / ') + '); ' : ' ROBUST: same tier in all 8 settings; ') + 'the best square in the searched area is closer than ' + sn.band_pct[0] + '-' + sn.band_pct[1] + '% of Earth-square pairs.';
    if (extra.length && improved && kk !== k0) txt = 'Searched area alone: ' + GLABEL[k0] + '. With the second site: ' + GLABEL[kk] + '.';
    else if (extra.length) txt = 'The second site does not improve on the searched area here.';
    $('gctext').textContent = txt;
    var lines = ['Searched area alone: ' + GLABEL[k0] + ' (distance ' + bo.d.toFixed(2) + ')'];
    extra.forEach(function (x) { lines.push(GROUPS[x.g] + ': ' + GLABEL[SC.gapTier(x.b.d)] + ' (distance ' + x.b.d.toFixed(2) + ') at ' + x.b.lat.toFixed(2) + ', ' + x.b.lon.toFixed(2)); });
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

  function hav2(a, b, c, d) { var p = Math.PI / 180, x = Math.sin((c - a) * p / 2) * Math.sin((c - a) * p / 2) + Math.cos(a * p) * Math.cos(c * p) * Math.sin((d - b) * p / 2) * Math.sin((d - b) * p / 2); return 12742 * Math.asin(Math.sqrt(x)); }
  function meteomaticsNear(e) {
    if (!D.mm) return null;
    var best = null, bd = 1e9;
    Object.keys(D.mm.points).forEach(function (k) { var p = D.mm.points[k], dk = hav2(e.lat, e.lon, p.lat, p.lon); if (dk < bd) { bd = dk; best = { key: k, p: p }; } });
    return (best && bd <= 30) ? { name: best.key, dist: bd, p: best.p } : null;
  }
  function meteomaticsLine(e, m) {
    var near = meteomaticsNear(e); if (!near) return '';
    var mx = near.p['t_max_2m_24h:C'], mn = near.p['t_min_2m_24h:C']; if (!mx || !mn) return '';
    var c = climate(e), dmax = Math.round(mx[m] - c.tmax[m]), dmin = Math.round(mn[m] - c.tmin[m]);
    return '<p class="sub"><b>Meteomatics, saved ' + D.mm.saved + '</b> (' + esc(D.mm.attribution) + '), nearest point "' + esc(near.name) + '" ' + near.dist.toFixed(0) + ' km away, ' + N.MON[m] + ': day max ' + mx[m].toFixed(1) + ' °C, night min ' + mn[m].toFixed(1) + ' °C (NASA POWER for the same month and point: ' + c.tmax[m].toFixed(1) + ' / ' + c.tmin[m].toFixed(1) + ' °C; the two sources disagree here by ' + dmax + ' / ' + dmin + ' °C — Meteomatics is a point value, POWER is a ~50 km regional cell).</p>';
  }

  function monthNotes(e) {
    var c = climate(e), n = st.n, why = [];
    for (var m = 0; m < 12; m++) {
      if (e._fits[m] >= 75) continue;
      var f = N.monthFactors(c, m, n), k = Object.keys(f).sort(function (a, b) { return f[a] - f[b]; })[0], t;
      if (k === 'temp') t = c.tmax[m] > n.thi ? 'day max ' + c.tmax[m].toFixed(0) + ' °C above ' + n.thi : 'night min ' + c.tmin[m].toFixed(0) + ' °C below ' + n.tlo;
      else if (k === 'wind') t = 'wind ' + c.wind[m].toFixed(1) + ' m/s outside ' + n.wmin + '-' + n.wmax;
      else if (k === 'dry') t = 'humidity ' + Math.round(c.rh[m]) + '% above ' + n.rhmax + '%';
      else if (k === 'swing') t = 'day-night swing ' + (c.tmax[m] - c.tmin[m]).toFixed(0) + ' °C above ' + n.swmax + ' °C';
      else t = 'sunlight ' + c.srad[m].toFixed(1) + ' below ' + n.smin + ' kWh/m²/day';
      why.push(N.MON[m] + ': ' + t);
    }
    var sorted = e._fits.map(function (f, i) { return [f, i]; }).sort(function (a, b) { return b[0] - a[0]; }), close = '';
    if (sorted[0][0] >= 50 && sorted[1][0] >= sorted[0][0] - 5) close = '<p class="note"><b>Close months:</b> ' + sorted.filter(function (x) { return x[0] >= sorted[0][0] - 5; }).slice(0, 4).map(function (x) { return N.MON[x[1]] + ' (' + Math.round(x[0]) + ')'; }).join(', ') + ' are within 5 points, so the top month is not clearly ahead.</p>';
    var bestm = e._best.length ? e._best[0] : e._fits.indexOf(Math.max.apply(null, e._fits));
    return close + '<details class="why"><summary>Why months fail, and the data behind the strip</summary><p>' + (why.length ? esc(why.join('; ')) + '.' : 'Every month fits (75 or more).') + '</p><p class="sub">' + esc(POWER_NOTE) + '</p>' + meteomaticsLine(e, bestm) + '</details>';
  }

  function confidence(e) {
    var c = climate(e), items = ['Terrain: surface model (includes trees and buildings), 500 m cells'];
    items.push('Climate: NASA POWER, regional and approximate (temperature, wind, humidity about 50 km cells; solar about 110 km), typical year');
    if (e.group === 'oman90') items.push('90 m terrain data, land cover not checked');
    if (lcflag(e)) items.push('Square has 10% or more trees, crops or buildings (ESA WorldCover): the surface model may overstate roughness');
    if (e.group === 'oman_dhofar' && e.approx) items.push('Site location approximate');
    var low = c.coarse || e.group.indexOf('oman') !== 0 || lcflag(e) || e.group === 'oman90';
    return { level: low ? 'Medium-low' : 'Medium', items: items };
  }

  function swingText(e) {
    var c = climate(e), sw = c.tmax.map(function (x, i) { return x - c.tmin[i]; }), mean = sw.reduce(function (a, b) { return a + b; }, 0) / 12;
    return 'yearly mean ' + mean.toFixed(1) + ' °C (range ' + Math.min.apply(null, sw).toFixed(1) + '-' + Math.max.apply(null, sw).toFixed(1) + '). Earth air temperature on 50 km cells: it is NOT a thermal-inertia or rock/dust measure and is not comparable with Moon or Mars surface values.';
  }

  function thermalLine(e) {
    var c = climate(e);
    var tsw = c.tsmax.map(function (x, i) { return x - c.tsmin[i]; }), mean = tsw.reduce(function (a, b) { return a + b; }, 0) / 12;
    var txt = 'Earth square, NASA POWER day-night SKIN temperature swing (not air temperature; MERRA-2): yearly mean ' + mean.toFixed(1) + ' °C (range ' + Math.min.apply(null, tsw).toFixed(1) + '-' + Math.max.apply(null, tsw).toFixed(1) + '°C).';
    var th = st.target.body === 'Mars' && D.thermal && D.thermal.sites && D.thermal.sites[st.target.name];
    if (th) txt += ' Target (' + st.target.name + ') real thermal inertia: ' + th.ti_si + ' SI units (J m^-2 K^-1 s^-1/2), USGS/ASU THEMIS mosaic, 100 m/px.';
    else if (st.target.body === 'Mars') txt += ' No THEMIS thermal inertia value for this target (data gap).';
    else txt += ' THEMIS thermal inertia only exists for Mars; no equivalent is used for the Moon here.';
    return txt + ' Different physical quantities and units (skin-temperature swing vs SI thermal inertia): not directly comparable, context only, not scored.';
  }

  function metricRows(e) {
    var t = st.target, n = st.n;
    return [['Terrain rank for this target', 'top ' + Math.max(1, Math.round(e.rank * 100)) + '% of ' + D.earth.length + ' squares'],
      ['Median / 90th pct slope', e.slope_p50.toFixed(1) + '° / ' + e.slope_p90.toFixed(1) + '° (target ' + t.slope_p50.toFixed(1) + '° / ' + t.slope_p90.toFixed(1) + '°)'],
      ['Roughness 500 m / 1 km', e.rough_med.toFixed(1) + ' m / ' + e.rough1k_med.toFixed(1) + ' m (target ' + t.rough_med.toFixed(1) + ' / ' + t.rough1k_med.toFixed(1) + ')'],
      ['Relief', Math.round(e.relief_m) + ' m (target ' + Math.round(t.relief_m) + ' m)'],
      ['Share of cells below ' + n.limit + '° slope (user-set)', Math.round(SC.trav(e, n.limit) * 100) + '% (target ' + Math.round(SC.trav(t, n.limit) * 100) + '%)'],
      ['Day-night air temperature swing, NASA POWER (rough proxy, context only, not scored)', swingText(e)],
      ['Thermal inertia / rock-material proxy (real data, context only, not scored)', thermalLine(e)],
      ['Best months for your test', e._best.length ? N.monthsText(e._best) : 'none fits']];
  }

  function chart(e) {
    var cv = $('slopechart'); if (!cv) return;
    var ctx = cv.getContext('2d'), W = cv.width, H = cv.height, t = st.target, nb = 16;
    function dist(w) { var m = new Array(nb).fill(0), tot = 0; for (var a = 0; a < D.meta.slope_edges.length - 1; a++) { var bin = Math.min(nb - 1, Math.floor(D.meta.slope_edges[a])); var cnt = 0; for (var b = 0; b < D.meta.rough_edges.length - 1; b++) cnt += w.hist[a * (D.meta.rough_edges.length - 1) + b]; m[bin] += cnt; tot += cnt; } return m.map(function (x) { return x / tot; }); }
    var a = dist(e), b = dist(t), mx = Math.max.apply(null, a.concat(b)) || 1;
    ctx.clearRect(0, 0, W, H); var bw = (W - 20) / nb;
    for (var i = 0; i < nb; i++) {
      ctx.fillStyle = '#6b7280'; ctx.fillRect(10 + i * bw, H - 18 - (H - 30) * b[i] / mx, bw * 0.42, (H - 30) * b[i] / mx);
      ctx.fillStyle = '#17766a'; ctx.fillRect(10 + i * bw + bw * 0.46, H - 18 - (H - 30) * a[i] / mx, bw * 0.42, (H - 30) * a[i] / mx);
    }
    ctx.fillStyle = '#585e66'; ctx.font = '11px "IBM Plex Sans", system-ui'; ctx.fillText('slope 0°', 10, H - 4); ctx.fillText('15°+', W - 36, H - 4);
  }


  function verdictHtml(e) {
    var c = climate(e), m = e._best.length ? e._best[0] : e._fits.indexOf(Math.max.apply(null, e._fits));
    if (st.month !== 'best') m = +st.month;
    var mf = N.monthFactors(c, m, st.n), f = { terrain: N.terrainFit(SC.distance(e, st.target), D.meta.thr_match_dist, D.meta.thr_partial_dist), temp: mf.temp, wind: mf.wind, dry: mf.dry, sun: mf.sun, swing: mf.swing };
    var ac = accessOf(e); if (ac) f.access = Math.round(100 * (1 - Math.max(0, Math.min(1, (ac[0] - 5) / 45))));
    var v = N.fitVerdict(f, st.weights), cf = N.confidenceLevel(e.group.indexOf('oman') === 0, !!e.approx);
    var cls = v.overall >= 75 ? 'match' : (v.overall >= 50 ? 'partial' : 'gap');
    var fix = v.worst === 'terrain' ? 'A second site with closer terrain would help most (tick one above).' : 'A different month or relaxed ' + v.worstName.toLowerCase() + ' needs would help most.';
    var bars = Object.keys(f).map(function (k) {
      return '<div class="vrow"><label>' + N.FACTOR_NAMES[k] + '</label><div class="vbar"><i class="' + (f[k] >= 75 ? 'match' : (f[k] >= 50 ? 'partial' : 'gap')) + '" style="width:' + Math.round(f[k]) + '%"></i></div><b>' + Math.round(f[k]) + '</b><input type="range" min="0" max="3" step="1" value="' + st.weights[k] + '" data-w="' + k + '" aria-label="Weight for ' + N.FACTOR_NAMES[k] + '"></div>';
    }).join('');
    return '<div class="verdict ' + cls + '"><div class="vhead">Best fit for your test: <b>' + v.overall + '%</b> &middot; ' + v.label + '</div><p class="sub"><b>User-weighted soft score, not similarity and not a success chance.</b></p><p class="sub">Here is what is missing: weakest factor is ' + esc(v.worstName) + ' (' + Math.round(f[v.worst]) + '). ' + fix + ' Month used: ' + N.MON[m] + '. Confidence: ' + cf + ' (terrain ' + (e.group.indexOf('oman') === 0 ? '30 m source' : 'outside site') + ', climate about 50 km).</p>' + bars + '<small>Access (OpenStreetMap, not space data) is 100 within 5 km of a paved or main road and 0 at 50 km or more (our assumption); its weight starts at 0. Sliders set each factor weight 0-3 (0 = ignore). Rule-based fit from our assumptions, not a mission verdict.</small></div>';
  }


  function twinHtml(e) {
    if (e.group === 'oman90') return '';
    var nat = { Mars: '463 m (MOLA), upsampled to the picture grid, no extra detail', Moon: '80 m (LOLA), area-averaged to the picture grid' }[st.target.body];
    var can3d = R3D_META && R3D_META.by_id[st.target.id] && R3D_META.by_id[e.id];
    return '<h3>Twin pictures</h3><div class="twins"><figure><img src="data/relief/' + st.target.id + '.png" alt="Shaded relief of ' + esc(st.target.name) + '" width="64" height="64"><div class="bar5"><i></i><span>5 km</span></div><figcaption>' + esc(st.target.name) + '<br>native ' + nat + '</figcaption></figure>' +
      '<figure><img src="data/relief/' + e.id + '.png" alt="Shaded relief of this Earth square" width="64" height="64"><div class="bar5"><i></i><span>5 km</span></div><figcaption>This Earth square<br>native 30 m (Copernicus surface model), area-averaged to the picture grid</figcaption></figure></div>' +
      '<small>Each picture is 10 km wide on a 64 x 64 grid (156 m per pixel), same sun (from top left, 45° high) and 3x height exaggeration. Resampled for the picture only; the scores use 500 m cells.</small>' +
      (can3d ? '<div class="btns"><button data-act="t3d">View in 3D (same data as the twin pictures)</button></div>' : '');
  }

  // ---- 3D view: the SAME 64x64 relief grid as the twin pictures (pipeline/relief3d.py), real elevation,
  // never invented. Lazy-loaded once (about 5 MB), same 3x height exaggeration as the pictures.
  var R3D = null, t3d = { tid: null, eid: null, angle: 0.78 };
  function loadR3D(cb) {
    if (R3D || !R3D_META) return cb();
    fetch('data/relief3d.bin').then(function (r) { return r.arrayBuffer(); }).then(function (buf) { R3D = new DataView(buf); cb(); }).catch(function () { cb(); });
  }
  function heightsFor(id) {
    var m = R3D_META.by_id[id]; if (!m) return null;
    var px = R3D_META.px, n = px * px, h = new Float64Array(n);
    for (var i = 0; i < n; i++) h[i] = R3D.getInt16(m.off + 2 * i, true);
    return { px: px, h: h, z_min: m.z_min, z_max: m.z_max };
  }
  function draw3D(cv, id, label, nativeTxt) {
    var hf = heightsFor(id); if (!hf) return;
    var PX = hf.px, h = hf.h, EXAG = R3D_META.exag || 3, c = cv.getContext('2d'), W = cv.width, H = cv.height;
    c.clearRect(0, 0, W, H); c.fillStyle = '#05080f'; c.fillRect(0, 0, W, H);
    var scale = Math.min(W, H) / (PX * 1.15), cx = W / 2, cy = H * 0.22, maxh = Math.max.apply(null, h) * EXAG || 1, a = t3d.angle;
    var ca = Math.cos(a), sa = Math.sin(a);
    function proj(x, y, z) {
      var rx = x * ca - y * sa, ry = x * sa + y * ca;
      return [cx + rx * scale * 0.86, cy + ry * scale * 0.5 - z / maxh * scale * (PX * 0.55)];
    }
    for (var y = 0; y < PX - 1; y++) for (var x = 0; x < PX - 1; x++) {
      var z00 = h[y * PX + x] * EXAG, z10 = h[y * PX + x + 1] * EXAG, z01 = h[(y + 1) * PX + x] * EXAG, z11 = h[(y + 1) * PX + x + 1] * EXAG;
      var p00 = proj(x, y, z00), p10 = proj(x + 1, y, z10), p11 = proj(x + 1, y + 1, z11), p01 = proj(x, y + 1, z01);
      var light = 0.35 + 0.65 * ((z00 + z10 + z01 + z11) / 4 / maxh), g = Math.max(25, Math.min(235, Math.round(60 + 175 * light)));
      c.fillStyle = 'rgb(' + g + ',' + Math.round(g * 0.93) + ',' + Math.round(g * 0.85) + ')';
      c.beginPath(); c.moveTo(p00[0], p00[1]); c.lineTo(p10[0], p10[1]); c.lineTo(p11[0], p11[1]); c.lineTo(p01[0], p01[1]); c.closePath(); c.fill();
    }
    $('t3dcap').innerHTML = esc(label) + ' &middot; same data as the twin picture, shown in 3D, vertical exaggeration x' + EXAG + '. Relief ' + Math.round(hf.z_max - hf.z_min) + ' m in this 10 km square (' + esc(nativeTxt) + ').';
  }
  function openT3D() {
    var e = sel, t = st.target; if (!e || !t) return; t3d.eid = e.id; t3d.tid = t.id; t3d.angle = 0.78;
    loadR3D(function () { $('t3d').hidden = false; renderT3D(); });
  }
  function renderT3D() {
    var nat = { Mars: '463 m MOLA, upsampled', Moon: '80 m LOLA, area-averaged' }[st.target.body] || '30 m Copernicus, area-averaged';
    draw3D($('t3dcvA'), t3d.tid, st.target.name, nat);
    draw3D($('t3dcvB'), t3d.eid, 'This Earth square', '30 m Copernicus, area-averaged');
  }

  function renderResult() {
    var el = $('result');
    if (!sel) { el.innerHTML = '<p class="hint">Click a square on the map to see where it fits, when it fits, and what Earth cannot copy.</p>'; return; }
    var e = sel, k = e._tier, c = climate(e), cf = confidence(e);
    var rows = metricRows(e).map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('');
    var sn90 = st.show90 && stabOf(st.target) && stabOf(st.target).threshold_sensitive;
    var h = '<div><span class="chip ' + k + '">' + LABEL[k] + '</span> <span class="chip ' + (stabOf(st.target) && stabOf(st.target).threshold_sensitive ? 'partial' : 'match') + '">' + robustText(st.target) + '</span> <span class="sub">' + esc(GROUPS[e.group]) + ' &middot; ' + e.lat.toFixed(3) + ', ' + e.lon.toFixed(3) + '</span></div>' +
      (sn90 ? '<p class="note">Threshold-sensitive: result changes with the comparison set (this 90 m whole-Oman layer is on). Not a firm match; see docs/VALIDATION.md section 9.</p>' : '') +
      verdictHtml(e) + '<div class="best">Best months: <b>' + (e._best.length ? esc(N.monthsText(e._best)) : 'none fits your test') + '</b></div>' + stripHtml(e) + monthNotes(e) +
      '<small>★ best, ✓ good, ~ partial, × poor (number = fit 0-100, weakest factor). Source: ' + esc(c.src) + '.</small>' +
      '<table>' + rows + '</table><div class="chartbox"><canvas id="slopechart" width="340" height="90"></canvas><small><i class="dot b"></i>target slope spread <i class="dot g"></i>this square</small></div>' +
      twinHtml(e) + '<p class="sub"><b>Access:</b> ' + esc(accessLine(e)) + '</p>' + notesHtml(e) + (e.group === 'oman90' ? '<p class="note">90 m data: coarser than the 30 m squares, shown as an extra layer; land cover was not checked here.</p>' : '') + '<div class="conf"><b>Confidence: ' + cf.level + '.</b> ' + cf.items.map(esc).join('; ') + '.</div>' +
      '<div class="limits"><b>What this test cannot copy.</b> Gravity, thin air and radiation. Real ' + (st.target.body === 'Moon' ? 'lunar' : 'Martian') + ' temperatures: Earth air temperature here only tells you when conditions suit your test. Terrain numbers only see slope and roughness, not rock type or dust. No rock-abundance or dust measure is used. A terrain match is not a geology match. 500 m cells hide rocks and steps. Earth heights include trees and buildings. Climate is a typical-year average.</div>' +
      '<div class="btns"><button data-act="brief">Test site brief (print / PDF)</button><button data-act="addcal">Add to calendar</button><button data-act="cmp">Compare with another square</button></div>';
    if (selB) {
      var A = metricRows(sel), B = metricRows(selB);
      h += '<h3>Compare</h3><table><tr><th></th><th>A ' + sel.lat.toFixed(2) + ', ' + sel.lon.toFixed(2) + '</th><th>B ' + selB.lat.toFixed(2) + ', ' + selB.lon.toFixed(2) + '</th></tr>' + A.map(function (r, i) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td><td>' + esc(B[i][1]) + '</td></tr>'; }).join('') + '</table><button data-act="clearb">Clear B</button>';
    }
    el.innerHTML = h; chart(e);
  }

  function openBrief() {
    if (!sel) return; var e = sel, t = st.target, n = st.n, c = climate(e), cf = confidence(e);
    var second = '';
    var gt = SC.gapTier(bestOf(function (x) { return x.group.indexOf('oman') === 0; }).d);
    if (gt !== 'match') { var alt = bestOf(function (x) { return x.group.indexOf('oman') !== 0; }); if (alt) second = '<p><b>Second-site suggestion:</b> best outside square is ' + esc(GROUPS[alt.group]) + ' at ' + alt.lat.toFixed(2) + ', ' + alt.lon.toFixed(2) + ' (terrain: ' + GLABEL[SC.gapTier(alt.d)] + ').</p>'; }
    var need = 'Air temperature ' + n.tlo + ' to ' + n.thi + ' °C; wind ' + n.wmin + ' to ' + (n.wmax >= 12 ? '12+' : n.wmax) + ' m/s; humidity ' + (n.rhmax >= 100 ? 'not limited' : '≤ ' + n.rhmax + '%') + '; sunlight ' + (n.smin > 0 ? '≥ ' + n.smin + ' kWh/m2/day' : 'not limited') + '; day-night swing ' + (n.swmax < 60 ? '≤ ' + n.swmax + ' °C' : 'not limited') + '.';
    $('brief').innerHTML = '<div class="bar-top"><button data-act="print">Print / save as PDF</button><button data-act="closebrief">Close</button></div>' +
      '<h1>Test Site Brief</h1><p class="sub">Understudy Earth &middot; generated ' + new Date().toISOString().slice(0, 10) + ' &middot; Blue Ember</p>' +
      '<h2>Location</h2><p>' + esc(GROUPS[e.group]) + ', 10 km square centred at ' + e.lat.toFixed(3) + ', ' + e.lon.toFixed(3) + '.</p>' +
      '<h2>Test and target</h2><p>Stand-in for: <b>' + esc(t.name) + '</b> (' + t.body + ').</p><p>Test needs (user choice or our assumption, not a mission requirement): ' + esc(need) + '</p>' +
      '<h2>Access (not space data)</h2><p>' + esc(accessLine(e)) + '</p>' + (D.notes && D.notes[e.group] ? '<h2>Geology notes (not a score)</h2><ul>' + D.notes[e.group].notes.map(function (x) { return '<li>' + esc(x.text) + ' <small>(' + esc(x.source) + ')</small></li>'; }).join('') + '</ul>' : '') + '<h2>Terrain match</h2><p><b>Stability of this target\'s result:</b> ' + robustText(t) + (stabOf(t) ? ' (tiers seen across settings: ' + stabOf(t).tiers_seen.map(function (k) { return GLABEL[k]; }).join(' / ') + '; best Oman square closer than ' + stabOf(t).band_pct[0] + '-' + stabOf(t).band_pct[1] + '% of Earth-square pairs).' : '.') + '</p><table>' + metricRows(e).map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' +
      '<h2>When: 12-month fit</h2>' + stripHtml(e) + monthNotes(e) + '<p>Best months: <b>' + (e._best.length ? esc(N.monthsText(e._best)) : 'none fits') + '</b>. Data: ' + esc(c.src) + '. Typical-year average, not a forecast.</p>' + second +
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
      var sn = stabOf(t); rows += '<tr><td>' + esc(t.name) + (sn && sn.threshold_sensitive ? ' <span title="threshold-sensitive">&#9888;</span>' : '') + '<br><small>' + t.body + '</small></td><td><span class="chip ' + a + '">' + GLABEL[a] + '</span></td><td><span class="chip ' + b + '">' + GLABEL[b] + '</span>' + (b !== a ? ' &larr; second site helps' : '') + '</td></tr>';
    });
    $('gaptable').innerHTML = '<table><tr><th>Target</th><th>Searched area only</th><th>+ Meteor Crater, Atacama</th></tr>' + rows + '</table><p class="sub">NO QUALIFYING CANDIDATE = no square we searched is as close to the target as the closest 5% of Earth-square pairs are to each other. It says nothing about places we did not search. &#9888; = threshold-sensitive (tier changes with window size, cell size or threshold).</p>';
  }

  function renderBlind() {
    var b = D.results.blind_test, h = '<p class="sub"><b>A sanity check, not validation.</b> The scorer never sees site names, groups or coordinates, only terrain numbers. Afterwards we look up where known practice sites landed among all ' + D.results.n_earth_windows + ' Earth squares (lower % = better).</p><table><tr><th>Known site</th><th>Rank on best Mars target</th><th>Rank on average over Mars targets</th></tr>';
    b.forEach(function (x) { h += '<tr><td>' + esc(x.site) + '</td><td class="mono">top ' + x.top_pct_best_mars_target + '%</td><td class="mono">top ' + x.top_pct_mean_over_mars_targets + '%</td></tr>'; });
    h += '</table><div class="limits"><b>Honest reading.</b> The AMADEE-18 area (Marmul, about 15 km radius, approximate) ranks top ' + b[0].top_pct_mean_over_mars_targets + '% on average over Mars targets but only top ' + b[0].top_pct_best_mars_target + '% on its single best target. Meteor Crater ranks well on average (top ' + b[1].top_pct_mean_over_mars_targets + '%); the Atacama tile is mid-table on average (top ' + b[2].top_pct_mean_over_mars_targets + '%) because it is mostly steep Andes terrain. A site ranking high is a sanity check, not proof. See the Baseline check tab for the comparison with random squares.</div>';
    $('blind').innerHTML = h;
  }

  function renderSecond() {
    var s = D.second, h = '<p class="sub">Slope recomputed by an independent code path (integer block means + Sobel, native reads): ' + s.rows.filter(function (r) { return r.pass; }).length + ' of ' + s.rows.length + ' windows agree (' + esc(s.tolerance) + ').</p>';
    h += '<p class="sub">Leave-one-out sensitivity (targets in GAP, searched area only): ' + D.results.sensitivity.map(function (x) { return x.left_out + ': ' + x.oman_only.gap; }).join(', ') + '.</p>';
    $('second').innerHTML = h;
  }

  var replayCircle = null;
  function renderReplay() {
    var t = st.target, M = 12, mar = D.earth.filter(function (e) { var dx = (e.lon - 55.23) * 111.32 * Math.cos(e.lat * Math.PI / 180), dy = (e.lat - 18.19) * 111.32; return Math.sqrt(dx * dx + dy * dy) <= 15; });
    if (!mar.length) { $('replay').innerHTML = '<p>No squares near Marmul in the data.</p>'; return; }
    SC.rankAll(D.earth, t);
    var ranks = mar.map(function (e) { return e.rank; }).sort(function (a, b) { return a - b; }), med = ranks[Math.floor(ranks.length / 2)];
    var needs = AMADEE_NEEDS;
    var avg = { tmax: [], tmin: [], wind: [], rh: [], srad: [] };
    for (var m = 0; m < M; m++) Object.keys(avg).forEach(function (k) { avg[k].push(mar.reduce(function (s, e) { return s + climate(e)[k][m]; }, 0) / mar.length); });
    var fits = N.allFits(avg, needs), best = N.bestMonths(fits), feb = fits[1], mx = Math.max.apply(null, fits);
    var strip = '<div class="strip">' + fits.map(function (f, i) { var k = N.needTier(f), star = best.indexOf(i) >= 0; return '<div class="mc ' + k + (star ? ' best' : '') + '"><span>' + N.MON[i].charAt(0) + '</span><b>' + Math.round(f) + '</b><i>' + (star ? '★' : (k === 'gap' ? '×' : (k === 'partial' ? '~' : '✓'))) + '</i></div>'; }).join('') + '</div>';
    var ff = N.monthFactors(avg, 1, needs), fk = Object.keys(ff).sort(function (a, b) { return ff[a] - ff[b]; })[0];
    var febWhy = ff[fk] >= 99.5 ? 'every factor is inside the assumed window.' : (fk === 'temp' ? 'day max ' + avg.tmax[1].toFixed(1) + ' °C against our assumed limit of ' + needs.thi + ' °C (night min ' + avg.tmin[1].toFixed(1) + ' °C). January has day max ' + avg.tmax[0].toFixed(1) + ' °C. The OeWF page quotes 16-27 °C for February, which looks like a mean temperature; NASA POWER daily max and min are more extreme than that, and we did not change our needs to force February.' : fk + ' is the weakest factor.');
    var verdict = best.indexOf(1) >= 0 ? 'The planner picks February among its best months.' : 'The planner does NOT pick February as a best month (best: ' + N.monthsText(best) + ', fit ' + Math.round(mx) + '). February scores ' + Math.round(feb) + ' (' + (N.needTier(feb) === 'match' ? 'a good month' : N.needTier(feb) === 'partial' ? 'a partial month' : 'a poor month') + ') under these assumed needs.';
    var mmCheck = '';
    if (D.mm && D.mm.points.amadee_marmul) {
      var mp = D.mm.points.amadee_marmul;
      if (mp['t_max_2m_24h:C'] && mp['t_min_2m_24h:C']) {
        var mavg = { tmax: mp['t_max_2m_24h:C'], tmin: mp['t_min_2m_24h:C'], wind: mp['wind_speed_10m:ms'] || avg.wind, rh: mp['relative_humidity_2m:p'] || avg.rh, srad: avg.srad };
        var mfits = N.allFits(mavg, needs), mbest = N.bestMonths(mfits), mfeb = mfits[1];
        mmCheck = '<p class="sub"><b>Re-checked with Meteomatics (saved ' + D.mm.saved + ', nearest point, not a square average):</b> February day max ' + mavg.tmax[1].toFixed(1) + ' °C / night min ' + mavg.tmin[1].toFixed(1) + ' °C (NASA POWER square average above: ' + avg.tmax[1].toFixed(1) + ' / ' + avg.tmin[1].toFixed(1) + ' °C). Under Meteomatics, February scores ' + Math.round(mfeb) + (mbest.indexOf(1) >= 0 ? ' and IS among the planner\'s best months' : ', best months instead: ' + N.monthsText(mbest)) + '. We did not change the needs to force this; the two data sources simply disagree on how mild February is here, same as the February result was not forced before.</p>';
      }
    }
    $('replay').innerHTML = '<p class="sub"><b>Historical illustration with assumed needs.</b> The region is a 15 km circle around 18.19&deg;N 55.23&deg;E (Marmul area, Dhofar). The exact AMADEE-18 site is approximate and not confirmed. ' + mar.length + ' squares fall inside the circle.</p>' +
      '<p><b>Terrain:</b> median rank top ' + Math.max(1, Math.round(med * 100)) + '% of ' + D.earth.length + ' squares for target <b>' + esc(t.name) + '</b> (change the target on the Planner tab).</p>' +
      '<p><b>Assumed needs (ours, written down before the replay; see docs/VALIDATION.md):</b> day highs up to 35 °C, night lows at least 5 °C, sunlight at least 4 kWh/m²/day. The OeWF page gives no numeric limits; it only says February temperatures at the site typically range 16-27 °C with under 10 mm of rain (shown for reference, not used).</p>' + strip +
      '<p class="best">Planner\'s best months: <b>' + esc(N.monthsText(best)) + '</b></p><p><b>Real mission:</b> the AMADEE-18 field phase ran in <b>February 2018</b> in the Dhofar region of Oman (Austrian Space Forum, oewf.org/en/amadee-18, read 2026-11-14).</p><p><b>Result:</b> ' + esc(verdict) + '</p>' + mmCheck +
      '<p><b>Why February is not the top month:</b> ' + febWhy + '</p><div class="limits"><b>Honest reading.</b> The mission\'s real constraints (logistics, crew schedule, local hosts) are unknown to us, so a different best month does not mean the planner or the mission was wrong. Climate is a typical-year average, not February 2018 weather. Source: ' + esc(climate(mar[0]).src) + '.</div>' +
      '<div class="btns"><button id="rp-go">Show the circle on the map</button></div>';
    var go = $('rp-go'); if (go) go.onclick = function () { FIELDS.forEach(function (f) { if (needs[f] !== undefined) st.n[f] = needs[f]; }); syncInputs(); document.querySelector('.tab[data-view=map]').click(); map.setView([18.19, 55.23], 9); if (replayCircle) map.removeLayer(replayCircle); replayCircle = L.circle([18.19, 55.23], { radius: 15000, color: '#fff', weight: 2, dashArray: '6 6', fillOpacity: 0 }).bindTooltip('AMADEE-18 area (approximate)').addTo(map); sel = mar[0]; renderAll(); };
  }

  // ---- click a planet (Mars 463 m, Moon south and north poles)
  var MARS = null, MOON = {}, skyBody = 'mars';
  var POLE = { moon: { file: 'moon_grid.json', label: '80°S to 90°S', tag: 'south pole' }, moon_n: { file: 'moon_grid_north.json', label: '80°N to 90°N', tag: 'north pole' } };
  function loadMars(cb) {
    if (MARS) return cb();
    Promise.all([fetch('data/mars_grid.json').then(function (r) { return r.json(); }), fetch('data/mars_grid.bin').then(function (r) { return r.arrayBuffer(); })]).then(function (a) {
      var m = a[0], off = [0]; m.rows.forEach(function (n) { off.push(off[off.length - 1] + n); }); m.off = off; m.buf = new DataView(a[1]); MARS = m; cb();
    }).catch(function () { $('skyres').innerHTML = '<p class="note">Mars grid could not be loaded.</p>'; });
  }
  function histFrom(shares) { var nr = D.meta.rough_edges.length - 1, h = new Array(shares.length * nr).fill(0); shares.forEach(function (v, a) { h[a * nr] = v; }); return h; }
  function marsAt(lat, lon) {
    var m = MARS, r = Math.max(0, Math.min(m.rows.length - 1, Math.round((lat - m.lat0) / m.dlat))), n = m.rows[r], k = Math.max(0, Math.min(n - 1, Math.floor((lon + 180) / 360 * n)));
    var i = m.off[r] + k, o = i * m.bytes_per_window, f = [0, 1, 2, 3, 4, 5].map(function (j) { return m.buf.getFloat32(o + 4 * j, true); });
    var clat = m.lat0 + r * m.dlat, clon = -180 + (k + 0.5) * 360 / n;
    var dx = (clon - lon) * 59.27 * Math.cos(clat * Math.PI / 180), dy = (clat - lat) * 59.27, sh = [];
    for (var a = 0; a < m.slope_edges.length - 1; a++) sh.push(m.buf.getUint8(o + 24 + a));
    if (!f.every(isFinite)) return { unknown: true, clat: clat, clon: clon };
    return { unknown: false, clat: clat, clon: clon, km: Math.sqrt(dx * dx + dy * dy), w: { id: 'MC', name: 'Mars window ' + clat.toFixed(1) + '°, ' + clon.toFixed(1) + '°', body: 'Mars', slope_p50: f[0], slope_p90: f[1], steep_share: f[2], rough_med: f[3], rough1k_med: f[4], relief_m: f[5], hist: histFrom(sh) } };
  }
  function skyResult(w, label, conf, extra) {
    var rows = [['Median / 90th pct slope', w.slope_p50.toFixed(1) + '° / ' + w.slope_p90.toFixed(1) + '°'], ['Roughness 500 m / 1 km', w.rough_med.toFixed(1) + ' m / ' + w.rough1k_med.toFixed(1) + ' m'], ['Relief in 10 km', Math.round(w.relief_m) + ' m'], ['Cells above 10° slope', Math.round(w.steep_share * 100) + '%']];
    var ds = D.earth.map(function (e) { return { e: e, d: SC.distance(e, w) }; }).sort(function (a, b) { return a.d - b.d; });
    var om = ds.filter(function (x) { return x.e.group.indexOf('oman') === 0 && !masked(x.e); }), tier = SC.gapTier(om[0].d);
    var tb = function (list) { return '<table><tr><th>Square</th><th>Where</th><th>Distance</th><th></th></tr>' + list.map(function (x) { return '<tr><td class="mono">' + x.e.id + '</td><td>' + esc(GROUPS[x.e.group]) + ' ' + x.e.lat.toFixed(2) + ', ' + x.e.lon.toFixed(2) + '</td><td class="mono">' + x.d.toFixed(3) + '</td><td><button data-sq="' + x.e.id + '">Show</button></td></tr>'; }).join('') + '</table>'; };
    var keep = st.target; st.target = w; recompute(); var vh = verdictHtml(om[0].e); st.target = keep; recompute();
    var steepWarn = (w.slope_p90 > 8 || w.relief_m > 300) ?
      '<p class="note">Caution: this window has steep or uneven ground (90th-pct slope ' + w.slope_p90.toFixed(1) + '°, relief ' + Math.round(w.relief_m) + ' m in 10 km). On steep ground the nearest precomputed window can read very differently from the exact spot clicked, sometimes by several degrees of slope (for example, Jezero\'s window-average slope is 4.4° while a finer 1 m check nearby reads 0.57°). Treat this result as a rough area reading, not the exact point.</p>' : '';
    $('skyres').innerHTML = '<h3>' + esc(label) + '</h3>' + steepWarn + (extra || '') + '<table>' + rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(r[1]) + '</td></tr>'; }).join('') + '</table>' +
      '<p><span class="chip ' + tier + '">' + GLABEL[tier] + '</span> best square in the searched area: distance ' + om[0].d.toFixed(3) + ' (match below ' + D.meta.thr_match_dist.toFixed(2) + ', partial below ' + D.meta.thr_partial_dist.toFixed(2) + '). Best fit among the squares searched, not a global best. Not checked for stability.</p>' +
      '<h4>Closest squares in the searched area</h4>' + tb(om.slice(0, 5)) + '<h4>Closest squares anywhere in our set</h4>' + tb(ds.slice(0, 3)) + vh +
      '<div class="conf"><b>Confidence: Low.</b> ' + esc(conf) + '</div><div class="limits"><b>What this cannot see.</b> Terrain numbers only see slope and roughness, not rock type or dust. Gravity, air and radiation are not copied. 500 m cells hide rocks and steps; Earth heights are a surface model. A terrain match is not a geology match.</div>';
  }
  function renderSky() {
    var pole = POLE[skyBody];
    $('skyhelp').innerHTML = skyBody === 'mars' ? 'Click anywhere on the map (87°S to 87°N, 463 m MOLA data; brighter = steeper). Windows are 10 km squares every 25 km, so the numbers describe the nearest window, not the exact spot. Poles are not covered: unknown.' :
      'Moon: only the LOLA terrain for ' + pole.label + ' is used. Click inside the circle (300 km around the pole). Anywhere else on the Moon is unknown.';
    $('marsbox').hidden = skyBody !== 'mars'; $('moonbox').hidden = skyBody === 'mars';
    document.querySelectorAll('#skytabs button').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-body') === skyBody); });
    if (skyBody === 'mars') loadMars(function () {}); else drawMoon(pole);
  }
  function drawMoon(pole) {
    var go = function () {
      var cv = $('moonc'), c = cv.getContext('2d'); c.clearRect(0, 0, 320, 320); c.fillStyle = '#05080f'; c.beginPath(); c.arc(160, 160, 155, 0, 7); c.fill();
      MOON[skyBody].forEach(function (w) { var v = Math.min(1, Math.log1p(w.slope_p90) / Math.log1p(25)), g = Math.round(40 + 215 * v); c.fillStyle = 'rgb(' + g + ',' + g + ',' + g + ')'; c.fillRect(160 + w.x / 300 * 155 - 3, 160 - w.y / 300 * 155 - 3, 6.2, 6.2); });
      c.strokeStyle = '#7aa2ff'; c.strokeRect(0, 0, 0, 0); c.fillStyle = '#9fb0d3'; c.font = '10px system-ui'; c.fillText('pole', 150, 158); c.fillText('300 km radius (' + pole.label.slice(0, 4) + ')', 90, 314);
    };
    if (MOON[skyBody]) return go(); fetch('data/' + pole.file).then(function (r) { return r.json(); }).then(function (a) { MOON[skyBody] = a; go(); });
  }
  function bindSky() {
    $('skytabs').addEventListener('click', function (ev) { var b = ev.target.getAttribute('data-body'); if (b) { skyBody = b; $('skyres').innerHTML = ''; renderSky(); } });
    $('marsimg').addEventListener('click', function (ev) {
      var r = ev.target.getBoundingClientRect(), fx = (ev.clientX - r.left) / r.width, fy = (ev.clientY - r.top) / r.height, lon = -180 + fx * 360, lat = 87 - fy * 174;
      $('marsmark').style.left = (fx * 100) + '%'; $('marsmark').style.top = (fy * 100) + '%';
      if (!MARS) $('skyres').innerHTML = '<p class="note">Loading Mars terrain data (about 13 MB, once per visit)...</p>';
      loadMars(function () {
        var m = marsAt(lat, lon);
        if (m.unknown) { $('skyres').innerHTML = '<h3>Unknown</h3><p>No valid terrain numbers for the window near ' + lat.toFixed(1) + '°, ' + lon.toFixed(1) + '°. No match is shown.</p>'; return; }
        skyResult(m.w, 'Mars near ' + lat.toFixed(1) + '°N, ' + lon.toFixed(1) + '°E', 'Coarse 463 m data (MOLA); the window centre is ' + m.km.toFixed(0) + ' km from your click (25 km window spacing).', '');
      });
    });
    $('moonc').addEventListener('click', function (ev) {
      var pole = POLE[skyBody], set = MOON[skyBody]; if (!set) return;
      var r = ev.target.getBoundingClientRect(), px = (ev.clientX - r.left) / r.width * 320, py = (ev.clientY - r.top) / r.height * 320, x = (px - 160) / 155 * 300, y = -(py - 160) / 155 * 300;
      if (Math.hypot(x, y) > 300) { $('skyres').innerHTML = '<h3>Unknown</h3><p>Outside ' + pole.label + ': no lunar terrain data here. No match is shown.</p>'; return; }
      var w = set.slice().sort(function (a, b) { return Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y); })[0], km = Math.hypot(w.x - x, w.y - y);
      var o = Object.assign({}, w, { id: 'ML', name: 'Moon window ' + w.lat + '°, ' + w.lon + '°', body: 'Moon' });
      skyResult(o, 'Moon near ' + w.lat.toFixed(1) + '°, ' + w.lon.toFixed(1) + '° (' + pole.tag + ' data only)', 'LOLA 80 m data, ' + pole.tag + ' only; the window centre is ' + km.toFixed(0) + ' km from your click (20 km spacing).', '');
    });
    document.addEventListener('click', function (ev) {
      var id = ev.target.getAttribute && ev.target.getAttribute('data-sq'); if (!id) return;
      var e = D.earth.filter(function (x) { return x.id === id; })[0]; if (!e) return; document.querySelector('.tab[data-view=map]').click(); map.setView([e.lat, e.lon], 9); sel = e; renderAll();
    });
  }

  // ---- world set: a chosen set of places, not every place on Earth
  var wmap = null;
  function renderWorld() {
    if (!D.world) { fetch('data/world.json').then(function (r) { return r.json(); }).then(function (a) { D.world = a; renderWorld(); }); return; }
    if (!wmap) { wmap = L.map('worldmap').setView([25, 20], 2); L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 8, attribution: '&copy; OpenStreetMap contributors' }).addTo(wmap); wmap._layer = L.layerGroup().addTo(wmap); }
    setTimeout(function () { wmap.invalidateSize(); }, 100);
    var t = st.target, items = [];
    D.world.forEach(function (x) { var d = Math.min.apply(null, x.windows.map(function (w) { return SC.distance(w, t); })); items.push({ name: x.name, kind: x.kind, lat: x.lat, lon: x.lon, d: d, n: x.windows.length, fine: false }); });
    [['meteor_crater', 'Meteor Crater area, Arizona', 'impact crater', 35.03, -111.02], ['atacama', 'Atacama tile centre, Chile', 'desert', -24.5, -69.5]].forEach(function (g) { var d = Math.min.apply(null, D.earth.filter(function (e) { return e.group === g[0]; }).map(function (e) { return SC.distance(e, t); })); items.push({ name: g[1], kind: g[2], lat: g[3], lon: g[4], d: d, n: 0, fine: true }); });
    var om = bestOf(function (e) { return e.group.indexOf('oman') === 0; }); items.push({ name: 'Searched area (30 m and 90 m squares; click to open the fine view)', kind: 'home', lat: 20.5, lon: 56.5, d: om.d, n: 0, fine: true, oman: true });
    wmap._layer.clearLayers();
    items.forEach(function (x) {
      var k = SC.gapTier(x.d), m = L.circleMarker([x.lat, x.lon], { radius: x.oman ? 11 : 7, color: '#1c1f23', weight: x.fine ? 3 : 1, fillColor: k === 'gap' ? '#a23d4a' : COL[k], fillOpacity: 0.9, dashArray: x.fine ? null : '3 3' }).addTo(wmap._layer);
      m.bindTooltip(x.name + ': ' + GLABEL[k] + ' (distance ' + x.d.toFixed(2) + ')');
      if (x.oman) m.on('click', function () { document.querySelector('.tab[data-view=map]').click(); map.fitBounds(state_views.oman); });
    });
    items.sort(function (a, b) { return a.d - b.d; });
    $('worldlist').innerHTML = '<p class="sub">For the target <b>' + esc(t.name) + '</b> (change it on the Planner tab). Dashed dots use coarse 90 m data around an approximate reference point (squares within 15 km); solid-ringed dots are the 30 m squares already in the main set. Tier = same absolute thresholds as the main method, not recalibrated for 90 m.</p><table><tr><th>Place</th><th>Kind</th><th>Squares</th><th>Closest distance</th><th>Tier</th></tr>' + items.map(function (x) { var k = SC.gapTier(x.d); return '<tr><td>' + esc(x.name) + '</td><td>' + x.kind + '</td><td>' + (x.n || 'main set') + '</td><td class="mono">' + x.d.toFixed(3) + '</td><td><span class="chip ' + k + '">' + GLABEL[k] + '</span></td></tr>'; }).join('') + '</table>';
  }

  // ---- Jezero story (finer-scale check, separate from the frozen 500 m method)
  function renderJezero() {
    var J = D.jez; if (!J || !J.windows.length) { $('jez').innerHTML = '<p>Jezero data not available.</p>'; return; }
    var w = J.windows[0], t = D.targets.filter(function (x) { return x.id === J.source_mola_target; })[0];
    var sq = function (list) { return '<table><tr><th>Square</th><th>Where</th><th>Distance</th><th></th></tr>' + list.map(function (x) { return '<tr><td class="mono">' + x.id + '</td><td>' + esc(GROUPS[x.group]) + ' ' + x.lat.toFixed(2) + ', ' + x.lon.toFixed(2) + '</td><td class="mono">' + x.dist + '</td><td><button data-jz="' + x.id + '">Show</button></td></tr>'; }).join('') + '</table>'; };
    var best = w.top500_oman[0];
    var jverdict = GLABEL[SC.gapTier(best.dist)] + ': ' + best.id + ' scores ' + best.dist + ' against Jezero (lower is closer; threshold ' + D.meta.thr_match_dist.toFixed(3) + '; best in the searched area ' + best.dist + '; closest anywhere in our set ' + w.top500[0].dist + ' at ' + GROUPS[w.top500[0].group] + '); the 30 m check below has no calibrated threshold, so it is a ranking only, not a pass or fail.';
    $('jez').innerHTML = '<p class="sub"><b>Practise the Perseverance Jezero drive in the searched area?</b> A finer-scale check than the 463 m global map. It is separate from the main method and one window only.</p>' +
      '<p class="best">' + esc(jverdict) + '</p>' +
      '<div class="twins"><figure><img src="data/relief/JEZ0.png" alt="Shaded relief of the Jezero 10 km window" width="64" height="64"><div class="bar5"><i></i><span>5 km</span></div><figcaption>Jezero delta region, 10 km window<br>native 1 m (HiRISE-based DTM), area-averaged to the picture grid</figcaption></figure>' +
      '<figure><img src="data/relief/' + best.id + '.png" alt="Shaded relief of the closest square in the searched area" width="64" height="64"><div class="bar5"><i></i><span>5 km</span></div><figcaption>Closest square in the searched area (500 m method)<br>native 30 m (Copernicus surface model)</figcaption></figure></div>' +
      '<table><tr><th></th><th>Slope median / 90th pct</th><th>Roughness (median)</th></tr>' +
      '<tr><th>Jezero window, 500 m cells (same method as the searched area)</th><td>' + w.feat500.slope_p50.toFixed(2) + '° / ' + w.feat500.slope_p90.toFixed(2) + '°</td><td>' + w.feat500.rough_med.toFixed(2) + ' m</td></tr>' +
      '<tr><th>Jezero 463 m global map (target "' + esc(t.name) + '")</th><td>' + t.slope_p50.toFixed(2) + '° / ' + t.slope_p90.toFixed(2) + '°</td><td>' + t.rough_med.toFixed(2) + ' m</td></tr>' +
      '<tr><th>Jezero window, 30 m cells (finer check)</th><td>' + w.feat30.slope_p50.toFixed(2) + '° / ' + w.feat30.slope_p90.toFixed(2) + '°</td><td>' + w.feat30.rough_med.toFixed(2) + ' m; ' + Math.round(w.feat30.steep_share * 100) + '% of cells above 10°</td></tr></table>' +
      '<h3>Closest squares in the searched area, main method (500 m cells)</h3>' + sq(w.top500_oman) + '<p class="sub">Best distance ' + w.top500_oman[0].dist + ' (match below ' + D.meta.thr_match_dist.toFixed(2) + ', partial below ' + D.meta.thr_partial_dist.toFixed(2) + '): tier ' + GLABEL[SC.gapTier(w.top500_oman[0].dist)] + ' for the searched area (the closest square anywhere is in the Meteor Crater area).</p>' +
      '<h3>Closest squares in the searched area, 30 m check (slope, steepness, roughness at 30 m)</h3>' + sq(w.top30_oman) + '<p class="sub">The 30 m check has no calibrated threshold, so it gives a ranking only.</p>' +
      '<div class="limits"><b>Limits.</b> ' + esc(J.note) + ' Only one 10 km window had at most 2% empty cells (the data footprint is slanted). Earth heights are a surface model (trees, buildings); Mars heights are bare ground. 30 m cells still hide rocks and steps that matter to a rover. A terrain match is not a geology match. Source: USGS Astrogeology Mars 2020 TRN HiRISE DTM mosaic of Jezero (see REFERENCES).</div>' +
      renderGaleHtml();
    $('jez').onclick = function (ev) {
      var id = ev.target.getAttribute('data-jz') || ev.target.getAttribute('data-ga'); if (!id) return;
      var e = D.earth.filter(function (x) { return x.id === id; })[0]; if (!e) return; document.querySelector('.tab[data-view=map]').click(); map.setView([e.lat, e.lon], 9); sel = e; renderAll();
    };
  }
  function renderGaleHtml() {
    var G = D.gale; if (!G || !G.windows.length) return '';
    var sq = function (list) { return '<table><tr><th>Square</th><th>Where</th><th>Distance</th><th></th></tr>' + list.map(function (x) { return '<tr><td class="mono">' + x.id + '</td><td>' + esc(GROUPS[x.group]) + ' ' + x.lat.toFixed(2) + ', ' + x.lon.toFixed(2) + '</td><td class="mono">' + x.dist + '</td><td><button data-ga="' + x.id + '">Show</button></td></tr>'; }).join('') + '</table>'; };
    var best = G.windows.slice().sort(function (a, b) { return a.top500_oman[0].dist - b.top500_oman[0].dist; })[0];
    var bo = best.top500_oman[0];
    var gverdict = GLABEL[SC.gapTier(bo.dist)] + ': ' + bo.id + ' scores ' + bo.dist + ' against this Gale window (lower is closer; threshold ' + D.meta.thr_match_dist.toFixed(3) + '); closest anywhere in our set ' + best.top500[0].dist + ' at ' + esc(GROUPS[best.top500[0].group]) + '.';
    return '<h3 style="margin-top:2em">Gale crater (30 m HRSC mosaic, a second fine-scale check)</h3>' +
      '<p class="sub">A second, independently sourced fine terrain model, for the Curiosity rover\'s Gale crater region. Native resolution is already 30 m, so there is no further finer check here (unlike Jezero\'s 1 m starting point). ' + G.windows.length + ' windows across the mosaic, closest to the crater centre shown here.</p>' +
      '<p class="best">' + esc(gverdict) + '</p>' +
      '<div class="twins"><figure><img src="data/relief/' + best.id + '.png" alt="Shaded relief of a Gale crater window" width="64" height="64"><div class="bar5"><i></i><span>5 km</span></div><figcaption>Gale crater, 10 km window (' + best.lat.toFixed(2) + ', ' + best.lon.toFixed(2) + ')<br>native 30 m (HRSC-based DTM), area-averaged to the picture grid</figcaption></figure>' +
      '<figure><img src="data/relief/' + bo.id + '.png" alt="Shaded relief of the closest square in the searched area" width="64" height="64"><div class="bar5"><i></i><span>5 km</span></div><figcaption>Closest square in the searched area<br>native 30 m (Copernicus surface model)</figcaption></figure></div>' +
      '<h4>All ' + G.windows.length + ' Gale windows, best square in the searched area for each</h4><table><tr><th>Window</th><th>Where</th><th>Slope p50/p90</th><th>Best in searched area</th><th>Tier</th></tr>' +
      G.windows.map(function (w) { var b = w.top500_oman[0]; return '<tr><td class="mono">' + w.id + '</td><td>' + w.lat.toFixed(2) + ', ' + w.lon.toFixed(2) + '</td><td>' + w.feat500.slope_p50.toFixed(2) + '° / ' + w.feat500.slope_p90.toFixed(2) + '°</td><td class="mono">' + b.dist + '</td><td><span class="chip ' + SC.gapTier(b.dist) + '">' + GLABEL[SC.gapTier(b.dist)] + '</span></td></tr>'; }).join('') + '</table>' +
      '<h4>Closest squares in the searched area for the best window</h4>' + sq(best.top500_oman) +
      '<div class="limits"><b>Limits.</b> ' + esc(G.note) + ' Earth heights are a surface model (trees, buildings); Mars heights are bare ground. A terrain match is not a geology match. Source: 30-m HRSC DTM Mosaic of Gale Crater, Mars (Persaud, Putri, Muller, 2021, Zenodo, CC BY 4.0; see REFERENCES).</div>';
  }

  // ---- baseline and stability view
  function renderBase() {
    if (!D.base) { $('base').innerHTML = '<p>Baseline file missing.</p>'; return; }
    var h = '<div class="limits"><b>What this check shows and does not show.</b> It shows whether known analog areas sit closer to our Moon and Mars targets, on slope and roughness numbers, than random Earth squares do. It does NOT show that a site is a good analog: it is retrospective, uses very few known sites (3 plus two local areas), looks at terrain only (not rocks, dust, gravity or climate), and is not independent validation. We looked at results while building.</div>';
    h += '<p class="sub">Each known site\'s median rank among all ' + D.earth.length + ' Earth squares, over the targets of one body, is compared with 100 random draws of the same number of squares (random is about 50%). Rule fixed in advance: 10 points or more below the random median = better than random, 10 or more above = worse, otherwise about random.</p><table><tr><th>Known site</th><th>Body</th><th>Median rank</th><th>Random</th><th>Reading</th></tr>';
    D.base.summary.forEach(function (x) { h += '<tr><td>' + esc(x.site) + '</td><td>' + x.body + '</td><td class="mono">' + x.median_rank_full_pct + '%</td><td class="mono">' + x.median_random_pct + '%</td><td><b>' + esc(x.verdict) + '</b><br><small>' + x.median_rank_full_pct + '% vs about ' + x.median_random_pct + '% random; ahead of 95% of random draws on ' + x.targets_beating_random + ' of ' + x.n_targets + ' targets</small></td></tr>'; });
    h += '</table><h3>Known failures</h3><ul class="cant"><li><b>Atacama tile, Mars:</b> worse than random as a whole 1&deg; tile (rank 66%), because the tile mixes flat desert in the west (slope about 1.3&deg;) with Andes foothills in the east (about 3.6&deg;). Using 15 km around the tile centre instead gives about random (41%). The tile was not chosen from a verified analog location.</li><li><b>Muscat mountains, Moon:</b> rank near the top (7%) only because their slopes and roughness are high. Terrain numbers only see slope and roughness, not rock type or dust, so this is not evidence of a good Moon analog.</li><li><b>AMADEE-18 month:</b> the planner picks December and January, not February (see the AMADEE-18 replay tab).</li></ul>';
    h += '<h3>Per target (rank %, bar = rank, white tick = random median)</h3><table><tr><th>Target</th><th>AMADEE-18 area</th><th>Meteor Crater</th><th>Atacama tile</th><th>Atacama 15 km</th></tr>';
    D.base.rows.forEach(function (r) {
      h += '<tr><td>' + esc(r.name) + '<br><small>' + r.body + '</small></td>' + [0, 1, 2, 6].map(function (i) { var x = r.sites[i]; return '<td><div class="rb"><i style="width:' + x.rank_full_pct + '%"></i><u style="left:' + x.random_median_pct + '%"></u></div><small class="mono">' + x.rank_full_pct + '%' + (x.beats_random ? ' ✓' : '') + '</small></td>'; }).join('') + '</tr>';
    });
    h += '</table><p class="sub">✓ = better than 95% of random draws (this count moves by one or so with the random draws; the medians do not).</p>';
    if (D.stab) {
      var rows = D.stab.summary.slice().sort(function (a, b) { return (a.threshold_sensitive ? 1 : 0) - (b.threshold_sensitive ? 1 : 0); });
      h += '<h3>Stability: window 5/10/20 km, cell 500 m/1 km, thresholds 5-20% vs 10-30%</h3><table><tr><th>Target</th><th>Main tier</th><th>Tier range over 8 settings</th><th>Best square in the searched area closer than</th><th></th></tr>';
      rows.forEach(function (x) {
        var res = D.results.gap.filter(function (g) { return g.name === x.target; })[0], bt = res ? res.tier_oman : x.base_tier;
        h += '<tr><td>' + esc(x.target) + '</td><td><span class="chip ' + bt + '">' + GLABEL[bt] + '</span></td><td>' + x.tiers_seen.map(function (k) { return GLABEL[k]; }).join(', ') + '</td><td class="mono">' + x.band_pct[0] + '-' + x.band_pct[1] + '% of pairs</td><td><b>' + (x.threshold_sensitive ? 'threshold-sensitive' : 'robust') + '</b></td></tr>';
      });
      h += '</table><p class="sub">Robust = same tier in all 8 settings (' + rows.filter(function (x) { return !x.threshold_sensitive; }).length + ' of ' + rows.length + ' targets). Treat every tier as approximate.</p>';
    }
    $('base').innerHTML = h;
  }

  // ---- calendar and two-site plan
  function addCal() { if (!sel) return; if (st.cal.indexOf(sel.id) < 0) st.cal.push(sel.id); if (st.cal.length > 6) st.cal.shift(); renderCal(); }
  function renderCal() {
    var rows = st.cal.map(function (id) { return D.earth.filter(function (e) { return e.id === id; })[0]; }).filter(Boolean);
    var h = '<p class="sub">Months across, chosen squares down. Fit uses your test needs on the Planner tab (our assumptions unless you changed them). Symbol and pattern repeat the colour: ✓ solid = good, ~ dots = partial, × hatch = poor.</p>';
    if (!rows.length) h += '<p class="hint">No squares yet. Click a square on the map, then "Add to calendar".</p>';
    else {
      h += '<table class="cal"><tr><th></th>' + N.MON.map(function (m) { return '<th>' + m + '</th>'; }).join('') + '</tr>';
      rows.forEach(function (e) {
        var f = N.allFits(climate(e), st.n);
        h += '<tr><th>' + esc(GROUPS[e.group]) + '<br><small>' + e.lat.toFixed(2) + ', ' + e.lon.toFixed(2) + '</small></th>' + f.map(function (x) { var k = N.needTier(x); return '<td class="cc ' + k + '">' + Math.round(x) + '<br>' + (k === 'gap' ? '×' : (k === 'partial' ? '~' : '✓')) + '</td>'; }).join('') + '</tr>';
      });
      h += '</table><div class="btns"><button data-act="clearcal">Clear calendar</button></div>';
    }
    h += '<h3>Two-site plan (only if your test can really be split)</h3><label class="chk"><input type="checkbox" id="split"' + (st.split ? ' checked' : '') + '> The terrain part and the climate-dependent part of my test can be done at different sites and times</label><div id="splitres"></div>';
    $('cal').innerHTML = h;
    $('split').onchange = function () { st.split = $('split').checked; splitPlan(); };
    splitPlan();
  }
  function splitPlan() {
    var el = $('splitres'); if (!el) return;
    if (!st.split) { el.innerHTML = '<p class="sub">No split suggested. If terrain and climate needs must be met together, one square has to satisfy both (see the Planner tab).</p>'; return; }
    var cand = D.earth.filter(function (e) { return e.group.indexOf('oman') === 0 && !masked(e); });
    cand.forEach(function (e) { e._tf = N.terrainFit(e.d, D.meta.thr_match_dist, D.meta.thr_partial_dist); e._cf = Math.max.apply(null, N.allFits(climate(e), st.n)); });
    var one = cand.slice().sort(function (a, b) { return Math.min(b._tf, b._cf) - Math.min(a._tf, a._cf); })[0];
    var A = cand.slice().sort(function (a, b) { return b._tf - a._tf; })[0], B = cand.slice().sort(function (a, b) { return b._cf - a._cf; })[0];
    var line = function (e) { return esc(GROUPS[e.group]) + ' ' + e.lat.toFixed(2) + ', ' + e.lon.toFixed(2); };
    if (Math.min(one._tf, one._cf) >= 75) el.innerHTML = '<p>One site is enough: ' + line(one) + ' has terrain fit ' + Math.round(one._tf) + ' and a month at fit ' + Math.round(one._cf) + '. No split needed.</p>';
    else el.innerHTML = '<p><b>Phase 1, terrain-dependent work:</b> ' + line(A) + ' (terrain fit ' + Math.round(A._tf) + ').</p><p><b>Phase 2, climate-dependent work:</b> ' + line(B) + ' (best month fit ' + Math.round(B._cf) + ': ' + esc(N.monthsText(N.bestMonths(N.allFits(climate(B), st.n)))) + ').</p><p class="sub">Valid only if the two phases really are independent. Best single square: ' + line(one) + ', terrain ' + Math.round(one._tf) + ', climate ' + Math.round(one._cf) + '. Best fit among the squares searched, not a global best.</p>';
  }

  // ---- demo (real computed outputs only)
  function runDemo(kind) {
    document.querySelector('.tab[data-view=map]').click();
    if (kind === 'good') {
      st.target = D.targets.filter(function (t) { return t.name === 'Meridiani Planum'; })[0]; $('target').value = st.target.id;
      var p = N.PRESETS.rover; FIELDS.forEach(function (f) { st.n[f] = p[f]; }); st.mode = 'both'; st.month = 'best'; $('mode').value = 'both'; $('month').value = 'best'; syncInputs(); recompute();
      var c = D.earth.filter(function (e) { return e.group.indexOf('oman') === 0 && !masked(e) && e._fit >= 75; }).sort(function (a, b) { return a.d - b.d; })[0] || bestOf(function (e) { return e.group.indexOf('oman') === 0; });
      sel = c; map.setView([c.lat, c.lon], 9); addCalQuiet(c);
    } else if (kind === 'none') {
      st.target = D.targets.filter(function (t) { return t.name.indexOf('Shackleton') === 0; })[0]; $('target').value = st.target.id; st.mode = 'both'; $('mode').value = 'both'; recompute();
      sel = bestOf(function (e) { return e.group.indexOf('oman') === 0; }); map.setView([sel.lat, sel.lon], 8);
    } else if (kind === 'fail') { document.querySelector('.tab[data-view=replay]').click(); return; }
    else if (kind === 'brief') { if (sel) { renderAll(); openBrief(); } return; }
    renderAll();
  }
  function addCalQuiet(e) { if (st.cal.indexOf(e.id) < 0) st.cal.push(e.id); }

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
