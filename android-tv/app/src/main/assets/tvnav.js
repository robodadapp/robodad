/* RoboDad TV: move around any page with the TV remote's arrow buttons.
   Arrows jump to the nearest button, link or box in that direction, OK presses it,
   and whatever has focus gets a bright yellow outline you can see from the sofa. */
(function () {
  if (window.__tvnav) return;
  window.__tvnav = true;

  var SEL = 'a[href],button,input:not([type=hidden]),textarea,select,summary,[tabindex]:not([tabindex="-1"]),[role=button],[role=tab],[role=option]';

  function addStyle() {
    var st = document.createElement('style');
    st.textContent = ':focus{outline:4px solid #FFC83D !important;outline-offset:3px !important}' +
      '::-webkit-scrollbar{width:0;height:0}';
    (document.head || document.documentElement).appendChild(st);
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', addStyle); else addStyle();

  function visible(e) {
    if (e.disabled) return false;
    var r = e.getBoundingClientRect();
    if (r.width < 2 || r.height < 2) return false;
    if (e.closest('[hidden],[inert],[aria-hidden=true]')) return false;
    var s = getComputedStyle(e);
    return s.visibility !== 'hidden' && s.display !== 'none' && parseFloat(s.opacity || '1') > 0.05;
  }

  // An open popup (age check, dialog, menu) keeps the arrows inside it.
  function openPopup() {
    var c = document.querySelectorAll('dialog[open], [aria-modal="true"], [role="dialog"], .overlay:not([hidden]), .modal.open, .side.open');
    for (var i = c.length - 1; i >= 0; i--) if (visible(c[i]) && c[i].querySelector(SEL)) return c[i];
    return null;
  }
  // Skip anything hidden behind something else on screen.
  function onTop(e) {
    var r = e.getBoundingClientRect();
    var x = Math.min(Math.max(r.left + r.width / 2, 0), innerWidth - 1), y = Math.min(Math.max(r.top + r.height / 2, 0), innerHeight - 1);
    if (r.bottom < 0 || r.top > innerHeight) return true; // off screen: can't test, allow (it will scroll into view)
    var hit = document.elementFromPoint(x, y);
    return !hit || hit === e || e.contains(hit) || hit.contains(e) || (hit.closest && hit.closest('label') && hit.closest('label').contains(e));
  }
  function candidates() {
    var scope = openPopup() || document;
    var all = scope.querySelectorAll(SEL), out = [];
    for (var i = 0; i < all.length; i++) if (visible(all[i]) && (scope !== document || onTop(all[i]))) out.push(all[i]);
    return out;
  }

  function overlap(a1, a2, b1, b2) { return Math.min(a2, b2) - Math.max(a1, b1); }

  function move(key) {
    var cur = document.activeElement;
    if (!cur || cur === document.body || cur === document.documentElement || !visible(cur)) cur = null;
    var pop = openPopup();
    if (cur && pop && !pop.contains(cur)) cur = null;
    var list = candidates();
    if (!list.length) return false;
    if (!cur) {
      var first = (!openPopup() && document.querySelector('[data-tv-first]')) || list[0];
      first.focus();
      return true;
    }
    var a = cur.getBoundingClientRect();
    var ax = a.left + a.width / 2, ay = a.top + a.height / 2;
    var best = null, bestScore = Infinity;
    for (var i = 0; i < list.length; i++) {
      var e = list[i];
      if (e === cur || cur.contains(e) || e.contains(cur)) continue;
      var b = e.getBoundingClientRect();
      var bx = b.left + b.width / 2, by = b.top + b.height / 2;
      var main, cross, ov;
      if (key === 'ArrowRight') { if (b.left < a.right - 2 && bx <= ax + 2) continue; main = b.left - a.right; ov = overlap(a.top, a.bottom, b.top, b.bottom); cross = Math.abs(by - ay); }
      else if (key === 'ArrowLeft') { if (b.right > a.left + 2 && bx >= ax - 2) continue; main = a.left - b.right; ov = overlap(a.top, a.bottom, b.top, b.bottom); cross = Math.abs(by - ay); }
      else if (key === 'ArrowDown') { if (b.top < a.bottom - 2 && by <= ay + 2) continue; main = b.top - a.bottom; ov = overlap(a.left, a.right, b.left, b.right); cross = Math.abs(bx - ax); }
      else { if (b.bottom > a.top + 2 && by >= ay - 2) continue; main = a.top - b.bottom; ov = overlap(a.left, a.right, b.left, b.right); cross = Math.abs(bx - ax); }
      var score = Math.max(main, 0) + (ov > 0 ? 0 : cross * 2) + cross * 0.3;
      if (score < bestScore) { bestScore = score; best = e; }
    }
    if (!best) return false;
    best.focus({ preventScroll: true });
    try { best.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' }); } catch (x) { best.scrollIntoView(false); }
    return true;
  }

  function typingIn(t) {
    if (!t) return false;
    if (t.tagName === 'TEXTAREA' || t.isContentEditable) return true;
    if (t.tagName !== 'INPUT') return false;
    return ['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color', 'file', 'image'].indexOf((t.type || '').toLowerCase()) < 0;
  }

  document.addEventListener('keydown', function (e) {
    var t = document.activeElement;
    if (e.key === 'Enter' && t && t !== document.body && !typingIn(t) &&
        ['BUTTON', 'A', 'INPUT', 'SELECT', 'SUMMARY'].indexOf(t.tagName) < 0) {
      t.click(); e.preventDefault(); return;
    }
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].indexOf(e.key) < 0) return;
    if (typingIn(t)) {
      var v = t.value || '';
      try {
        if (e.key === 'ArrowLeft' && t.selectionStart > 0) return;
        if (e.key === 'ArrowRight' && t.selectionEnd < v.length) return;
        if (t.tagName === 'TEXTAREA' && e.key === 'ArrowUp' && t.selectionStart > 0 && v.lastIndexOf('\n', t.selectionStart - 1) >= 0) return;
        if (t.tagName === 'TEXTAREA' && e.key === 'ArrowDown' && v.indexOf('\n', t.selectionEnd) >= 0) return;
      } catch (x) { }
    }
    if (move(e.key)) { e.preventDefault(); e.stopPropagation(); return; }
    if (openPopup()) { e.preventDefault(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      window.scrollBy({ top: (e.key === 'ArrowDown' ? 1 : -1) * window.innerHeight * 0.4, behavior: 'smooth' });
      e.preventDefault();
    }
  }, true);
})();
