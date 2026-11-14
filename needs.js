// Test needs: month fit, best months, ready-made tests and the sentence matcher. Pure functions, no AI at runtime.
(function (root) {
  var MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  // Margins over which a factor fades from fully met to not met. OUR ASSUMPTION, not a mission requirement.
  var MARGIN = { temp: 5, wind: 1.5, rh: 15, sun: 1 };
  // Ready-made tests. All numbers are OUR ASSUMPTION (no mission source); labelled in the app.
  var PRESETS = {
    rover: { label: 'Rover test', tlo: 0, thi: 40, wmin: 0, wmax: 10, rhmax: 100, smin: 4, limit: 15 },
    instrument: { label: 'Instrument test', tlo: 5, thi: 35, wmin: 0, wmax: 8, rhmax: 60, smin: 5, limit: 15 },
    walking: { label: 'Walking test', tlo: 5, thi: 35, wmin: 0, wmax: 7, rhmax: 100, smin: 3, limit: 15 },
    cold: { label: 'Cold test', tlo: -30, thi: 10, wmin: 0, wmax: 12, rhmax: 100, smin: 0, limit: 15 }
  };
  var DEFAULT = { tlo: 0, thi: 40, wmin: 0, wmax: 12, rhmax: 100, smin: 4, limit: 15 };

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

  // Rule-based matcher (typed input only, no AI). Returns {needs, said:[{field,text}], unknown:[words], refused:bool}.
  // It only accepts what the rules below understand; unknown input is refused, never guessed.
  var STOP = /^(a|an|the|and|or|with|for|test|tests|please|need|needs|want|i|my|is|are|be|at|in|of|to|on|should|must|it|that|day|days|during|temperature|temperatures|about)$/;
  function parseSentence(text, base) {
    var raw = String(text || '').toLowerCase(), t = ' ' + raw + ' ', n = Object.assign({}, base || DEFAULT), said = [], m;
    function take(re, fn) { var mm = t.match(re); if (mm) { fn(mm); t = t.replace(mm[0], ' '); return true; } return false; }
    var NUM = '(-?\\d+(?:\\.\\d+)?)';
    Object.keys(PRESETS).forEach(function (k) {
      var re = new RegExp('\\b' + k + '(?: test)?\\b');
      if (re.test(t) || (k === 'walking' && /\b(eva|walk)/.test(t))) {
        var p = PRESETS[k]; ['tlo', 'thi', 'wmin', 'wmax', 'rhmax', 'smin', 'limit'].forEach(function (f) { n[f] = p[f]; });
        said.push({ field: 'preset', text: p.label + ' preset (our assumption): ' + p.tlo + ' to ' + p.thi + ' \u00b0C, wind ' + p.wmin + '-' + p.wmax + ' m/s, humidity up to ' + p.rhmax + '%, sun at least ' + p.smin + ' kWh/m\u00b2/day' });
        t = t.replace(re, ' ').replace(/\b(eva|walk\w*)\b/, ' ');
      }
    });
    take(new RegExp('slopes?[^0-9\\-]{0,12}' + NUM + '\\s*(?:to|-|and)\\s*' + NUM), function (mm) { n.limit = Math.max(5, Math.min(30, Math.max(+mm[1], +mm[2]))); said.push({ field: 'limit', text: 'slope limit ' + n.limit + '\u00b0 (user-set)' }); });
    take(new RegExp('slopes?\\s*(?:up to|below|under|max(?:imum)?(?: of)?|at most)\\s*' + NUM), function (mm) { n.limit = Math.max(5, Math.min(30, +mm[1])); said.push({ field: 'limit', text: 'slope limit ' + n.limit + '\u00b0 (user-set)' }); });
    take(new RegExp('(?:between\\s+)?' + NUM + '\\s*(?:to|-|and)\\s*' + NUM + '\\s*(?:degrees|degree|deg|\u00b0c|\u00b0|c\\b|celsius)'), function (mm) { n.tlo = Math.min(+mm[1], +mm[2]); n.thi = Math.max(+mm[1], +mm[2]); said.push({ field: 'temp', text: 'air temperature ' + n.tlo + ' to ' + n.thi + ' \u00b0C' }); });
    take(new RegExp('(?:below|under|up to|at most|max(?:imum)?)\\s*' + NUM + '\\s*(?:degrees|deg|\u00b0c|\u00b0|c\\b|celsius)'), function (mm) { n.thi = +mm[1]; said.push({ field: 'temp', text: 'daytime highs up to ' + n.thi + ' \u00b0C' }); });
    take(new RegExp('(?:above|over|at least|min(?:imum)?)\\s*' + NUM + '\\s*(?:degrees|deg|\u00b0c|\u00b0|c\\b|celsius)'), function (mm) { n.tlo = +mm[1]; said.push({ field: 'temp', text: 'night lows at least ' + n.tlo + ' \u00b0C' }); });
    take(new RegExp('wind\\s*(?:below|under|up to|at most|max(?:imum)?)\\s*' + NUM + '\\s*(?:m/s|ms|mps)?'), function (mm) { n.wmax = +mm[1]; said.push({ field: 'wind', text: 'wind at most ' + n.wmax + ' m/s' }); });
    take(new RegExp('wind\\s*(?:above|over|at least|min(?:imum)?)\\s*' + NUM + '\\s*(?:m/s|ms|mps)?'), function (mm) { n.wmin = +mm[1]; said.push({ field: 'wind', text: 'wind at least ' + n.wmin + ' m/s' }); });
    take(new RegExp('humidity\\s*(?:below|under|up to|at most|max(?:imum)?)\\s*' + NUM + '\\s*%?'), function (mm) { n.rhmax = Math.max(10, Math.min(100, +mm[1])); said.push({ field: 'dry', text: 'humidity at most ' + n.rhmax + '%' }); });
    take(new RegExp('(?:sun(?:light)?|solar)\\s*(?:at least|above|over|min(?:imum)?)?\\s*' + NUM + '\\s*(?:kwh)?'), function (mm) { n.smin = Math.max(0, Math.min(8, +mm[1])); said.push({ field: 'sun', text: 'sunlight at least ' + n.smin + ' kWh/m\u00b2/day' }); });
    take(/\b(?:dry|arid)\b/, function () { n.rhmax = 40; said.push({ field: 'dry', text: 'dry: humidity at most 40%' }); });
    take(/\b(?:humid|damp)\b/, function () { n.rhmax = 100; said.push({ field: 'dry', text: 'humidity not limited' }); });
    take(/\b(?:windy|dusty)\b/, function () { n.wmin = 4; said.push({ field: 'wind', text: 'windy: wind at least 4 m/s' }); });
    take(/\b(?:calm|low wind|no wind)\b/, function () { n.wmax = 4; said.push({ field: 'wind', text: 'calm: wind at most 4 m/s' }); });
    take(/\b(?:sunny|bright)\b/, function () { n.smin = 6; said.push({ field: 'sun', text: 'sunny: at least 6 kWh/m\u00b2/day' }); });
    take(/\bcold\b/, function () { if (!said.some(function (x) { return x.field === 'temp'; })) { n.tlo = -30; n.thi = 10; said.push({ field: 'temp', text: 'cold: -30 to 10 \u00b0C' }); } });
    take(/\b(?:hot|warm)\b/, function () { if (!said.some(function (x) { return x.field === 'temp'; })) { n.tlo = 10; n.thi = 45; said.push({ field: 'temp', text: 'hot: 10 to 45 \u00b0C' }); } });
    var unknown = t.replace(/[0-9.,%\u00b0:;()\/-]+/g, ' ').split(/\s+/).filter(function (w) { return w && !STOP.test(w); });
    var refused = !said.length;
    return { needs: refused ? Object.assign({}, base || DEFAULT) : n, said: said, unknown: unknown, refused: refused };
  }

  // Per-factor fit for one month (0..100 each): temperature, wind, dryness, sunlight.
  function monthFactors(c, m, n) {
    var f = function (x) { return 100 * (1 - clamp01(x)); };
    return {
      temp: f(Math.max((c.tmax[m] - n.thi) / MARGIN.temp, (n.tlo - c.tmin[m]) / MARGIN.temp)),
      wind: f(Math.max((n.wmin - c.wind[m]) / MARGIN.wind, (c.wind[m] - n.wmax) / MARGIN.wind)),
      dry: f((c.rh[m] - n.rhmax) / MARGIN.rh),
      sun: f((n.smin - c.srad[m]) / MARGIN.sun)
    };
  }
  // Terrain fit 0..100 from the distance to the target: 100 inside the match threshold, 0 at twice the partial threshold.
  function terrainFit(d, thrMatch, thrPartial) {
    if (d <= thrMatch) return 100;
    var top = 2 * thrPartial; return Math.round(100 * (1 - clamp01((d - thrMatch) / (top - thrMatch))));
  }
  var FACTOR_NAMES = { terrain: 'Terrain', temp: 'Temperature', wind: 'Wind', dry: 'Dryness', sun: 'Sunlight', access: 'Access (OSM)' };
  // Overall fit = weighted mean of the factors with weight > 0. Weights default to 1 (user adjustable).
  function fitVerdict(factors, weights) {
    var keys = Object.keys(factors), sw = 0, sum = 0, worst = null;
    keys.forEach(function (k) {
      var w = weights && weights[k] != null ? weights[k] : 1; if (w <= 0) return;
      sw += w; sum += w * factors[k]; if (worst === null || factors[k] < factors[worst]) worst = k;
    });
    var overall = sw ? Math.round(sum / sw) : 0;
    var label = overall >= 75 ? 'Strong fit' : (overall >= 50 ? 'Good with gaps' : 'Poor fit');
    return { overall: overall, label: label, worst: worst, worstName: worst ? FACTOR_NAMES[worst] : null };
  }
  // Confidence from data resolution: High never (climate is about 50 km); Medium inside the 30 m Oman tiles with a firm site; else Low.
  function confidenceLevel(inOman, approxSite) { return inOman && !approxSite ? 'Medium' : 'Low'; }

  var API = { monthFactors: monthFactors, terrainFit: terrainFit, fitVerdict: fitVerdict, confidenceLevel: confidenceLevel, FACTOR_NAMES: FACTOR_NAMES, MON: MON, MARGIN: MARGIN, PRESETS: PRESETS, DEFAULT: DEFAULT, monthFit: monthFit, allFits: allFits, bestMonths: bestMonths,
    monthsText: monthsText, needTier: needTier, worse: worse, parseSentence: parseSentence };
  if (typeof module !== 'undefined') module.exports = API; else root.UENeeds = API;
})(this);
