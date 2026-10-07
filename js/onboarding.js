(function (App) {
  var I = App.i18n, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var STEPS = [['#tabs', 'ob1'], ['#transport', 'ob2'], ['#stages', 'ob3'], ['#why', 'ob4'], ['#modulesBtn', 'ob5']];
  var O = App.onboarding = { i: 0, active: false, onDone: null };

  O.needed = function () { try { return localStorage.getItem('onboarded') !== '1'; } catch (e) { return true; } };
  O.start = function (onDone) { O.i = 0; O.active = true; O.onDone = onDone || null; $('coach').style.display = 'block'; O.show(); };
  O.show = function () {
    var s = STEPS[O.i], el = document.querySelector(s[0]), box = $('coachBox'), bub = $('coachBubble');
    var r = el && el.getClientRects().length > 0 ? el.getBoundingClientRect() : { left: window.innerWidth / 2 - 60, top: 80, width: 120, height: 40, bottom: 120 };
    box.style.left = (r.left - 6) + 'px'; box.style.top = (r.top - 6) + 'px'; box.style.width = (r.width + 12) + 'px'; box.style.height = (r.height + 12) + 'px';
    $('coachText').textContent = (O.i + 1) + '/' + STEPS.length + ' · ' + t(s[1]);
    $('coachNext').textContent = O.i === STEPS.length - 1 ? '✓' : t('ob_next'); $('coachSkip').textContent = t('ob_skip');
    var bw = 320, left = Math.min(window.innerWidth - bw - 12, Math.max(12, r.left)), top = r.bottom + 16;
    if (top + 140 > window.innerHeight) top = Math.max(12, r.top - 150);
    bub.style.left = left + 'px'; bub.style.top = top + 'px';
  };
  O.next = function () { if (O.i < STEPS.length - 1) { O.i++; O.show(); } else O.end(); };
  O.end = function () {
    O.active = false; $('coach').style.display = 'none';
    try { localStorage.setItem('onboarded', '1'); } catch (e) {}
    if (O.onDone) { var f = O.onDone; O.onDone = null; f(); }
  };
  document.addEventListener('DOMContentLoaded', function () {
    $('coachNext').onclick = O.next; $('coachSkip').onclick = O.end;
  });
})(window.App = window.App || {});
