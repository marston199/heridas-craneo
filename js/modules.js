(function (App) {
  var I = App.i18n, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var LIST = [
    { n: 1, view: 'detail', mode: 'entry', scenario: 'perp', ov: { stress: true, forces: true } },
    { n: 2, view: 'detail', mode: 'exit', scenario: 'perp', ov: { stress: true, forces: true } },
    { n: 3, view: 'compare', mode: null, scenario: 'perp', ov: { stress: true, forces: true } },
    { n: 4, view: 'detail', mode: 'entry', scenario: 'perp', ov: { stress: false, waves: true, bend: true, forces: true } },
    { n: 5, view: 'detail', mode: 'entry', scenario: 'perp', ov: { stress: false, micro: true } },
    { n: 6, view: 'detail', mode: 'entry', scenario: 'oblique', ov: { stress: true, forces: true } },
    { n: 7, view: 'detail', mode: 'entry', scenario: 'contact', range: 'contact', ov: { stress: true, forces: true } },
    { n: 8, view: 'skull', mode: null, scenario: 'tangential', ov: { stress: false } },
    { n: 9, view: 'skull', mode: null, scenario: 'perp', ov: { stress: false } }
  ];
  var M = App.modules = { list: LIST, timer: 0 };

  function load() { try { return JSON.parse(localStorage.getItem('progress') || '[]'); } catch (e) { return []; } }
  function save(a) { try { localStorage.setItem('progress', JSON.stringify(a)); } catch (e) {} }
  M.progress = load;
  M.reset = function () { save([]); M.renderDrawer(); };

  M.cancelAuto = function () { if (M.timer) { clearTimeout(M.timer); M.timer = 0; } if (M.timer2) { clearTimeout(M.timer2); M.timer2 = 0; } };
  M.hideCard = function () { $('modCard').classList.remove('open'); };

  M.start = function (n, opts) {
    var st = App.state, app = App.app, cfg = LIST[n - 1]; if (!cfg) return;
    M.cancelAuto(); opts = opts || {};
    st.module = n; st.moduleTour = !!opts.tour;
    st.scenario = cfg.scenario; st.overlays = Object.assign({ stress: false, waves: false, bend: false, micro: false, forces: false }, cfg.ov);
    st.stress = !!st.overlays.stress; $('cStress').checked = st.stress;
    if (cfg.range) app.setParam({ range: cfg.range }, true);
    if (app.setScenario) app.setScenario(cfg.scenario, true);
    M.starting = true; app.applyView(cfg.view, cfg.mode, false); M.starting = false;
    st.t = 0; st.playing = false; app.dirty();
    M.showIntro(n);
    if (opts.tour) M.timer = setTimeout(function () { M.begin(); }, 2600);
    M.renderDrawer(); App.ui.refresh(true);
  };

  M.showIntro = function (n) {
    var c = $('modCard');
    c.innerHTML = '<h4></h4><p id="mcIn"></p><button id="mcBegin"></button>';
    c.querySelector('h4').textContent = n + '. ' + t('m' + n + '_t');
    App.ui.rich($('mcIn'), t('m' + n + '_in'));
    $('mcBegin').textContent = t('begin'); $('mcBegin').onclick = function () { App.app.userTouchKeep(); M.begin(); };
    c.classList.add('open'); App.win.addClose(c, function () { App.app.userTouch(); M.hideCard(); });
  };
  M.begin = function () { M.cancelAuto(); M.hideCard(); var st = App.state; App.app.resetCine(); st.t = 0; st.playing = true; App.app.dirty(); App.ui.refresh(true); };

  M.complete = function () {
    var st = App.state, n = st.module; if (!n) return;
    var done = load(); if (done.indexOf(n) < 0) { done.push(n); save(done); }
    var c = $('modCard');
    c.innerHTML = '<h4></h4><ul></ul><div style="display:flex;gap:6px;margin-top:8px"></div>';
    c.querySelector('h4').textContent = '✓ ' + t('m' + n + '_t');
    t('m' + n + '_s').split('|').forEach(function (b) { var li = document.createElement('li'); App.ui.rich(li, b); c.querySelector('ul').appendChild(li); });
    var row = c.lastChild;
    if (!st.moduleTour) {
      var b1 = document.createElement('button'); b1.textContent = t('repeat'); b1.onclick = function () { M.start(n); }; row.appendChild(b1);
      if (n < LIST.length) { var b2 = document.createElement('button'); b2.textContent = t('next_module'); b2.onclick = function () { M.start(n + 1); }; row.appendChild(b2); }
    }
    c.classList.add('open'); M.renderDrawer(); App.win.addClose(c, function () { App.app.userTouch(); M.hideCard(); });
    if (!st.moduleTour) M.timer2 = setTimeout(M.hideCard, 12000);          // a finished-module summary never lingers
    if (st.moduleTour) M.timer = setTimeout(function () { if (n < 3) M.start(n + 1, { tour: true }); else { st.tourOn = false; st.moduleTour = false; M.hideCard(); App.ui.refresh(true); } }, 4200);
  };

  M.renderDrawer = function () {
    var done = load(), box = $('modList'), st = App.state; if (!box) return;
    box.innerHTML = '';
    LIST.forEach(function (m) {
      var d = document.createElement('div'); d.className = 'mod' + (done.indexOf(m.n) >= 0 ? ' done' : '') + (st.module === m.n ? ' cur' : '');
      d.innerHTML = '<b>' + (done.indexOf(m.n) >= 0 ? '✓' : m.n) + '</b><span></span>'; d.lastChild.textContent = t('m' + m.n + '_t');
      d.onclick = function () { App.app.userTouch(); M.start(m.n); $('modDrawer').classList.remove('open'); App.app.layoutChanged(); };
      box.appendChild(d);
    });
    $('modProg').textContent = I.fmt('completed', { n: done.length });
  };
})(window.App = window.App || {});
