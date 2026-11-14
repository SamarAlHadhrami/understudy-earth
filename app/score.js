// Match score. Mirrors pipeline/scoring.py exactly (checked by tests/check_js_score.js).
(function (root) {
  function make(meta) {
    var SE = meta.slope_edges, RE = meta.rough_edges, NS = SE.length - 1, NR = RE.length - 1;
    var sW = [], rW = [], i;
    for (i = 0; i < NS; i++) sW.push(SE[i + 1] - SE[i]);
    for (i = 0; i < NR; i++) rW.push(RE[i + 1] - RE[i]);
    function marg(h) {
      var s = new Array(NS).fill(0), r = new Array(NR).fill(0);
      for (var a = 0; a < NS; a++) for (var b = 0; b < NR; b++) { var v = h[a * NR + b]; s[a] += v; r[b] += v; }
      return { s: s, r: r };
    }
    function trav(m, lim) {
      var tot = 0, acc = 0;
      for (var a = 0; a < NS; a++) {
        tot += m.s[a];
        if (lim >= SE[a + 1]) acc += m.s[a];
        else if (lim > SE[a]) acc += m.s[a] * (lim - SE[a]) / (SE[a + 1] - SE[a]);
      }
      return acc / tot;
    }
    function w1(pa, pb, w) {
      var sa = 0, sb = 0, i, ca = 0, cb = 0, d = 0;
      for (i = 0; i < pa.length; i++) { sa += pa[i]; sb += pb[i]; }
      for (i = 0; i < pa.length; i++) { ca += pa[i] / sa; cb += pb[i] / sb; d += Math.abs(ca - cb) * w[i]; }
      return d;
    }
    function prep(win) { var m = marg(win.hist); win._m = m; return win; }
    function score(a, b, lim) {
      var ma = a._m || marg(a.hist), mb = b._m || marg(b.hist);
      var dT = Math.abs(trav(ma, lim) - trav(mb, lim));
      var dS = Math.min(1, w1(ma.s, mb.s, sW) / meta.s_ref);
      var dR = Math.min(1, w1(ma.r, mb.r, rW) / meta.r_ref);
      var D = meta.w[0] * dT + meta.w[1] * dS + meta.w[2] * dR;
      return { score: 100 * (1 - D), dT: dT, dS: dS, dR: dR, tA: trav(ma, lim), tB: trav(mb, lim) };
    }
    return { prep: prep, score: score, trav: trav, marg: marg };
  }
  if (typeof module !== 'undefined') module.exports = make; else root.UEScore = make;
})(this);
