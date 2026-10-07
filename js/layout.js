/* Interface modes: Study (laptop, full panels) · Presentation (projector: big type, clean stage, clicker keys) · Mobile (bottom sheets).
   Also: share link + QR code, full screen, toasts and URL parameters (?modo=presentacion|estudio, ?m=1..9, ?lang=es|en). */
(function (App) {
  var I = App.i18n, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var APP_URL = 'https://marston199.github.io/heridas-craneo/';
  var L = App.layout = { mode: 'study', mobile: false, sheet: null, params: {} };

  // ---- URL parameters (read before the UI starts) ----
  try {
    var q = new URLSearchParams(location.search);
    var m = (q.get('modo') || q.get('mode') || '').toLowerCase();
    if (m.indexOf('pres') === 0) L.params.mode = 'present'; else if (m.indexOf('est') === 0 || m.indexOf('stud') === 0) L.params.mode = 'study';
    var mn = parseInt(q.get('m'), 10); if (mn >= 1 && mn <= 9) L.params.module = mn;
    var lg = (q.get('lang') || '').toLowerCase(); if (lg === 'es' || lg === 'en') I.set(lg);
  } catch (e) {}
  try { var saved = localStorage.getItem('uimode'); if (saved === 'present' || saved === 'study') L.mode = saved; } catch (e) {}
  if (L.params.mode) L.mode = L.params.mode;

  L.shareUrl = function () { return /^https?:/.test(location.protocol) ? location.origin + location.pathname : APP_URL; };

  L.toast = function (msg, ms) {
    var el = $('toast'); el.textContent = msg; el.classList.add('show');
    clearTimeout(L._tt); L._tt = setTimeout(function () { el.classList.remove('show'); }, ms || 2600);
  };

  L.setMode = function (mode, quiet) {
    L.mode = mode === 'present' ? 'present' : 'study';
    document.body.classList.toggle('present', L.mode === 'present');
    try { localStorage.setItem('uimode', L.mode); } catch (e) {}
    document.querySelectorAll('#uiMode button').forEach(function (b) { b.classList.toggle('on', b.dataset.ui === L.mode); });
    if (L.mode === 'present') { L.closeSheet(); ['paramsDrawer', 'modDrawer'].forEach(function (id) { $(id).classList.remove('open'); }); }
    if (!quiet) L.toast(t(L.mode === 'present' ? 'toast_present' : 'toast_study'), 3600);
    L.measure(); if (App.app) { App.app.layoutChanged(); App.app.dirty(); }
    if (App.ui && App.ui.refresh) App.ui.refresh(true);
  };

  // ---- mobile: one bottom sheet at a time ----
  var SHEETS = { stage: 'stages', why: 'why', skin: 'skinWrap', params: 'leftBottom' };
  L.closeSheet = function () {
    Object.keys(SHEETS).forEach(function (k) { $(SHEETS[k]).classList.remove('sheet'); });
    document.querySelectorAll('#mobNav button').forEach(function (b) { b.classList.remove('on'); });
    L.sheet = null;
  };
  L.toggleSheet = function (k) {
    var was = L.sheet; L.closeSheet();
    if (was === k) return;
    $(SHEETS[k]).classList.add('sheet'); L.sheet = k;
    if (k === 'params') $('paramsDrawer').classList.add('open');
    document.querySelectorAll('#mobNav button').forEach(function (b) { b.classList.toggle('on', b.dataset.sh === k); });
  };
  L.checkMobile = function () {
    var mob = window.matchMedia('(max-width: 760px), (max-height: 520px)').matches;
    if (mob !== L.mobile) { L.mobile = mob; document.body.classList.toggle('mobile', mob); if (!mob) L.closeSheet(); }
    L.measure();
  };
  // transport height drives where sheets / captions sit
  L.measure = function () {
    var tb = $('transport'); if (!tb) return;
    document.documentElement.style.setProperty('--tbh', tb.offsetHeight + 'px');
  };

  // ---- big caption (presentation) / compact caption (mobile) ----
  L.caption = function (stg) {
    var st = App.state, el = $('presCap'); if (!el) return;
    var on = (L.mode === 'present' || L.mobile) && document.body.classList.contains('started') && st.view !== 'skull';
    el.style.display = on ? 'block' : 'none'; if (!on) return;
    var stage = $('pcStage'), text = $('pcText');
    if (st.view === 'compare') {
      stage.textContent = (stg + 1) + ' · ' + t('e' + stg) + ' / ' + t('x' + stg);
      text.innerHTML = ''; var a = document.createElement('div'), b = document.createElement('div');
      a.style.color = 'var(--en)'; b.style.color = 'var(--ex)'; a.textContent = t('mode_entry') + ': ' + t('ce' + stg); b.textContent = t('mode_exit') + ': ' + t('cx' + stg);
      text.appendChild(a); text.appendChild(b);
    } else {
      var x = st.mode === 'exit';
      stage.textContent = (stg + 1) + ' · ' + t((x ? 'x' : 'e') + stg);
      App.ui.rich(text, t((x ? 'cx' : 'ce') + stg));
    }
  };

  // ---- share: link + QR code ----
  L.openShare = function () {
    var url = L.shareUrl(), box = $('qrBox');
    box.innerHTML = '';
    if (window.qrcode) {
      var qr = window.qrcode(0, 'M'); qr.addData(url); qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 6, margin: 2, scalable: true });
    }
    $('shareUrl').textContent = url;
    $('shareModal').classList.add('open');
  };
  L.copyLink = function () {
    var url = L.shareUrl();
    function ok() { L.toast(t('copied')); }
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, fallback); else fallback();
    function fallback() { var ta = document.createElement('textarea'); ta.value = url; document.body.appendChild(ta); ta.select(); try { document.execCommand('copy'); ok(); } catch (e) {} ta.remove(); }
  };
  L.fullscreen = function () {
    var d = document;
    if (!d.fullscreenElement) { var r = d.documentElement.requestFullscreen; if (r) r.call(d.documentElement).catch(function () {}); }
    else if (d.exitFullscreen) d.exitFullscreen();
  };

  L.init = function () {
    document.querySelectorAll('#uiMode button').forEach(function (b) { b.onclick = function () { L.setMode(b.dataset.ui); }; });
    document.querySelectorAll('#mobNav button').forEach(function (b) { b.onclick = function () { L.toggleSheet(b.dataset.sh); }; });
    $('shareBtn').onclick = L.openShare; $('copyLink').onclick = L.copyLink; $('fsBtn').onclick = L.fullscreen;
    $('shareClose').onclick = function () { $('shareModal').classList.remove('open'); };
    window.addEventListener('resize', function () { L.checkMobile(); });
    document.addEventListener('fullscreenchange', function () { $('fsBtn').classList.toggle('on', !!document.fullscreenElement); });
    L.checkMobile(); L.setMode(L.mode, true);
  };
})(window.App = window.App || {});
