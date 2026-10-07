(function (App) {
  var D = App.data, I = App.i18n, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var UI = App.ui = {}, app, st, cache = {};

  UI.init = function (a) {
    app = a; st = App.state;
    var i, k;
    // ammo select
    var sel = $('pAmmo'); D.ammoOrder.forEach(function (id) { var o = document.createElement('option'); o.value = id; o.textContent = D.ammo[id].label; sel.appendChild(o); });
    sel.value = st.P.ammo;
    var rs = $('pRange'); D.ranges.forEach(function (r) { var o = document.createElement('option'); o.value = r; o.setAttribute('data-r', r); rs.appendChild(o); }); rs.value = st.P.range;
    // layer checks
    var lc = $('layerChecks');
    D.layerKeys.forEach(function (key) {
      var d = document.createElement('div'); d.className = 'chk';
      d.innerHTML = '<input type="checkbox" id="ly_' + key + '" checked><label for="ly_' + key + '" data-l="l_' + key + '"></label>';
      lc.appendChild(d); d.firstChild.addEventListener('change', function (e) { app.setLayer(key, e.target.checked); });
    });
    // ticks
    var tk = $('ticks'); for (i = 1; i < 6; i++) { var el = document.createElement('i'); el.style.left = (D.B[i] * 100) + '%'; tk.appendChild(el); }
    // events
    document.querySelectorAll('#tabs button').forEach(function (b) { b.onclick = function () { app.userTouch(); app.setView(b.dataset.view); }; });
    document.querySelectorAll('#modes button').forEach(function (b) { b.onclick = function () { app.userTouch(); app.setMode(b.dataset.mode); }; });
    document.querySelectorAll('#whyTabs button').forEach(function (b) { b.onclick = function () { st.whyTab = b.dataset.wt; UI.renderCards(); UI.refresh(true); }; });
    document.querySelectorAll('#skullBar button').forEach(function (b) { b.onclick = function () { app.userTouch(); app.skullView(b.dataset.sv); }; });
    var lb = function () { app.userTouch(); app.setLang(I.lang === 'es' ? 'en' : 'es'); };
    $('langBtn').onclick = lb; $('ovLang').onclick = lb;
    $('helpBtn').onclick = function () { $('glossary').classList.toggle('open'); };
    $('glossClose').onclick = function () { $('glossary').classList.remove('open'); };
    $('tourBtn').onclick = function () { $('modDrawer').classList.remove('open'); app.layoutChanged(); app.startTour(); };
    $('paramsBtn').onclick = function () { $('paramsDrawer').classList.toggle('open'); };
    $('bPlay').onclick = function () { app.userTouch(); app.toggle(); };
    $('bPrev').onclick = function () { app.userTouch(); app.stepStage(-1); };
    $('bNext').onclick = function () { app.userTouch(); app.stepStage(1); };
    $('bReplay').onclick = function () { app.userTouch(); app.replay(); };
    $('bCine').onclick = function () { UI.setSetting('cinematic', !st.cinematic); };
    $('scrubber').oninput = function (e) { app.userTouch(); app.seek(e.target.value / 1000); };
    $('pSpeed').onchange = function (e) { app.userTouch(); st.speed = +e.target.value; };
    sel.onchange = function () { app.userTouch(); app.setParam({ ammo: sel.value }); };
    $('cCut').onchange = function (e) { app.userTouch(); app.setParam({ cut: e.target.checked }); };
    UI.syncHP = function () {
      var ok = !!App.SPECS[st.P.ammo].hpAllowed, h = $('pHP'); h.options[1].disabled = !ok; h.value = st.P.hp ? '1' : '0';
    };
    UI.syncHP();
    $('pHP').onchange = function (e) { app.userTouch(); app.setParam({ hp: e.target.value === '1' }); };
    $('pVel').oninput = function (e) { app.userTouch(); app.setParam({ vScale: e.target.value / 100 }); };
    $('pT').oninput = function (e) { app.userTouch(); app.setParam({ T: +e.target.value }); };
    rs.onchange = function () { app.userTouch(); app.setParam({ range: rs.value }); };
    [['cForces', 'forces'], ['cWaves', 'waves'], ['cBend', 'bend'], ['cMicro', 'micro']].forEach(function (p) {
      $(p[0]).onchange = function (e) { app.userTouch(); UI.setOverlay(p[1], e.target.checked); };
    });
    $('microClose').onclick = function () { UI.setOverlay('micro', false); };
    $('scSel').onchange = function (e) { app.chooseScenario(e.target.value); };
    $('pTheta').oninput = function (e) { app.userTouch(); app.setTheta(+e.target.value); };
    UI.syncScenario = function () {
      var v = st.view, sc = st.scenario;
      $('scSel').value = sc; $('thetaRow').style.display = sc === 'oblique' ? 'flex' : 'none';
      $('pTheta').value = st.P.theta || 35; $('pThetaV').textContent = (st.P.theta || 35) + '°';
      document.querySelectorAll('#scSel option').forEach(function (o) {
        o.disabled = o.value === 'tangential' ? v !== 'skull' && false : false;          // every scenario can be chosen; the view follows
      });
      $('pRange').value = st.P.range;
    };
    UI.fillWaveFacts = function () {
      var ul = $('waveFacts'); ul.innerHTML = '';
      ['wv_fact1', 'wv_fact2', 'wv_fact3'].forEach(function (k) { var li = document.createElement('li'); li.textContent = t(k); ul.appendChild(li); });
    };
    $('cStress').onchange = function (e) { st.stress = e.target.checked; app.dirty(); UI.refresh(true); };
    $('cLabels').onchange = function (e) { st.labels = e.target.checked; document.getElementById('labels').style.display = st.labels ? '' : 'none'; app.dirty(); };
    $('cFrag').onchange = function (e) { st.frag = e.target.checked; app.dirty(); };
    document.addEventListener('keydown', function (e) {
      if (/INPUT|SELECT|TEXTAREA/.test(e.target.tagName) && e.key !== 'Escape' && e.target.type !== 'range') return;
      var k = e.key.toLowerCase();
      if (App.pauses.active && (k === ' ' || k === 'enter')) { e.preventDefault(); App.pauses.cont(); return; }
      if (k === ' ') { e.preventDefault(); app.userTouch(); app.toggle(); }
      else if (k === 'arrowright' || k === 'pagedown') { e.preventDefault(); app.userTouch(); app.stepStage(1); }      // slide clickers send PgDn / PgUp
      else if (k === 'arrowleft' || k === 'pageup') { e.preventDefault(); app.userTouch(); app.stepStage(-1); }
      else if (k === 'r') { app.userTouch(); app.replay(); }
      else if (k === '1') app.setView('detail'); else if (k === '2') app.setView('compare'); else if (k === '3') app.setView('skull');
      else if (k === 'e') app.setMode('entry'); else if (k === 'x') app.setMode('exit');
      else if (k === 'l') app.setLang(I.lang === 'es' ? 'en' : 'es');
      else if (k === 's') { $('cStress').checked = st.stress = !st.stress; app.dirty(); UI.refresh(true); }
      else if (k === 't') { $('cLabels').checked = !$('cLabels').checked; $('cLabels').onchange({ target: $('cLabels') }); }
      else if (k === 'f') app.togglePerf();
      else if (k === 'h') { document.body.classList.toggle('nopanels'); app.layoutChanged(); }
      else if (k === '?') UI.openModal('keysModal');
      else if (k === 'w' || k === 'b' || k === 'm') { var nm = { w: 'waves', b: 'bend', m: 'micro' }[k]; UI.setOverlay(nm, !st.overlays[nm]); }
      else if (k === 'c') { UI.setSetting('cinematic', !st.cinematic); }
      else if (k === 'p') { UI.setSetting('pauses', !st.pauses); }
      else if (k === 'escape') App.win.escape();
    });

    // ---- phase 2 UX ----
    // collapsible panels
    ['stages', 'why', 'leftBottom', 'skinWrap'].forEach(function (id) {
      var p = $(id), b = document.createElement('button'); b.className = 'colbtn'; b.textContent = '▾'; b.title = t('collapse');
      var key = 'collapsed_' + id; try { if (localStorage.getItem(key) === '1') { p.classList.add('collapsed'); b.textContent = '▸'; } } catch (e) {}
      b.onclick = function () {
        var c = p.classList.toggle('collapsed'); b.textContent = c ? '▸' : '▾';
        try { localStorage.setItem(key, c ? '1' : '0'); } catch (e) {} app.layoutChanged();
      };
      p.appendChild(b);
    });
    // modules drawer, help menu, settings
    $('modulesBtn').onclick = function () { $('modDrawer').classList.toggle('open'); App.modules.renderDrawer(); app.layoutChanged(); };
    $('modReset').onclick = function () { App.modules.reset(); };
    $('helpBtn').onclick = function (e) { e.stopPropagation(); $('helpMenu').classList.toggle('open'); };
    document.querySelectorAll('#helpMenu button').forEach(function (b) {
      b.onclick = function () {
        $('helpMenu').classList.remove('open'); var a = b.dataset.hm;
        if (a === 'gloss') $('glossary').classList.add('open'); else if (a === 'keys') UI.openModal('keysModal');
        else if (a === 'tour') App.onboarding.start();
      };
    });
    document.addEventListener('click', function (e) {
      if (!e.target.closest('#helpMenu') && e.target.id !== 'helpBtn') $('helpMenu').classList.remove('open');
      var g = e.target.closest && e.target.closest('.gl'), pop = $('glPop');
      if (g) {
        var def = t(g.dataset.g).split('|'); pop.innerHTML = '<b></b><br><span></span>'; pop.firstChild.textContent = def[0]; pop.lastChild.textContent = def[1] || '';
        var r = g.getBoundingClientRect(); pop.style.display = 'block'; pop.style.left = Math.min(window.innerWidth - 320, r.left) + 'px'; pop.style.top = (r.bottom + 6) + 'px';
      } else pop.style.display = 'none';
    });
    $('settingsBtn').onclick = function () { UI.syncSettings(); UI.openModal('settingsModal'); };
    $('settingsClose').onclick = function () { $('settingsModal').classList.remove('open'); };
    $('keysClose').onclick = function () { $('keysModal').classList.remove('open'); };
    $('sLang').onchange = function (e) { app.setLang(e.target.value); };
    $('sQual').onchange = function (e) { app.setQuality(e.target.value); UI.saveSettings(); };
    $('sSpeed').onchange = function (e) { st.speed = +e.target.value; $('pSpeed').value = e.target.value; UI.saveSettings(); };
    $('sPauses').onchange = function (e) { UI.setSetting('pauses', e.target.checked); };
    $('sCine').onchange = function (e) { UI.setSetting('cinematic', e.target.checked); };
    $('sReduce').onchange = function (e) { UI.setSetting('reduce', e.target.checked); };
    // stage tick tooltips
    document.querySelectorAll('#ticks i').forEach(function (el, n) { el.dataset.n = n + 1; });
    // load saved settings
    try {
      var s = JSON.parse(localStorage.getItem('settings') || '{}');
      if (typeof s.pauses === 'boolean') st.pauses = s.pauses; if (typeof s.cinematic === 'boolean') st.cinematic = s.cinematic;
      if (typeof s.reduce === 'boolean') st.reduce = s.reduce; if (s.speed) { st.speed = +s.speed; $('pSpeed').value = String(s.speed); }
    } catch (e) {}
    UI.applyLang();
  };

  UI.openModal = function (id) { $(id).classList.add('open'); };
  UI.syncSettings = function () {
    $('sLang').value = I.lang; $('sQual').value = st.quality; $('sSpeed').value = String(st.speed);
    $('sPauses').checked = st.pauses; $('sCine').checked = st.cinematic; $('sReduce').checked = st.reduce;
  };
  UI.saveSettings = function () {
    try { localStorage.setItem('settings', JSON.stringify({ pauses: st.pauses, cinematic: st.cinematic, reduce: st.reduce, speed: st.speed })); } catch (e) {}
  };
  UI.setSetting = function (name, v) { st[name] = v; if (name === 'pauses' && !v) App.pauses.cancel(); UI.saveSettings(); UI.syncSettings(); app.dirty(); UI.refresh(true); };
  UI.setOverlay = function (name, v) { st.overlays[name] = v; if (name === 'stress') { st.stress = v; $('cStress').checked = v; } app.dirty(); UI.refresh(true); };

  // rich text: escapes HTML, turns [[term]] into clickable glossary spans
  UI.rich = function (el, text) {
    var safe = String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    el.innerHTML = safe.replace(/\[\[([^\]]+)\]\]/g, function (m, term) {
      var key = I.glossAlias[term.toLowerCase()]; return key ? '<span class="gl" data-g="' + key + '">' + term + '</span>' : term;
    });
  };

  UI.applyLang = function () {
    document.documentElement.lang = I.lang;
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    document.querySelectorAll('[data-l]').forEach(function (n) { n.textContent = t(n.getAttribute('data-l')); });
    document.querySelectorAll('#pRange option').forEach(function (o) { o.textContent = t('r_' + o.dataset.r); });
    var scn = { perp: 'sc_perp', oblique: 'sc_obl', contact: 'sc_cont', tangential: 'sc_tang' };
    document.querySelectorAll('#scSel option').forEach(function (o) { o.textContent = t(scn[o.value]); });
    $('scSel').title = t('scenario');
    document.title = t('title');
    $('langBtn').textContent = I.lang === 'es' ? 'ES | en' : 'es | EN'; $('ovLang').textContent = $('langBtn').textContent;
    $('bPlay').title = t('play'); $('bPrev').title = t('prev'); $('bNext').title = t('next'); $('bReplay').title = t('replay'); $('pSpeed').title = t('speed');
    var dl = $('glossBody'); dl.innerHTML = '';
    I.glossKeys().forEach(function (n) { var p = t('g' + n).split('|'), dt = document.createElement('dt'), dd = document.createElement('dd'); dt.textContent = p[0]; dd.textContent = p[1]; dl.appendChild(dt); dl.appendChild(dd); });
    $('keysBody').textContent = t('sk_keys');
    document.querySelectorAll('#ticks i').forEach(function (el) { el.title = t((st.mode === 'exit' ? 'x' : 'e') + el.dataset.n); });
    $('clock').title = t('realtime');
    $('fsBtn').title = t('fullscreen');
    document.querySelectorAll('#uiMode button').forEach(function (b) { b.title = t(b.dataset.ui === 'present' ? 'ui_present_t' : 'ui_study_t'); });
    $('modulesBtn').textContent = t('modules');
    if (App.modules.renderDrawer) App.modules.renderDrawer();
    UI.renderStages(); UI.renderCards(); UI.refresh(true);
  };

  UI.renderStages = function () {
    var ol = $('stageList'); ol.innerHTML = '';
    for (var i = 0; i < 6; i++) {
      var li = document.createElement('li'), name = st.view === 'compare' ? t('e' + i) + ' · ' + t('x' + i) : t((st.mode === 'exit' ? 'x' : 'e') + i);
      li.innerHTML = '<b>' + (i + 1) + '</b><span></span>'; li.lastChild.textContent = name;
      (function (n) { li.onclick = function () { app.userTouch(); app.seek(D.B[n] + 0.001); }; })(i);
      ol.appendChild(li);
    }
    cache.stage = -1;
  };

  var EMPH = { p1: 'ke', p2: 'compress', p3: 'chips', p4: 'bullet', p5: 'cavity', t1: 'layers', t2: 'tension', t3: 'tension', t4: 'cavity', t5: 'skin', f1: 'compress', f2: 'waves', f3: 'bend', f4: 'micro', f5: 'tension' };
  UI.renderCards = function () {
    var c = $('cards'); c.innerHTML = '';
    var pre = st.whyTab === 'proj' ? 'p' : st.whyTab === 'phys' ? 'f' : 't';
    document.querySelectorAll('#whyTabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.wt === st.whyTab); });
    for (var i = 1; i <= 5; i++) {
      var d = document.createElement('div'), id = pre + i; d.className = 'card'; UI.rich(d, t(id)); d.tabIndex = 0;
      d.onmouseenter = d.onfocus = function (e) { app.emphasize(EMPH[e.target.dataset.id]); e.target.classList.add('hl'); };
      d.onmouseleave = d.onblur = function (e) { app.emphasize(null); e.target.classList.remove('hl'); };
      d.dataset.id = id; c.appendChild(d);
    }
  };

  UI.readout = function () {
    var P = st.P, a = D.ammo[P.ammo], h = App.sim.holes(P), ke = Math.round(App.sim.KE(P)), v = Math.round(a.v * P.vScale);
    var lines = '<div>' + t('ke') + ' <span class="k" id="roKE">' + ke + ' J</span></div><div>' + a.label + (P.hp ? ' · HP' : '') + ' · v ' + v + ' m/s · ' + t('cal') + ' ' + a.cal + ' mm</div>';
    function row(mode, c) {
      var o = h[mode];
      return '<div style="color:' + c + '">' + t('mode_' + mode) + ': ' + t('outer_face') + ' Ø <b>' + o.outer.toFixed(1) + '</b> mm · ' + t('inner_face') + ' Ø <b>' + o.inner.toFixed(1) + '</b> mm</div>';
    }
    if (st.view === 'compare' || st.view === 'skull') lines += row('entry', 'var(--en)') + row('exit', 'var(--ex)');
    else lines += row(st.mode, st.mode === 'exit' ? 'var(--ex)' : 'var(--en)');
    if (cache.ro !== lines + I.lang) { $('readout').innerHTML = lines; cache.ro = lines + I.lang; }
    $('pVelV').textContent = v + ' m/s'; $('pTV').textContent = P.T + ' mm';
    var rd = $('pRangeD'); rd.textContent = t('rd_' + P.range);
  };

  UI.clock = function () {
    var c = app.clock(), el = $('clock'); if (!c) { if (cache.clk !== '') { el.textContent = ''; cache.clk = ''; } return; }
    var us = c.us, s = (us < 0 ? '−' : '') + Math.abs(us).toFixed(1), txt = I.fmt('clock_t', { us: s }) + ' · ' + I.fmt('clock_v', { v: Math.round(c.v) });
    if (txt !== cache.clk) { el.textContent = txt; cache.clk = txt; }
  };

  UI.refresh = function (force) {
    var v = st.view, m = st.mode;
    var stg = App.sim.stageOf(st.t);
    var key = [v, m, stg, st.playing, I.lang, st.stress, st.P.range, st.whyTab, st.tourOn, st.module].join('|');
    UI.clock();
    if (!force && cache.key === key) {
      var sv = Math.round(st.t * 1000); if (cache.sv !== sv) { $('scrubber').value = sv; cache.sv = sv; } return;
    }
    cache.key = key; cache.sv = Math.round(st.t * 1000); $('scrubber').value = cache.sv;
    App.pauses.markers();
    [['cForces', 'forces'], ['cWaves', 'waves'], ['cBend', 'bend'], ['cMicro', 'micro']].forEach(function (p) { $(p[0]).checked = !!st.overlays[p[1]]; });
    $('cStress').checked = !!st.stress; $('cCut').checked = !!st.P.cut; UI.syncScenario();
    $('bCine').classList.toggle('on', !!st.cinematic); $('bCine').title = t('cinematic') + ' (C)';
    document.querySelectorAll('#tabs button').forEach(function (b) { b.classList.toggle('on', b.dataset.view === v); });
    document.querySelectorAll('#modes button').forEach(function (b) { b.classList.toggle('on', b.dataset.mode === m); });
    $('modes').style.display = v === 'detail' ? 'flex' : 'none';
    $('skullBar').classList.toggle('show', v === 'skull');
    $('stages').style.display = v === 'skull' ? 'none' : '';
    $('skinWrap').style.display = v === 'skull' ? 'none' : '';
    $('legend').style.display = (v === 'skull' || !st.stress) ? 'none' : 'flex';
    $('bPlay').textContent = st.playing ? '⏸' : '▶'; $('bPlay').title = st.playing ? t('pause') : t('play');
    if (cache.view !== v + (v === 'compare' ? '' : m) + I.lang) { UI.renderStages(); cache.view = v + (v === 'compare' ? '' : m) + I.lang; }
    document.querySelectorAll('#stageList li').forEach(function (li, i) { li.classList.toggle('act', i === stg); });
    var cap = $('caption');
    if (v === 'compare') cap.innerHTML = '<div style="color:var(--en)">' + t('mode_entry') + ': ' + t('ce' + stg) + '</div><div style="color:var(--ex);margin-top:4px">' + t('mode_exit') + ': ' + t('cx' + stg) + '</div>';
    else {
      var ck = (m === 'exit' ? 'cx' : 'ce') + stg, dk = 'cd_' + (m === 'exit' ? 'x' : 'e') + stg;
      cap.innerHTML = '<div id="capMain"></div>';
      UI.rich($('capMain'), t(ck));
      if (I.es[dk]) {
        var btn = document.createElement('button'), det = document.createElement('div');
        btn.className = 'lnk'; btn.textContent = t('more'); det.style.display = 'none'; det.style.fontSize = '12.5px'; det.style.color = 'var(--mut)'; UI.rich(det, t(dk));
        btn.onclick = function () { det.style.display = det.style.display === 'none' ? 'block' : 'none'; };
        cap.appendChild(btn); cap.appendChild(det);
      }
    }
    $('hint').textContent = st.tourOn ? t('tour_hint') : v === 'skull' ? t('hot_hint') : v === 'compare' ? t('cmp_hint') : '';
    var sk = $('skinCap'); var mode = (v === 'detail' && m === 'exit') ? 'exit' : 'entry';
    sk.textContent = mode === 'exit' ? t('sk_exit') : t('sk_' + st.P.range);
    UI.readout();
    if (App.layout && App.layout.caption) App.layout.caption(stg);
  };
})(window.App = window.App || {});
