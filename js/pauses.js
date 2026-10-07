/* Optional didactic pauses (setting, OFF by default): the animation freezes at key moments with a numbered, annotated card. */
(function (App) {
  var I = App.i18n, t = I.t, S = App.sim;
  var $ = function (id) { return document.getElementById(id); };
  var P = App.pauses = { active: null, done: {}, forced: null };

  var DEFS = {
    entry: [
      { t: 0.31, k: 'pe1', a: function (d) { return [d.r0 + 3, -d.To / 2]; } },
      { t: 0.48, k: 'pe2', force: 'waves', a: function (d) { return [d.r0 + 4, -d.T]; } },
      { t: 0.70, k: 'pe3', force: 'micro', a: function (d) { return [d.rFar + 2, -d.T]; } },
      { t: 0.96, k: 'pe4', a: function (d) { return [0, -d.T - 4]; } }],
    exit: [
      { t: 0.20, k: 'px1', a: function (d) { return [0, -d.T - 4]; } },
      { t: 0.36, k: 'px2', a: function (d) { return [d.r0 + 3, -d.T + d.Ti / 2]; } },
      { t: 0.70, k: 'px3', force: 'micro', a: function (d) { return [d.rFar + 2, 0]; } },
      { t: 0.96, k: 'px4', a: function (d) { return [0, 6]; } }],
    oblique: [
      { t: 0.72, k: 'po1', a: function (d) { return [d.rFar + 2, -d.T]; } },
      { t: 0.96, k: 'pe4', a: function (d) { return [0, -d.T - 4]; } }],
    contact: [
      { t: 0.22, k: 'pc1', a: function (d) { return [d.r0 + 3, 1]; } },
      { t: 0.33, k: 'pc2', a: function (d) { return [d.r0 + 3, 4]; } },
      { t: 0.90, k: 'pc3', a: function (d) { return [d.r0 * 2.6, 0.5]; } }]
  };

  P.list = function () {
    var st = App.state;
    if (st.view !== 'detail') return [];
    if (st.scenario === 'oblique') return DEFS.oblique;
    if (st.scenario === 'contact') return DEFS.contact;
    return DEFS[st.mode] || [];
  };
  P.key = function (i) { var st = App.state; return st.view + st.mode + st.scenario + i; };
  P.reset = function (fromT) { P.list().forEach(function (d, i) { if (fromT === undefined || d.t > fromT + 0.003) delete P.done[P.key(i)]; }); };

  // crossing test; returns { def, i } or null
  P.check = function (prevT, newT) {
    var st = App.state; if (!st.pauses || P.active) return null;
    var l = P.list(), i;
    for (i = 0; i < l.length; i++) if (prevT < l[i].t && newT >= l[i].t && !P.done[P.key(i)]) return { def: l[i], i: i };
    return null;
  };

  P.show = function (hit) {
    var st = App.state, def = hit.def;
    st.playing = false; st.t = def.t; P.done[P.key(hit.i)] = true; P.active = { def: def, i: hit.i };
    if (def.force && !st.overlays[def.force]) { P.forced = def.force; App.ui.setOverlay(def.force, true); } else P.forced = null;
    var c = $('pauseCard');
    c.innerHTML = '<h4></h4><p></p><button></button>';
    c.querySelector('h4').textContent = t(def.k + '_t'); c.querySelector('p').textContent = t(def.k + '_b');
    var b = c.querySelector('button'); b.textContent = t('continue'); b.onclick = P.cont;
    App.modules.hideCard(); c.classList.add('open'); App.win.addClose(c, P.cont); App.app.dirty(); App.ui.refresh(true);
  };
  P.cont = function () {
    if (!P.active) return; var st = App.state;
    if (P.forced) { App.ui.setOverlay(P.forced, false); P.forced = null; }
    P.active = null; $('pauseCard').classList.remove('open');
    st.playing = true; App.app.dirty(); App.ui.refresh(true);
  };
  P.cancel = function () {
    if (P.forced) { App.ui.setOverlay(P.forced, false); P.forced = null; }
    P.active = null; var c = $('pauseCard'); if (c) c.classList.remove('open');
  };
  P.markers = function () {
    var tk = $('ticks'), st = App.state; tk.querySelectorAll('.pm').forEach(function (e) { e.remove(); });
    if (!st.pauses) return;
    P.list().forEach(function (d) {
      var e = document.createElement('i'); e.className = 'pm'; e.textContent = '◆'; e.style.left = (d.t * 100) + '%'; e.title = t(d.k + '_t'); tk.appendChild(e);
    });
  };
})(window.App = window.App || {});
