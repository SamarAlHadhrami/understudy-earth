// Terrain similarity. Mirrors pipeline/scoring.py exactly (checked by tests/check_js_score.js).
(function (root) {
  function make(meta) {
    var SE = meta.slope_edges, NS = SE.length - 1, NR = meta.rough_edges.length - 1, SW = [], i;
    for (i = 0; i < NS; i++) SW.push(SE[i + 1] - SE[i]);
    function slopeMarg(w) {
      if (w._sm) return w._sm;
      var s = new Array(NS).fill(0);
      for (var a = 0; a < NS; a++) for (var b = 0; b < NR; b++) s[a] += w.hist[a * NR + b];
      return (w._sm = s);
    }
    function trav(w, lim) {
      var m = slopeMarg(w), tot = 0, acc = 0;
      for (var a = 0; a < NS; a++) {
        tot += m[a];
        if (lim >= SE[a + 1]) acc += m[a]; else if (lim > SE[a]) acc += m[a] * (lim - SE[a]) / (SE[a + 1] - SE[a]);
      }
      return acc / tot;
    }
    function w1(pa, pb) {
      var sa = 0, sb = 0, ca = 0, cb = 0, d = 0, k;
      for (k = 0; k < pa.length; k++) { sa += pa[k]; sb += pb[k]; }
      for (k = 0; k < pa.length; k++) { ca += pa[k] / sa; cb += pb[k] / sb; d += Math.abs(ca - cb) * SW[k]; }
      return d;
    }
    var L = Math.log1p, S = meta.scales;
    function terms(a, b) {
      return [w1(slopeMarg(a), slopeMarg(b)), Math.abs(a.slope_p90 - b.slope_p90), Math.abs(a.steep_share - b.steep_share),
        Math.abs(L(a.rough_med) - L(b.rough_med)), Math.abs(L(a.rough1k_med) - L(b.rough1k_med)), Math.abs(L(a.relief_m) - L(b.relief_m))];
    }
    function distance(a, b) { var t = terms(a, b), s = 0; for (var k = 0; k < 6; k++) s += t[k] / S[k]; return s / 6; }
    // fills .d and .rank (0..1, 0 = closest) on every window for this target
    function rankAll(wins, target) {
      var ds = wins.map(function (w) { return distance(w, target); });
      var idx = ds.map(function (_, k) { return k; }).sort(function (x, y) { return ds[x] - ds[y]; });
      idx.forEach(function (k, r) { wins[k].d = ds[k]; wins[k].rank = r / wins.length; });
    }
    function mapTier(rank) { return rank < meta.match_rank ? 'match' : (rank < meta.partial_rank ? 'partial' : 'gap'); }
    function gapTier(d) { return d < meta.thr_match_dist ? 'match' : (d < meta.thr_partial_dist ? 'partial' : 'gap'); }
    return { distance: distance, terms: terms, trav: trav, rankAll: rankAll, mapTier: mapTier, gapTier: gapTier };
  }
  if (typeof module !== 'undefined') module.exports = make; else root.UEScore = make;
})(this);
