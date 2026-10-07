/* Small window manager: every floating card/popup can be closed (✕, Esc, click outside) and stale ones are dismissed automatically. */
(function (App) {
  var $ = function (id) { return document.getElementById(id); };
  var W = App.win = {};
  var POPUPS = ['helpMenu', 'modDrawer', 'paramsDrawer', 'glossary', 'settingsModal', 'keysModal', 'shareModal'];
  var TOGGLES = '#helpBtn,#modulesBtn,#paramsBtn,#settingsBtn,#shareBtn,.gl,#glossary,#keysModal,#settingsModal,#shareModal,#mobNav,#leftBottom';

  W.addClose = function (el, fn) {
    var b = document.createElement('button'); b.className = 'xbtn'; b.textContent = '✕'; b.setAttribute('aria-label', 'close');
    b.onclick = function (e) { e.stopPropagation(); if (fn) fn(); }; el.appendChild(b);
  };
  W.closePopups = function () {
    POPUPS.forEach(function (id) { var el = $(id); if (el) el.classList.remove('open'); });
    $('glPop').style.display = 'none'; $('tip').style.display = 'none';
    if (App.app && App.app.layoutChanged) App.app.layoutChanged();
  };
  // Esc: close whatever is open, topmost first
  W.escape = function () {
    if (App.onboarding && App.onboarding.active) { App.onboarding.end(); return; }
    var open = POPUPS.some(function (id) { var el = $(id); return el && el.classList.contains('open'); }) || $('glPop').style.display === 'block';
    if (open) { W.closePopups(); return; }
    if (App.layout && App.layout.sheet) { App.layout.closeSheet(); return; }
    if (App.pauses && App.pauses.active) { App.pauses.cont(); return; }
    if ($('modCard').classList.contains('open')) { App.app.userTouch(); App.modules.hideCard(); return; }
    if (App.state.overlays && App.state.overlays.micro) App.ui.setOverlay('micro', false);
  };
  W.init = function () {
    // clicking outside a popup closes it
    document.addEventListener('pointerdown', function (e) {
      var t = e.target; $('tip').style.display = 'none';
      if (!t.closest('.gl')) $('glPop').style.display = 'none';
      var changed = false;
      POPUPS.forEach(function (id) {
        var el = $(id);
        if (el && el.classList.contains('open') && !el.contains(t) && !t.closest(TOGGLES)) { el.classList.remove('open'); changed = true; }
      });
      if (changed) App.app.layoutChanged();
    }, true);
    document.addEventListener('keydown', function () { $('tip').style.display = 'none'; });
    document.addEventListener('wheel', function () { $('tip').style.display = 'none'; }, { passive: true });
    window.addEventListener('blur', function () { $('tip').style.display = 'none'; $('glPop').style.display = 'none'; });
    document.addEventListener('pointerleave', function () { $('tip').style.display = 'none'; });
    // explicit ✕ on the static modals/popups that have none
    ['glossary', 'settingsModal', 'keysModal', 'modDrawer'].forEach(function (id) {
      W.addClose($(id), function () { $(id).classList.remove('open'); App.app.layoutChanged(); });
    });
  };
})(window.App = window.App || {});
