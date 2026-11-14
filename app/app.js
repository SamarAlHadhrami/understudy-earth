(function () {
  'use strict';
  var GROUPS = { oman_muscat: 'Oman (Muscat area)', oman_dhofar: 'Oman (Dhofar)', meteor_crater: 'Meteor Crater area, Arizona', atacama: 'Atacama / Andes edge, Chile' };
  var D = {}, SC, map, layers = [], rects = {}, sel = null, state = { target: null, lim: 17 };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); };

  function load(f) { return fetch('data/' + f).then(function (r) { if (!r.ok) throw new Error(f + ' ' + r.status); return r.json(); }); }
  Promise.all([load('meta.json'), load('earth.json'), load('targets.json'), load('results.json'), load('second_check.json')]).then(function (a) {
    D.meta = a[0]; D.earth = a[1]; D.targets = a[2]; D.results = a[3]; D.second = a[4];
    SC = UEScore(D.meta); D.earth.forEach(SC.prep); D.targets.forEach(SC.prep);
    init();
  }).catch(function (e) {
    var el = $('loaderr'); el.hidden = false; el.textContent = 'Could not load the data files (' + e.message + '). Reload the page; if it persists the site files are missing.';
  });

  function tier(s) { return s >= D.meta.match_threshold ? 'match' : (s >= D.meta.threshold ? 'partial' : 'gap'); }
  var LABEL = { match: 'MATCH', partial: 'PARTIAL', gap: 'GAP' };
  var COL = { match: '#2ec4b6', partial: '#f6c453', gap: '#ff5a5f' };

  function init() {
    var tsel = $('target'), html = '';
    ['Mars', 'Moon'].forEach(function (b) {
      html += '<optgroup label="' + b + (b === 'Moon' ? ' (south pole data only)' : '') + '">';
      D.targets.forEach(function (t) { if (t.body === b) html += '<option value="' + t.id + '">' + esc(t.name) + '</option>'; });
      html += '</optgroup>';
    });
    tsel.innerHTML = html;
    var def = D.targets.filter(function (t) { return t.name === 'Gale mound (Aeolis Mons)'; })[0] || D.targets[0];
    tsel.value = def.id; state.target = def;
    $('limsrc').textContent = 'Limit source: ' + D.meta.tasks.rover.source;
    initMap(); bind(); renderAll(); renderBlind(); renderSecond();
  }

  function initMap() {
    map = L.map('map', { zoomControl: true, attributionControl: true, preferCanvas: false }).setView([20.3, 56.4], 6);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 12, className: 'dark-tiles', attribution: '&copy; OpenStreetMap contributors' }).addTo(map);
    var r = L.svg({ padding: 0.5 }); r.addTo(map); state.svg = r;
    var ns = 'http://www.w3.org/2000/svg', defs = document.createElementNS(ns, 'defs');
    defs.innerHTML = '<pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><rect width="6" height="6" fill="#ff5a5f"/><rect width="3" height="6" fill="#5a1620"/></pattern>';
    r._container.insertBefore(defs, r._container.firstChild);
    var oman = D.earth.filter(function (e) { return e.group.indexOf('oman') === 0; });
    var bounds = [];
    oman.forEach(function (e) {
      var dlat = 5 / 111.32, dlon = 5 / (111.32 * Math.cos(e.lat * Math.PI / 180));
      var b = [[e.lat - dlat, e.lon - dlon], [e.lat + dlat, e.lon + dlon]];
      var rc = L.rectangle(b, { renderer: r, weight: 1, color: '#0a1020', fillOpacity: 0.85, interactive: true }).addTo(map);
      rc.on('click', function () { select(e); });
      rc.bindTooltip(function () { return Math.round(e._s) + ' ' + LABEL[tier(e._s)]; }, { sticky: true });
      rects[e.id] = rc; bounds.push(b[0], b[1]);
    });
    var dh = [[16.9, 53.9], [19.0, 56.1]], mu = [[22.9, 57.9], [24.1, 59.1]];
    state.views = { dhofar: dh, muscat: mu, all: bounds };
    map.fitBounds(dh, { padding: [20, 20] });
    var ctl = L.control({ position: 'topright' });
    ctl.onAdd = function () {
      var d = L.DomUtil.create('div', 'viewbtns');
      d.innerHTML = '<button data-v="dhofar">Dhofar</button><button data-v="muscat">Muscat</button><button data-v="all">All Oman</button>';
      L.DomEvent.disableClickPropagation(d);
      d.addEventListener('click', function (ev) { var v = ev.target.getAttribute('data-v'); if (v) map.fitBounds(state.views[v], { padding: [20, 20] }); });
      return d;
    };
    ctl.addTo(map);
  }

  function bind() {
    $('target').addEventListener('change', function () { state.target = D.targets.filter(function (t) { return t.id === $('target').value; })[0]; sel = null; renderAll(); });
    $('limit').addEventListener('input', function () { state.lim = parseFloat($('limit').value); renderAll(); });
    ['s_meteor', 's_atacama'].forEach(function (id) { $(id).addEventListener('change', renderGapCard); });
    document.querySelectorAll('.tab').forEach(function (b) {
      b.addEventListener('click', function () {
        document.querySelectorAll('.tab').forEach(function (x) { x.classList.toggle('on', x === b); });
        document.querySelectorAll('.view').forEach(function (v) { v.classList.remove('on'); });
        $('v-' + b.dataset.view).classList.add('on');
        if (b.dataset.view === 'gap') renderGapTable();
      });
    });
  }

  function scoreAll() {
    D.earth.forEach(function (e) { e._r = SC.score(e, state.target, state.lim); e._s = e._r.score; });
  }
  function bestOf(f) {
    var b = null; D.earth.forEach(function (e) { if (f(e) && (!b || e._s > b._s)) b = e; }); return b;
  }

  function renderAll() {
    scoreAll();
    $('limval').textContent = state.lim + '°';
    var t = state.target;
    $('hook').innerHTML = 'Each square is 10 km of <b>Oman</b>. Colour = how well its terrain matches <b>' + esc(t.name) + '</b> (' + t.body + ') for rover driving, using real elevation data.';
    D.earth.forEach(function (e) {
      var rc = rects[e.id]; if (!rc) return;
      var k = tier(e._s);
      rc.setStyle({ fillColor: k === 'gap' ? 'url(#hatch)' : COL[k], fillOpacity: k === 'gap' ? 0.9 : 0.8, weight: sel && sel.id === e.id ? 3 : 1, color: sel && sel.id === e.id ? '#fff' : '#0a1020' });
      if (rc._path) rc._path.setAttribute('fill', k === 'gap' ? 'url(#hatch)' : COL[k]);
    });
    renderGapCard(); renderResult();
    if ($('v-gap').classList.contains('on')) renderGapTable();
  }

  function renderGapCard() {
    var bo = bestOf(function (e) { return e.group.indexOf('oman') === 0; });
    var s = bo._s, k = tier(s), shown = s, kk = k, extra = [];
    ['meteor_crater', 'atacama'].forEach(function (g) {
      if ($(g === 'meteor_crater' ? 's_meteor' : 's_atacama').checked) { var b = bestOf(function (e) { return e.group === g; }); extra.push({ g: g, b: b }); if (b._s > shown) { shown = b._s; kk = tier(shown); } }
    });
    $('badge').textContent = LABEL[kk]; $('badge').className = 'badge ' + kk;
    var f = $('barfill'); f.style.width = Math.max(2, Math.min(100, shown)) + '%'; f.style.background = COL[kk];
    $('gcscore').textContent = Math.round(shown);
    var txt = kk === 'gap' ? 'Nothing in Oman is good enough for this target.' : (kk === 'partial' ? 'Oman is a partial match only.' : 'Oman has a strong match.');
    if (extra.length && shown > s) { txt = 'With the second site: ' + LABEL[kk] + (kk !== k ? ' (was ' + LABEL[k] + ' in Oman alone).' : '.'); }
    $('gctext').textContent = txt;
    var lines = ['Oman alone: ' + Math.round(s) + ' ' + LABEL[k]];
    extra.forEach(function (x) { lines.push(GROUPS[x.g] + ': ' + Math.round(x.b._s) + ' ' + LABEL[tier(x.b._s)] + ' (' + x.b.lat.toFixed(2) + ', ' + x.b.lon.toFixed(2) + ')'); });
    $('secondres').innerHTML = lines.map(esc).join('<br>');
  }

  function select(e) { sel = e; renderAll(); }

  function renderResult() {
    var el = $('result');
    if (!sel) { el.innerHTML = '<p class="hint">Click a square on the map to see its score, the reason, and what Earth cannot copy.</p>'; return; }
    var r = sel._r, t = state.target, k = tier(r.score);
    var why = [];
    why.push('Drivable share (slope ≤ ' + state.lim + '°): ' + Math.round(r.tA * 100) + '% here vs ' + Math.round(r.tB * 100) + '% on target.');
    why.push('Median slope ' + sel.slope_p50.toFixed(1) + '° vs ' + t.slope_p50.toFixed(1) + '°; 90th percentile ' + sel.slope_p90.toFixed(1) + '° vs ' + t.slope_p90.toFixed(1) + '°.');
    why.push('Roughness ' + sel.rough_med.toFixed(1) + ' m vs ' + t.rough_med.toFixed(1) + ' m; relief ' + Math.round(sel.relief_m) + ' m vs ' + Math.round(t.relief_m) + ' m.');
    el.innerHTML = '<div><span class="big mono">' + Math.round(r.score) + '</span> <span class="chip ' + k + '">' + LABEL[k] + '</span></div>' +
      '<div class="sub">' + GROUPS[sel.group] + ' &middot; ' + sel.lat.toFixed(3) + ', ' + sel.lon.toFixed(3) + '</div><ul>' + why.map(function (w) { return '<li>' + esc(w) + '</li>'; }).join('') + '</ul>' +
      '<div class="limits"><b>Limits.</b> Earth cannot copy gravity, thin air or radiation. A terrain match is not a geology match. 500 m cells hide rocks and steps, so a pass here is necessary, not sufficient. Earth heights include trees and buildings (surface model); ' + (t.body === 'Moon' ? 'Moon data covers the south pole only.' : 'Mars data is bare ground at 463 m.') + '</div>';
  }

  function renderGapTable() {
    var rows = '', saved = state.target;
    D.targets.forEach(function (t) {
      var bo = 0, bm = 0, ba = 0;
      D.earth.forEach(function (e) {
        var s = SC.score(e, t, state.lim).score;
        if (e.group.indexOf('oman') === 0) bo = Math.max(bo, s); else bm = Math.max(bm, s);
      });
      var all = Math.max(bo, bm), a = tier(bo), b = tier(all);
      rows += '<tr><td>' + esc(t.name) + '<br><small>' + t.body + '</small></td><td><span class="chip ' + a + '">' + LABEL[a] + '</span> <span class="mono">' + Math.round(bo) + '</span></td><td><span class="chip ' + b + '">' + LABEL[b] + '</span> <span class="mono">' + Math.round(all) + '</span></td></tr>';
    });
    $('gaptable').innerHTML = '<table><tr><th>Target</th><th>Oman only</th><th>+ check sites</th></tr>' + rows + '</table><p class="sub">Slope limit now ' + state.lim + '&deg;. GAP = nothing we hold reaches 70. Moving the slider changes this table.</p>';
  }

  function renderBlind() {
    var b = D.results.blind_test, h = '<p class="sub">The scorer never sees site names, groups or coordinates, only terrain numbers. Afterwards we look up where known practice sites landed among all ' + D.results.n_earth_windows + ' Earth windows (lower % = better).</p><table><tr><th>Known site</th><th>Rank by best Mars target</th><th>Rank by average over Mars targets</th></tr>';
    b.forEach(function (x) { h += '<tr><td>' + esc(x.site) + '</td><td class="mono">' + (x.n_windows ? 'top ' + x.top_pct_by_best_mars_target + '%' : 'n/a') + '</td><td class="mono">' + (x.n_windows ? 'top ' + x.top_pct_by_mean_mars_targets + '%' : 'n/a') + '</td></tr>'; });
    h += '</table><div class="limits"><b>Honest reading.</b> ' + D.results.n_earth_windows_scoring_90_plus_vs_some_mars_target + ' of ' + D.results.n_earth_windows + ' windows score 90+ against at least one Mars target, because several Mars targets are flat plains. So this test discriminates weakly. The AMADEE-18 area ranks well on the average over Mars targets (top ' + b[0].top_pct_by_mean_mars_targets + '%), but only mid-table on the best single target (top ' + b[0].top_pct_by_best_mars_target + '%). The AMADEE-18 area is approximate (Marmul, about 15 km radius).</div>';
    $('blind').innerHTML = h;
  }

  function renderSecond() {
    var s = D.second, h = '<p class="sub">Slope recomputed by an independent code path (integer block means + Sobel filter, native reads): ' + s.rows.filter(function (r) { return r.pass; }).length + ' of ' + s.rows.length + ' windows agree (' + esc(s.tolerance) + ').</p>';
    var sens = D.results.sensitivity.map(function (x) { return 'slope constant ' + x.s_ref_deg + '°: gaps ' + x.oman_only.gap + ' (Oman) / ' + x.with_check_sites.gap + ' (+check sites)'; }).join('; ');
    h += '<p class="sub">Sensitivity of the number of GAP targets: ' + esc(sens) + '.</p>';
    $('second').innerHTML = h;
  }
})();
