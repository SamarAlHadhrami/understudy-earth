// Test needs: month fit, best months, ready-made tests and the sentence matcher. Pure functions, no AI at runtime.
(function (root) {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Margins over which a factor fades from fully met to not met. OUR ASSUMPTION, not a mission requirement.
  var MARGIN = { temp: 5, wind: 1.5, rh: 15, sun: 1 };
  // Ready-made tests. All numbers are OUR ASSUMPTION (no mission source); labelled in the app.
  var PRESETS = {
    rover: { label: 'Rover test', tlo: 0, thi: 40, wmin: 0, wmax: 10, rhmax: 100, smin: 4, limit: 17 },
    instrument: { label: 'Instrument test', tlo: 5, thi: 35, wmin: 0, wmax: 8, rhmax: 60, smin: 5, limit: 17 },
    walking: { label: 'Walking test', tlo: 5, thi: 35, wmin: 0, wmax: 7, rhmax: 100, smin: 3, limit: 17 },
    cold: { label: 'Cold test', tlo: -30, thi: 10, wmin: 0, wmax: 12, rhmax: 100, smin: 0, limit: 17 }
  };
  var DEFAULT = { tlo: 5, thi: 35, wmin: 0, wmax: 12, rhmax: 100, smin: 0, limit: 17 };

  function clamp01(x) { return x < 0 ? 0 : (x > 1 ? 1 : x); }

  // c: {tmax,tmin,wind,rh,srad} arrays of 12. Returns fit 0..100 for month m (weakest factor wins).
  function monthFit(c, m, n) {
    var p = [
      (c.tmax[m] - n.thi) / MARGIN.temp, (n.tlo - c.tmin[m]) / MARGIN.temp,
      (n.wmin - c.wind[m]) / MARGIN.wind, (c.wind[m] - n.wmax) / MARGIN.wind,
      (c.rh[m] - n.rhmax) / MARGIN.rh, (n.smin - c.srad[m]) / MARGIN.sun
    ];
    return 100 * (1 - clamp01(Math.max.apply(null, p)));
  }
  function allFits(c, n) { var f = []; for (var m = 0; m < 12; m++) f.push(monthFit(c, m, n)); return f; }
  // best months: those within 90% of the best fit (and fit >= 50), at most 3
  function bestMonths(fits) {
    var mx = Math.max.apply(null, fits);
    if (mx < 50) return [];
    var idx = fits.map(function (f, i) { return i; }).filter(function (i) { return fits[i] >= Math.max(50, 0.9 * mx); });
    idx.sort(function (a, b) { return fits[b] - fits[a]; });
    return idx.slice(0, 3).sort(function (a, b) { return a - b; });
  }
  function monthsText(ms) {
    if (!ms.length) return 'no month fits';
    var out = [], s = ms[0], prev = ms[0];
    for (var i = 1; i <= ms.length; i++) {
      var cur = ms[i];
      if (cur === prev + 1 || (prev === 11 && cur === 0)) { prev = cur; continue; }
      out.push(s === prev ? MON[s] : MON[s] + ' to ' + MON[prev]); s = cur; prev = cur;
    }
    return out.join(', ');
  }
  function needTier(fit) { return fit >= 75 ? 'match' : (fit >= 50 ? 'partial' : 'gap'); }
  var ORDER = { match: 0, partial: 1, gap: 2 };
  function worse(a, b) { return ORDER[a] >= ORDER[b] ? a : b; }

  // Rule-based word matcher. Returns {needs, said:[...]} so the user can see what was understood.
  function parseSentence(text, base) {
    var t = (' ' + text.toLowerCase() + ' '), n = Object.assign({}, base || DEFAULT), said = [];
    Object.keys(PRESETS).forEach(function (k) {
      if (t.indexOf(' ' + k + ' ') >= 0 || t.indexOf(' ' + k + 'test') >= 0 || (k === 'walking' && /\b(eva|walk)/.test(t))) {
        var p = PRESETS[k]; ['tlo', 'thi', 'wmin', 'wmax', 'rhmax', 'smin', 'limit'].forEach(function (f) { n[f] = p[f]; }); said.push(p.label + ' preset (our assumption)');
      }
    });
    var m = t.match(/slopes?[^0-9\-]*(\d+(?:\.\d+)?)\s*(?:to|-|and)\s*(\d+(?:\.\d+)?)/);
    if (m) { n.limit = Math.max(5, Math.min(30, Math.max(+m[1], +m[2]))); said.push('rover slope limit ' + n.limit + ' deg'); t = t.replace(m[0], ' '); }
    m = t.match(/(-?\d+(?:\.\d+)?)\s*(?:to|-|and)\s*(-?\d+(?:\.\d+)?)\s*(?:degrees|degree|deg|°|c\b|celsius)/);
    if (m) { n.tlo = Math.min(+m[1], +m[2]); n.thi = Math.max(+m[1], +m[2]); said.push('temperature ' + n.tlo + ' to ' + n.thi + ' C'); }
    if (/\bdry|arid|no humidity/.test(t)) { n.rhmax = 40; said.push('dry: humidity at most 40%'); }
    if (/\bhumid|damp/.test(t)) { n.rhmax = 100; said.push('humidity not limited'); }
    if (/windy|dust/.test(t)) { n.wmin = 4; said.push('windy / dust-like: wind at least 4 m/s'); }
    if (/\bcalm|low wind|no wind/.test(t)) { n.wmax = 4; said.push('calm: wind at most 4 m/s'); }
    if (/sunny|sunlight|solar|bright/.test(t)) { n.smin = 6; said.push('sunny: at least 6 kWh/m2/day'); }
    if (/\bcold\b/.test(t) && !m) { n.tlo = -30; n.thi = 10; said.push('cold: up to 10 C'); }
    return { needs: n, said: said };
  }

  var API = { MON: MON, MARGIN: MARGIN, PRESETS: PRESETS, DEFAULT: DEFAULT, monthFit: monthFit, allFits: allFits, bestMonths: bestMonths,
    monthsText: monthsText, needTier: needTier, worse: worse, parseSentence: parseSentence };
  if (typeof module !== 'undefined') module.exports = API; else root.UENeeds = API;
})(this);
