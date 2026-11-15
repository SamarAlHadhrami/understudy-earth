/* Quick tour: plain JS, no library. Each step highlights a real part of the app. */
(function () {
  'use strict';
  var KEY = 'ue_tour_seen';
  var STEPS = [
    { sel: '.brand', title: 'What this does', text: 'Understudy Earth looks in Oman, and at two outside check sites, for ground that resembles a Moon or Mars target, and for the months when the weather suits your test. It is a screening tool, not a site selector.' },
    { sel: '#b-target', title: 'Choose a target', text: 'Pick a Moon or Mars place to copy. Targets marked threshold-sensitive change their result with the cut-offs we chose, so treat those as less firm.' },
    { sel: '#b-needs', title: 'Describe your test', text: 'Use a preset, type one sentence, or move the sliders for temperature, wind, dryness, sunlight and slope. These numbers are your choice or our assumption, not mission requirements.' },
    { sel: '.legend', title: 'Read the map colours', text: 'Each square is 10 km. GOOD is among the closest 5% of squares to the target and has a month that fits. PARTIAL is a weaker match. WEAK is hatched. Grey means no qualifying candidate: no square we searched is close enough. That says nothing about the rest of Earth.' },
    { sel: '#result .strip', fallback: '#result', title: 'See when it fits', text: 'Click a square to see its twelve months. Each month is scored by its weakest factor. Climate is a typical-year average on a coarse grid, not local weather.', needsResult: true },
    { sel: '#result .verdict', fallback: '#result', title: 'Fit Verdict and limits', text: 'The Fit Verdict is a soft score that you can re-weight. It is not a pass or fail. Further down, the limits box lists what Earth cannot copy and what our data cannot see. Read it before using a number.', needsResult: true },
    { sel: '#result .twins', fallback: '#result', title: 'Twin pictures and context', text: 'The twin pictures show the target and the Earth square from the same relief data. Geology, access and temperature rows are context, not scored.', needsResult: true },
    { sel: '#demobar', title: 'Demo buttons, brief, share link', text: 'Demo runs a good match, a case with no qualifying candidate, and a known failure. Brief makes a one-page summary for printing. Copy share link, at the end of the panel, stores your choices in the address.' },
    { sel: 'nav .grp[aria-label=Evidence]', title: 'Check the checker', text: 'The Evidence tabs show how the method does on known sites, where it is threshold-sensitive, and the AMADEE-18 replay, a known case where it does not pick the real month.' }
  ];
  var i = 0, card, hl, offer, lastFocus;
  function $(s) { return document.querySelector(s); }
  function seen() { try { return localStorage.getItem(KEY) === '1'; } catch (e) { return false; } }
  function mark() { try { localStorage.setItem(KEY, '1'); } catch (e) { } }
  function build() {
    if (card) return;
    hl = document.createElement('div'); hl.className = 'tour-hl'; hl.setAttribute('aria-hidden', 'true');
    card = document.createElement('div'); card.className = 'tour-card'; card.setAttribute('role', 'dialog'); card.setAttribute('aria-modal', 'true'); card.setAttribute('aria-labelledby', 'tour-h');
    card.innerHTML = '<h2 id="tour-h" tabindex="-1"></h2><p id="tour-p" aria-live="polite"></p><div class="tour-foot"><span class="tour-count" id="tour-c"></span><button type="button" class="quiet" id="tour-skip">Skip</button><button type="button" id="tour-back">Back</button><button type="button" class="primary" id="tour-next">Next</button></div>';
    document.body.appendChild(hl); document.body.appendChild(card);
    $('#tour-skip').onclick = close;
    $('#tour-back').onclick = function () { go(i - 1); };
    $('#tour-next').onclick = function () { if (i >= STEPS.length - 1) close(); else go(i + 1); };
    card.addEventListener('keydown', trap);
  }
  function trap(e) {
    if (e.key !== 'Tab') return;
    var f = [].slice.call(card.querySelectorAll('button:not([disabled])'));
    var first = f[0], last = f[f.length - 1];
    if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  }
  function onKey(e) { if (e.key === 'Escape') { e.preventDefault(); close(); } }
  function visible(el) { return !!el && el.offsetParent !== null && el.getBoundingClientRect().height > 0; }
  function ensureResult() {
    if ($('#result .strip')) return;
    var t = $('.tab[data-view=map]'); if (t) t.click();
    var d = $('[data-demo=good]'); if (d) d.click();
  }
  function start() {
    build(); mark(); closeOffer(); lastFocus = document.activeElement;
    var t = $('.tab[data-view=map]'); if (t && !$('#v-map.on')) t.click();
    document.body.classList.add('tour-on'); document.addEventListener('keydown', onKey, true);
    go(0);
  }
  function go(n) {
    i = Math.max(0, Math.min(STEPS.length - 1, n)); var s = STEPS[i];
    if (s.needsResult) ensureResult();
    var el = $(s.sel); if (!visible(el) && s.fallback) el = $(s.fallback);
    $('#tour-h').textContent = s.title; $('#tour-p').textContent = s.text;
    $('#tour-c').textContent = (i + 1) + ' of ' + STEPS.length;
    $('#tour-back').disabled = i === 0; $('#tour-next').textContent = i === STEPS.length - 1 ? 'Done' : 'Next';
    if (visible(el)) {
      var phone = window.innerWidth <= 860;
      el.scrollIntoView({ block: phone ? 'start' : 'center', inline: 'nearest' });
      if (phone) window.scrollBy(0, -70);
      setTimeout(function () { place(el); }, 80);
    } else { hl.style.display = 'none'; centre(); }
    $('#tour-next').focus();
  }
  function place(el) {
    var r = el.getBoundingClientRect(), p = 6, vw = window.innerWidth, vh = window.innerHeight;
    var top = Math.max(2, r.top - p), left = Math.max(2, r.left - p);
    var h = Math.min(r.height + 2 * p, vh - top - 2), w = Math.min(r.width + 2 * p, vw - left - 2);
    hl.style.display = 'block'; hl.style.top = top + 'px'; hl.style.left = left + 'px'; hl.style.width = w + 'px'; hl.style.height = h + 'px';
    if (vw <= 860) { card.style.left = card.style.right = card.style.bottom = card.style.top = ''; return; }
    var cw = card.offsetWidth || 340, ch = card.offsetHeight || 200, x, y;
    if (left + w + cw + 16 < vw) x = left + w + 12;
    else if (left - cw - 12 > 0) x = left - cw - 12;
    else x = Math.max(12, Math.min(vw - cw - 12, left));
    y = top;
    if (x < left + w && x + cw > left) { y = top + h + 12; if (y + ch > vh) y = Math.max(12, top - ch - 12); }
    y = Math.max(12, Math.min(vh - ch - 12, y));
    card.style.left = x + 'px'; card.style.top = y + 'px'; card.style.right = 'auto'; card.style.bottom = 'auto';
  }
  function centre() { card.style.left = Math.max(12, (window.innerWidth - 340) / 2) + 'px'; card.style.top = '25%'; }
  function close() {
    document.body.classList.remove('tour-on'); document.removeEventListener('keydown', onKey, true);
    if (hl) hl.style.display = 'none';
    try { (lastFocus && lastFocus.focus ? lastFocus : $('#tourbtn')).focus(); } catch (e) { }
  }
  function showOffer() {
    offer = document.createElement('div'); offer.className = 'tour-offer on'; offer.setAttribute('role', 'region'); offer.setAttribute('aria-label', 'Quick tour');
    offer.innerHTML = '<p><b>New here?</b> A quick tour takes about a minute and points at each part of the tool.</p><div class="tour-foot"><button type="button" class="quiet" id="offer-no">No thanks</button><button type="button" class="primary" id="offer-yes">Start tour</button></div>';
    document.body.appendChild(offer);
    $('#offer-yes').onclick = start;
    $('#offer-no').onclick = function () { mark(); closeOffer(); };
  }
  function closeOffer() { if (offer) { offer.remove(); offer = null; } }
  window.addEventListener('resize', function () { if (document.body.classList.contains('tour-on')) go(i); });
  document.addEventListener('DOMContentLoaded', function () {
    var b = $('#tourbtn'); if (b) b.addEventListener('click', start);
    if (!seen()) setTimeout(function () { if (!document.body.classList.contains('tour-on')) { mark(); showOffer(); } }, 1800);
  });
})();
