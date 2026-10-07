(function (App) {
  var D = App.data, S = App.sim, I = App.i18n, t = I.t;
  var $ = function (id) { return document.getElementById(id); };
  var st = App.state = { view: 'skull', mode: 'entry', t: 0, playing: false, speed: 0.5, P: S.defaults(), whyTab: 'proj', stress: true, labels: true, frag: true, tourOn: false, tourStep: 0, emph: null, layers: {}, quality: 'auto' };
  try { var q0 = localStorage.getItem('quality'); if (q0 === 'auto' || q0 === 'high' || q0 === 'save') st.quality = q0; } catch (e) {}
  var app = App.app = {};
  st.scenario = 'perp'; st.overlays = { stress: true, forces: true }; st.pauses = false; st.cinematic = true; st.reduce = false; st.module = 0; st.moduleTour = false;
  try { st.reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches; } catch (e) {}

  // ---------- renderer ----------
  var canvas = $('gl'), renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas: canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
    if (!renderer.getContext()) throw new Error('nogl');
  } catch (e) {
    $('startBtn').style.display = 'none'; $('noGL').style.display = 'block'; $('noGL').textContent = t('nowebgl'); App.ui.applyLang = function () {};
    document.querySelectorAll('[data-i18n]').forEach(function (n) { n.textContent = t(n.getAttribute('data-i18n')); });
    return;
  }
  renderer.outputEncoding = THREE.sRGBEncoding; renderer.localClippingEnabled = true; renderer.setClearColor(0x000000, 0);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

  App.makeTextures(); App.micro.init(renderer);
  var labPlane = new THREE.Plane(new THREE.Vector3(0, 0, -1), 0);

  // ---------- lab scene ----------
  var labScene = new THREE.Scene();
  labScene.add(new THREE.HemisphereLight(0xffffff, 0x20242c, 0.95));
  var dl = new THREE.DirectionalLight(0xffffff, 0.9); dl.position.set(30, 50, 60); labScene.add(dl);
  var views = { entry: new App.SlabView('entry', [labPlane]), exit: new App.SlabView('exit', [labPlane]) };
  labScene.add(views.entry.group, views.exit.group);
  var labCam = new THREE.PerspectiveCamera(40, 1, 0.5, 600);
  var labCtl = new THREE.OrbitControls(labCam, canvas);
  labCtl.enableDamping = true; labCtl.dampingFactor = 0.1; labCtl.enablePan = false;
  labCtl.minPolarAngle = 0.35; labCtl.maxPolarAngle = 1.75; labCtl.minAzimuthAngle = -1.0; labCtl.maxAzimuthAngle = 1.0; labCtl.minDistance = 22; labCtl.maxDistance = 160;

  // ---------- skull scene ----------
  var skScene = new THREE.Scene();
  skScene.add(new THREE.HemisphereLight(0xffffff, 0x2a2f38, 1.0));
  var dl2 = new THREE.DirectionalLight(0xffffff, 0.8); dl2.position.set(3, 5, 4); skScene.add(dl2);
  var skull = new App.Skull(); skScene.add(skull.group);
  var skCam = new THREE.PerspectiveCamera(38, 1, 0.1, 50);
  skCam.position.set(3.2, 1.3, 3.2);
  var skCtl = new THREE.OrbitControls(skCam, canvas);
  skCtl.enableDamping = true; skCtl.dampingFactor = 0.08; skCtl.enablePan = false; skCtl.minDistance = 2.2; skCtl.maxDistance = 7; skCtl.autoRotate = true; skCtl.autoRotateSpeed = 0.8;
  skCtl.addEventListener('start', function () { skCtl.autoRotate = false; });

  var dE, dX, needs = true, tween = null, aspect = 1;
  // after a GPU/context reset the canvas would stay blank with render-on-demand: redraw as soon as the context is back
  canvas.addEventListener('webglcontextrestored', function () { needs = true; });

  function derive() {
    dE = S.derive(st.P, 'entry'); dX = S.derive(st.P, 'exit');
    views.entry.setParams(dE); views.exit.setParams(dX); skull.setParams(dE, dX); needs = true;
  }

  // ---------- camera ----------
  function labPose() {
    if (st.view === 'compare') return { pos: [0, -2, Math.max(115, 190 / aspect)], tgt: [0, -5, 0] };
    // on phones the layer names sit inside the slab, so the slab can fill the width
    return { pos: [0, -2, Math.max(62, (App.layout && App.layout.mobile ? 64 : 88) / aspect)], tgt: [0, -5, 0] };
  }
  function fly(cam, ctl, pos, tgt, instant) {
    if (instant) { cam.position.set(pos[0], pos[1], pos[2]); ctl.target.set(tgt[0], tgt[1], tgt[2]); ctl.update(); tween = null; return; }
    tween = { cam: cam, ctl: ctl, p0: cam.position.clone(), t0v: ctl.target.clone(), p1: new THREE.Vector3(pos[0], pos[1], pos[2]), t1: new THREE.Vector3(tgt[0], tgt[1], tgt[2]), s: performance.now(), dur: 450 };
  }
  function stepTween(now) {
    if (!tween) return;
    var k = Math.min(1, (now - tween.s) / tween.dur); k = k * k * (3 - 2 * k);
    tween.cam.position.lerpVectors(tween.p0, tween.p1, k); tween.ctl.target.lerpVectors(tween.t0v, tween.t1, k);
    if (k >= 1) tween = null;
  }

  function applyView(view, mode, instant) {
    App.pauses.cancel(); resetCine(); if (!App.modules.starting) { App.modules.hideCard(); } st.view = view; if (mode) st.mode = mode;
    var detail = view === 'detail';
    views.entry.group.visible = view === 'compare' || (detail && st.mode === 'entry');
    views.exit.group.visible = view === 'compare' || (detail && st.mode === 'exit');
    views.entry.group.position.x = view === 'compare' ? -22 : 0; views.exit.group.position.x = view === 'compare' ? 22 : 0;
    if (view !== 'skull') { var p = labPose(); fly(labCam, labCtl, p.pos, p.tgt, instant); }
    else if (instant) fly(skCam, skCtl, [3.2, 1.3, 3.2], [0, 0, 0], true);
    needs = true; App.ui.renderStages && App.ui.refresh(true);
  }

  // ---------- labels ----------
  var labelsEl = $('labels'), labels = [], V = new THREE.Vector3();
  function mkLabel(owner, cls, textFn, posFn, showFn, align) {
    var el = document.createElement('div'); el.className = 'lb ' + cls; labelsEl.appendChild(el);
    var L = { el: el, owner: owner, textFn: textFn, posFn: posFn, showFn: showFn, align: align || 'c', last: '', vis: false };
    labels.push(L); return L;
  }
  ['entry', 'exit'].forEach(function (mode) {
    var sv = views[mode], isX = mode === 'exit', col = isX ? 'ex' : 'en';
    function vis(onlyDetail) { return (st.view === 'compare' && !onlyDetail) || (st.view === 'detail' && st.mode === mode); }
    D.layerKeys.forEach(function (k) {
      var lyr = mkLabel(sv, '', function () { return t('l_' + k); }, function (o) { var y = sv.d.y[k]; o[0] = App.layout.mobile ? -D.W + 0.6 : -D.W - 1.5; o[1] = (y[0] + y[1]) / 2 + (k === 'dura' ? -1.6 : k === 'inner' ? 0.4 : 0); }, function () { return vis(true) && st.layers[k] !== false; }, 'r');
      lyr.layer = true;
    });
    mkLabel(sv, 'big ' + col, function () { return t(isX ? 'crater_ext' : 'crater_int') + ' · ' + t(isX ? 'crater_ext_s' : 'crater_int_s'); },
      function (o) { var d = sv.d; o[0] = 0; o[1] = isX ? 8 : -d.T - 6; }, function () { return vis() && st.t >= 0.78; }, 'c');
    mkLabel(sv, col, function () { return 'Ø ' + sv.d.Dnear.toFixed(1) + ' mm'; },
      function (o) { var d = sv.d; o[0] = -(d.r0 + 2); o[1] = isX ? -d.T : 0; }, function () { return vis() && st.t >= 0.80; }, 'r');
    mkLabel(sv, col, function () { return 'Ø ' + sv.d.Dfar.toFixed(1) + ' mm'; },
      function (o) { var d = sv.d; o[0] = d.rFar + 2; o[1] = isX ? 0 : -d.T; }, function () { return vis() && st.t >= 0.80; }, 'l');
  });
  ['entry', 'exit'].forEach(function (mode) {
    var sv = views[mode], isX = mode === 'exit';
    function vis() { return (st.view === 'compare' || (st.view === 'detail' && st.mode === mode)) && !!st.overlays.waves; }
    function sY(s) { return isX ? s - sv.d.T : -s; }
    mkLabel(sv, 'wv', function () { return t('wv_comp'); }, function (o) { var d = sv.d, f = App.waves.front(st.t, d.T); o[0] = d.r0 + 6; o[1] = sY(Math.min(f, d.T)); },
      function () { var f = App.waves.front(st.t, sv.d.T); return vis() && st.t > 0.29 && st.t < 0.52 && f < sv.d.T; }, 'l');
    mkLabel(sv, 'wv', function () { return t('wv_refl'); }, function (o) { var d = sv.d, f = App.waves.front(st.t, d.T); o[0] = d.r0 + 6; o[1] = sY(Math.max(0, Math.min(d.T, 2 * d.T - f))); },
      function () { var f = App.waves.front(st.t, sv.d.T); return vis() && st.t < 0.58 && f > sv.d.T; }, 'l');
    mkLabel(sv, 'bn', function () { return t('bend_note'); }, function (o) { o[0] = D.W - 2; o[1] = 7.5; },
      function () { return (st.view === 'compare' || (st.view === 'detail' && st.mode === mode)) && !!st.overlays.bend && st.t > 0.3 && st.t < 0.65; }, 'r');
  });
  ['entry', 'exit'].forEach(function (mode) {
    var sv = views[mode];
    function showMode() { return st.view === 'compare' || (st.view === 'detail' && st.mode === mode); }
    function obl() { return showMode() && sv.d.theta > 0; }
    function cont() { return mode === 'entry' && showMode() && sv.d.contact; }
    mkLabel(sv, 'wv', function () { return t('ob_oval'); }, function (o) { o[0] = 0; o[1] = 11; }, function () { return obl() && st.t >= 0.8; }, 'c');
    mkLabel(sv, 'wv', function () { return t('ob_ecc'); }, function (o) { o[0] = 0; o[1] = 9; }, function () { return obl() && st.t >= 0.8; }, 'c');
    mkLabel(sv, 'wv', function () { return t('ob_axis'); }, function (o) { o[0] = 0; o[1] = 7; }, function () { return obl() && st.t >= 0.8; }, 'c');
    mkLabel(sv, 'wv', function () { return t('ct_mine'); }, function (o) { o[0] = 9; o[1] = 4.5; }, function () { return cont() && st.t >= 0.2 && st.t < 0.5; }, 'l');
    mkLabel(sv, 'wv', function () { return t('ct_star'); }, function (o) { o[0] = sv.d.r0 * 2 + 4; o[1] = 8; }, function () { return cont() && st.t >= 0.3 && st.t < 0.62; }, 'l');
    mkLabel(sv, 'wv', function () { return t('ct_benassi'); }, function (o) { o[0] = sv.d.r0 * 2.6 + 2; o[1] = 1.5; }, function () { return cont() && st.t >= 0.42; }, 'l');
    mkLabel(sv, 'wv', function () { return t('ct_puppe'); }, function (o) { o[0] = 0; o[1] = 11; }, function () { return cont() && st.t >= 0.8; }, 'c');
    mkLabel(sv, 'pmark', function () { return String(App.pauses.active ? App.pauses.active.i + 1 : ''); },
      function (o) { var a = App.pauses.active.def.a(sv.d); o[0] = a[0]; o[1] = a[1]; },
      function () { return !!App.pauses.active && st.view === 'detail' && st.mode === mode; }, 'c');
  });
  function placePauseCard() {
    var pa = App.pauses.active, c = $('pauseCard'); if (!pa || st.view !== 'detail') return;
    var sv = views[st.mode], a = pa.def.a(sv.d); V.set(a[0] + sv.group.position.x, a[1], 0.5).project(labCam);
    var x = (V.x * 0.5 + 0.5) * canvas.clientWidth, y = (-V.y * 0.5 + 0.5) * canvas.clientHeight;
    c.style.left = Math.min(window.innerWidth - 310, Math.max(10, x + 40)) + 'px'; c.style.top = Math.min(window.innerHeight - 190, Math.max(60, y - 40)) + 'px';
  }
  function skullShow() { return st.view === 'skull'; }
  function skullPerp() { return st.view === 'skull' && skull.scenario !== 'tangential'; }
  function skullTang() { return st.view === 'skull' && skull.scenario === 'tangential'; }
  mkLabel(null, 'hs en', function () { return t('tag_entry'); }, function (o, v) { v.copy(skull.E).addScaledVector(skull.nE, 0.22); }, skullPerp, 'c');
  mkLabel(null, 'hs ex', function () { return t('tag_exit'); }, function (o, v) { v.copy(skull.X).addScaledVector(skull.nX, 0.22); }, skullPerp, 'c');
  mkLabel(null, 'big en', function () { return t('tg_key'); }, function (o, v) { v.copy(skull.K).addScaledVector(skull.nK, 0.34); }, skullTang, 'c');
  mkLabel(null, 'hs en', function () { return t('tg_in'); }, function (o, v) { v.copy(skull.K).addScaledVector(skull.tg, -0.20).addScaledVector(skull.nK, 0.14); }, skullTang, 'r');
  mkLabel(null, 'hs ex', function () { return t('tg_out'); }, function (o, v) { v.copy(skull.Bout).addScaledVector(skull.tg, 0.24).addScaledVector(skull.nB, 0.14); }, skullTang, 'l');
  mkLabel(null, '', function () { return t('tg_rule'); }, function (o, v) { v.set(0, -1.62, 0); }, skullTang, 'c');
  mkLabel(null, '', function () { return t('notscale'); }, function (o, v) { v.set(0, -1.35, 0); }, skullShow, 'c');

  var tmpP = [0, 0];
  function updateLabels() {
    var w = canvas.clientWidth, h = canvas.clientHeight, cam = st.view === 'skull' ? skCam : labCam;
    for (var i = 0; i < labels.length; i++) {
      var L = labels[i], on = st.labels && L.showFn();
      if (on) {
        if (L.owner) { L.posFn(tmpP); V.set(tmpP[0] + L.owner.group.position.x, tmpP[1], 0.5); } else L.posFn(tmpP, V);
      }
      if (!on) { if (L.vis) { L.el.style.opacity = 0; L.vis = false; } continue; }
      var txt = L.textFn(); if (txt !== L.last) { L.el.textContent = txt; L.last = txt; }
      V.project(cam);
      var x = (V.x * 0.5 + 0.5) * w, y = (-V.y * 0.5 + 0.5) * h, ax = L.align === 'r' ? (L.layer && App.layout.mobile ? 0 : -100) : L.align === 'l' ? 0 : -50;
      L.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) translate(' + ax + '%,-50%)';
      if (!L.vis) { L.el.style.opacity = 1; L.vis = true; }
    }
  }

  // ---------- scene update ----------
  var skinCv = $('skin');
  function updateScene() {
    var v;
    if (st.view === 'skull') { skull.update(st.t); }
    else {
      var list = st.view === 'compare' ? ['entry', 'exit'] : [st.mode];
      list.forEach(function (m) {
        v = views[m]; v.ov = st.overlays; v.chipsOn = st.frag; v.U.uShow.value = st.stress ? 1 : 0; v.U.uEmph.value = (st.emph === 'compress' || st.emph === 'tension' || st.emph === 'ke') ? 1 : 0;
        v.update(st.t); v.cav.material.opacity = st.emph === 'cavity' ? 0.6 : 0.33;
      });
      var mode = (st.view === 'detail' && st.mode === 'exit') ? 'exit' : 'entry';
      App.skinPanel.draw(skinCv, mode, st.P.range, mode === 'exit' ? dX : dE, st.t);
      // physics overlays: wave graph (Why panel) and microstructure inset
      var wOn = !!st.overlays.waves && st.view === 'detail', box = $('waveBox');
      if (box.style.display !== (wOn ? 'block' : 'none')) { box.style.display = wOn ? 'block' : 'none'; if (wOn) App.ui.fillWaveFacts(); app.layoutChanged(); }
      if (wOn) App.waves.drawGraph($('waveGraph'), mode === 'exit' ? dX : dE, st.t);
      var mOn = !!st.overlays.micro && st.view === 'detail';
      if (mOn) { var mv = views[st.mode]; App.micro.update(mv.d, st.t, mv.o.q); setMicroLabels(st.mode === 'exit'); }
      App.micro.on = mOn; $('microFrame').classList.toggle('open', mOn);
    }
    if (st.view !== 'detail') { App.micro.on = false; $('microFrame').classList.remove('open'); if ($('waveBox').style.display !== 'none') $('waveBox').style.display = 'none'; }
    App.ui.refresh(false);
  }
  function setMicroLabels(exit) {
    document.querySelectorAll('#microView .ml').forEach(function (el) {
      var top = +el.dataset.top; el.style.top = (exit ? 280 - top - 20 : top) + 'px';
    });
  }

  // ---------- actions ----------
  app.dirty = function () { needs = true; };
  app.applyView = applyView;
  app.setScenario = function (sc) {
    st.scenario = sc; var P = st.P;
    P.scenario = (sc === 'oblique' || sc === 'contact') ? sc : 'perp';
    if (sc === 'oblique' && !P.theta) P.theta = 35;
    if (sc === 'contact') P.range = 'contact';
    skull.setScenario(sc); derive(); if (App.ui.syncScenario) App.ui.syncScenario(); needs = true;
  };
  app.setTheta = function (deg) { st.P.theta = deg; derive(); needs = true; if (App.ui.syncScenario) App.ui.syncScenario(); };
  app.chooseScenario = function (sc) {                 // user picked a scenario in the top bar
    app.userTouch(); app.setScenario(sc);
    if (sc === 'tangential') applyView('skull');
    else if (st.view === 'skull') applyView('detail', 'entry');
    else if (sc === 'contact') applyView(st.view, 'entry');
    st.t = 0; st.playing = false; App.pauses.reset(); needs = true; App.ui.refresh(true);
  };
  app.userTouch = function () {
    if (st.tourOn || st.moduleTour) { st.tourOn = false; st.moduleTour = false; st.playing = false; App.modules.cancelAuto(); App.modules.hideCard(); App.ui.refresh(true); }
  };
  app.userTouchKeep = app.userTouch;
  app.clock = function () {
    if (st.view === 'skull') return null;
    var sv = views[st.view === 'compare' ? 'entry' : st.mode]; if (!sv.d) return null;
    var o = sv.o, v = D.ammo[st.P.ammo].v * st.P.vScale * (o.speedK || 1);
    return { us: 1000 * o.p / v, v: v };
  };
  // keep the 3D subject centred in the free area between the side panels
  function shown(id) { var el = $(id); return el && el.getClientRects().length > 0 && !el.classList.contains('collapsed') && !document.body.classList.contains('nopanels'); }
  function updateViewOffset() {
    var w = window.innerWidth, h = window.innerHeight, L = 0, R = 0;
    if ($('hud').classList.contains('show') && w >= 900) {
      ['stages', 'leftBottom', 'modDrawer'].forEach(function (id) { if (shown(id)) L = Math.max(L, $(id).getBoundingClientRect().right); });
      ['why', 'skinWrap'].forEach(function (id) { if (shown(id)) R = Math.max(R, w - $(id).getBoundingClientRect().left); });
    }
    var shift = (L - R) / 2, shiftY = 0;
    if ($('hud').classList.contains('show') && st.view !== 'skull') {      // keep the slab clear of the big captions
      var tb = $('transport').offsetHeight;
      if (App.layout.mobile) shiftY = ((tb + 60) - 120) / 2;
      else if (App.layout.mode === 'present') shiftY = 75;
    }
    [labCam, skCam].forEach(function (c) { if (Math.abs(shift) < 1 && Math.abs(shiftY) < 1) c.clearViewOffset(); else c.setViewOffset(w, h, -shift, shiftY, w, h); });
    needs = true;
  }
  app.layoutChanged = updateViewOffset;
  app.setView = function (v) { app.userTouch(); applyView(v); };
  app.setMode = function (m) { app.userTouch(); if (st.view === 'compare' || st.view === 'skull') applyView('detail', m); else applyView('detail', m); };
  app.seek = function (x) { App.modules.hideCard(); resetCine(); App.pauses.cancel(); App.pauses.reset(x); st.t = S.clamp01(x); st.playing = false; needs = true; };
  app.toggle = function () {
    if (App.pauses.active) { App.pauses.cont(); return; }
    if (!st.playing && st.t >= 0.999) { st.t = 0; App.pauses.reset(); resetCine(); } st.playing = !st.playing; needs = true; App.ui.refresh(true);
  };
  app.replay = function () { App.modules.hideCard(); resetCine(); App.pauses.cancel(); App.pauses.reset(); st.t = 0; st.playing = true; needs = true; App.ui.refresh(true); };
  app.stepStage = function (dir) {
    var s = S.stageOf(st.t), local = st.t - D.B[s], target = dir > 0 ? Math.min(5, s + 1) : (local > 0.02 ? s : Math.max(0, s - 1));
    app.seek(D.B[target] + 0.001); App.ui.refresh(true);
  };
  app.setLang = function (l) {
    I.set(l); App.ui.applyLang(); needs = true;
    $('startBtn').textContent = t('start');
  };
  app.setParam = function (p, silent) {
    for (var k in p) st.P[k] = p[k];
    if (!App.SPECS[st.P.ammo].hpAllowed) st.P.hp = false;
    derive(); if (App.ui.syncHP) App.ui.syncHP(); App.ui.refresh(true);
  };
  app.setLayer = function (k, on) { st.layers[k] = on; views.entry.solids[k].setVisible(on); views.exit.solids[k].setVisible(on); needs = true; };
  app.emphasize = function (k) { st.emph = k; needs = true; };
  app.startTour = function () { st.tourOn = true; App.modules.start(1, { tour: true }); };
  function skullPose(name) {
    var cut = name === 'ent_in' ? 'entry' : name === 'ext_in' ? 'exit' : null, src = skull.focusVec(name);
    skull.setCut(cut, src);
    var p = src.clone().normalize().multiplyScalar((skull.scenario === 'tangential' ? 2.5 : 3.3) * (cut ? -1 : 1)); p.y += 0.5; return p;
  }
  app.skullView = function (name) { skCtl.autoRotate = false; var p = skullPose(name); fly(skCam, skCtl, [p.x, p.y, p.z], [0, 0, 0]); };

  // hover tooltips (learn by pointing)
  var tipEl = $('tip'), tray = new THREE.Raycaster(), tmv = new THREE.Vector2(), tipBusy = false, tipEv = null;
  var tipTimer = 0;
  function hideTip() { tipEl.style.display = 'none'; }
  function doTip() {
    tipBusy = false; var e = tipEv; if (!e || e.buttons || !$('hud').classList.contains('show')) { hideTip(); return; }
    var r = canvas.getBoundingClientRect(), txt = null;
    tmv.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1);
    if (st.view === 'skull') {
      tray.setFromCamera(tmv, skCam); var h1 = tray.intersectObjects(skull.hot, false)[0];
      if (h1) txt = t(h1.object.userData.mode === 'exit' ? 'tag_exit' : 'tag_entry') + ' — ' + t('hot_hint');
    } else {
      tray.setFromCamera(tmv, labCam); var cands = [];
      ['entry', 'exit'].forEach(function (m) {
        var v = views[m]; if (!v.group.visible) return;
        D.layerKeys.forEach(function (k) { if (v.solids[k].group.visible) cands.push(v.solids[k].cap); });
        for (var bi = 0; bi < v.bullet.parts.length; bi++) cands.push(v.bullet.parts[bi]);
      });
      var h2 = tray.intersectObjects(cands, false)[0];
      if (h2) {
        if (h2.object.userData.bullet) { var a = D.ammo[st.P.ammo], v2 = Math.round(a.v * st.P.vScale); txt = I.fmt('tt_bullet', { name: a.label + (st.P.hp ? ' HP' : ''), cal: a.cal, m: a.m, v: v2, ke: Math.round(S.KE(st.P)) }); }
        else txt = t('tt_' + h2.object.userData.layer);
      }
    }
    if (!txt) { hideTip(); return; }
    tipEl.textContent = txt; tipEl.style.display = 'block'; clearTimeout(tipTimer); tipTimer = setTimeout(hideTip, 4000);
    tipEl.style.left = Math.min(window.innerWidth - 320, e.clientX + 14) + 'px'; tipEl.style.top = (e.clientY + 16) + 'px';
  }
  canvas.addEventListener('pointermove', function (e) { tipEv = e; if (!tipBusy) { tipBusy = true; requestAnimationFrame(doTip); } });
  canvas.addEventListener('pointerleave', hideTip);
  canvas.addEventListener('pointerdown', hideTip);

  // hotspot click
  var down = null;
  canvas.addEventListener('pointerdown', function (e) { down = { x: e.clientX, y: e.clientY }; if (App.cine.enabled()) { st.cineOff = true; labCtl.enabled = true; } });
  canvas.addEventListener('wheel', function () { if (App.cine.enabled()) { st.cineOff = true; labCtl.enabled = true; } }, { passive: true });
  canvas.addEventListener('click', function (e) {
    if (!down || Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return;
    if (App.layout.mobile) App.layout.closeSheet();
    if (st.view !== 'skull') { tipEv = e; doTip(); return; }           // tap = tooltip (touch screens have no hover)
    var rc = new THREE.Raycaster(), r = canvas.getBoundingClientRect();
    rc.setFromCamera(new THREE.Vector2(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1), skCam);
    var hit = rc.intersectObjects(skull.hot, false)[0];
    if (hit) { app.userTouch(); st.t = 0; st.playing = false; if (st.scenario === 'tangential') app.setScenario('perp'); applyView('detail', hit.object.userData.mode); }
  });
  canvas.addEventListener('dblclick', function () { if (st.view === 'skull') fly(skCam, skCtl, [3.2, 1.3, 3.2], [0, 0, 0]); else { var p = labPose(); fly(labCam, labCtl, p.pos, p.tgt); } });

  // ---------- resize / loop ----------
  function resize() {
    if (App.layout.checkMobile) App.layout.checkMobile();
    var w = window.innerWidth, h = window.innerHeight; renderer.setSize(w, h, false); aspect = w / h;
    labCam.aspect = aspect; skCam.aspect = aspect; labCam.updateProjectionMatrix(); skCam.updateProjectionMatrix();
    if (st.view !== 'skull' && !tween) { var p = labPose(); labCam.position.z = p.pos[2]; }
    updateViewOffset(); needs = true;
  }
  var rq = 0; window.addEventListener('resize', function () { cancelAnimationFrame(rq); rq = requestAnimationFrame(resize); });

  var last = performance.now(), fcount = 0, fT = last, fps = 0, started = false;
  var cineBadgeTxt = '';
  function resetCine() { st.cineOff = false; st.freezeDone = false; st.freezeLeft = 0; }
  app.resetCine = resetCine;
  var needsRender = true, renderCount = 0, rendersSec = 0, rcLast = 0, perfOn = false, perfT = 0, msAvg = 0;
  var dprMax = Math.min(window.devicePixelRatio || 1, 2), dprCur = dprMax, dprT = 0, slowN = 0, fastN = 0;
  var perfEl = $('perf');
  function renderCore() {
    if (st.view === 'skull') renderer.render(skScene, skCam); else renderer.render(labScene, labCam);
    if (App.micro.on) { var mr = $('microView').getBoundingClientRect(); App.micro.render(mr, window.innerWidth, window.innerHeight); }
    updateLabels(); placePauseCard(); renderCount++;
  }
  function renderNow() {
    (st.view === 'skull' ? skCtl : labCtl).update();
    renderCore(); needsRender = false;
  }
  function setDpr(x) {
    dprCur = x; renderer.setPixelRatio(x); renderer.setSize(window.innerWidth, window.innerHeight, false); needsRender = true;
  }
  app.setQuality = function (q) {
    st.quality = q; dprMax = q === 'save' ? 1 : Math.min(window.devicePixelRatio || 1, 2);
    setDpr(dprMax); slowN = fastN = 0;
    try { localStorage.setItem('quality', q); } catch (e) {}
  };
  function adaptDpr(dt, now) {                       // auto quality: only while animating continuously
    if (st.quality !== 'auto') return;
    var ms = dt * 1000;
    if (ms > 20) { slowN++; fastN = 0; } else if (ms < 9) { fastN++; slowN = 0; } else { slowN = 0; fastN = 0; }
    if (now - dprT < 1000) return;
    if (slowN >= 30 && dprCur > 1) { setDpr(Math.max(1, dprCur - 0.25)); dprT = now; slowN = 0; }
    else if (fastN >= 120 && dprCur < dprMax) { setDpr(Math.min(dprMax, dprCur + 0.25)); dprT = now; fastN = 0; }
  }
  function frame(now) {
    requestAnimationFrame(frame);
    if (document.hidden) { last = now; return; }
    var dt = Math.min(0.1, (now - last) / 1000); last = now;
    if (st.playing && st.freezeLeft > 0) { st.freezeLeft = Math.max(0, st.freezeLeft - dt); needs = true; }       // freeze-frame at the spall moment
    else if (st.playing) {
      var prevT = st.t; st.t += dt * st.speed * App.cine.warp(st.t) / D.TOTAL_SEC; needs = true;
      if (App.cine.freezeCrossing(prevT, st.t)) { st.t = App.cine.freezeAt; st.freezeLeft = App.cine.freezeSec; st.freezeDone = true; }
      var ph = App.pauses.check(prevT, Math.min(st.t, 1));
      if (ph) App.pauses.show(ph);
      else if (st.t >= 1) { st.t = 1; st.playing = false; if (st.module) App.modules.complete(); App.ui.refresh(true); }
    }
    stepTween(now);
    var cineOn = App.cine.enabled() && !tween;
    if (labCtl.enabled === cineOn) labCtl.enabled = !cineOn;
    if (cineOn) { App.cine.applyCamera(labCam, labCtl, st.mode, st.t, dt, labPose()); needsRender = true; }
    var badge = st.freezeLeft > 0 ? t('freeze') : (App.cine.slowActive() ? t('slowmo') : '');
    if (badge !== cineBadgeTxt) { cineBadgeTxt = badge; var be = $('cineBadge'); be.textContent = badge; be.style.display = badge ? 'block' : 'none'; }
    if (needs) { needs = false; updateScene(); needsRender = true; }
    var ctl = st.view === 'skull' ? skCtl : labCtl;
    if (ctl.update()) needsRender = true;
    if (tween || st.playing) { needsRender = true; adaptDpr(dt, now); }
    if (needsRender) { needsRender = false; renderCore(); fcount++; }
    if (now - fT > 1000) { fps = fcount * 1000 / (now - fT); rendersSec = (renderCount - rcLast) * 1000 / (now - fT); rcLast = renderCount; fcount = 0; fT = now; }
    if (perfOn && now - perfT > 500) {
      perfT = now; var ri = renderer.info.render;
      perfEl.textContent = 'fps ' + fps.toFixed(0) + ' · renders/s ' + rendersSec.toFixed(0) + ' · calls ' + ri.calls + ' · tris ' + ri.triangles + ' · DPR ' + dprCur.toFixed(2);
    }
  }
  app.needsRender = function () { needsRender = true; };
  app.togglePerf = function () { perfOn = !perfOn; perfEl.style.display = perfOn ? 'block' : 'none'; };
  controlsOnChange();
  function controlsOnChange() {
    labCtl.addEventListener('change', function () { needsRender = true; }); skCtl.addEventListener('change', function () { needsRender = true; });
  }

  // ---------- test API ----------
  window.__app = {
    setView: function (v) { applyView(v, null, true); App.ui.refresh(true); updateScene(); renderNow(); },
    setMode: function (m) { applyView('detail', m, true); App.ui.refresh(true); updateScene(); renderNow(); },
    setT: function (x) { resetCine(); App.pauses.cancel(); st.playing = false; st.tourOn = false; st.moduleTour = false; App.modules.cancelAuto(); App.modules.hideCard(); st.t = S.clamp01(x); updateScene(); renderNow(); },
    startModule: function (n) { App.modules.start(n); updateScene(); renderNow(); },
    setOverlay: function (name, v) { App.ui.setOverlay(name, v); updateScene(); renderNow(); },
    setSetting: function (name, v) { if (name === 'quality') app.setQuality(v); else App.ui.setSetting(name, v); updateScene(); renderNow(); },
    setScenario: function (id) { app.setScenario(id); updateScene(); renderNow(); },
    setTheta: function (deg) { app.setTheta(deg); updateScene(); renderNow(); },
    chooseScenario: function (id) { app.chooseScenario(id); updateScene(); renderNow(); },
    camCloseUpBullet: function () {
      var v = views[st.mode], y = v.o.yBullet; labCtl.minDistance = 5; labCtl.minAzimuthAngle = -3; labCtl.maxAzimuthAngle = 3;
      labCam.position.set(12, y + 4, 38); labCtl.target.set(0, y, 0); labCtl.update(); renderNow();
    },
    setCutaway: function (on) { $('cCut').checked = !!on; app.setParam({ cut: !!on }); updateScene(); renderNow(); },
    setHP: function (on) { $('pHP').value = on ? '1' : '0'; app.setParam({ hp: !!on }); updateScene(); renderNow(); },
    play: function () { st.playing = true; }, pause: function () { st.playing = false; },
    cineInfo: function () { return { freezeLeft: st.freezeLeft, slow: App.cine.slowActive(), enabled: App.cine.enabled(), cineOff: st.cineOff, t: st.t, cam: [labCam.position.x, labCam.position.y, labCam.position.z] }; },
    pauseInfo: function () { return App.pauses.active ? { i: App.pauses.active.i, key: App.pauses.active.def.k, t: st.t } : null; },
    runUntilPause: function (ms) { return new Promise(function (res) { var t0 = performance.now(); (function w() { if (App.pauses.active || performance.now() - t0 > ms) res(!!App.pauses.active); else setTimeout(w, 50); })(); }); },
    setLang: function (l) { app.setLang(l); updateScene(); renderNow(); },
    setAmmo: function (id) { $('pAmmo').value = id; app.setParam({ ammo: id }); updateScene(); renderNow(); },
    setRange: function (r) { $('pRange').value = r; app.setParam({ range: r }); updateScene(); renderNow(); },
    toggleCutaway: function (on) { window.__app.skullView(on ? 'ent_in' : 'ent_out'); },
    skullView: function (n) { skCtl.autoRotate = false; tween = null; var p = skullPose(n); skCam.position.copy(p); skCtl.target.set(0, 0, 0); skCtl.update(); updateScene(); renderNow(); },
    useFallbackSkull: function (on) { if (on) skull.useFallback(); else skull.useModelAgain(); needs = true; updateScene(); renderNow(); },
    skullRot: function (r) { App.skullRot = r; },
    redraw: function () { needs = true; updateScene(); renderNow(); return !renderer.getContext().isContextLost(); },
    startTour: function () { app.startTour(); },
    state: st, skull: skull, glLost: function () { return renderer.getContext().isContextLost(); }, three: { scene: skScene, cam: skCam, renderer: renderer },
    info: function () {
      var inf = renderer.info.render;
      return { view: st.view, mode: st.mode, t: st.t, stage: S.stageOf(st.t), KE: Math.round(S.KE(st.P)), holes: S.holes(st.P), lang: I.lang, calls: inf.calls, triangles: inf.triangles, fps: fps, renders: renderCount, dpr: dprCur, skullSource: skull.source, scenario: st.scenario, angE: skull.angE * 57.3, angX: skull.angX * 57.3 };
    }
  };

  // ---------- boot ----------
  derive();
  App.ui.init(app); App.win.init();
  resize();
  applyView('skull', null, true);
  skull.update(0.0);
  if (st.quality === 'save') setDpr(1);
  // pre-compile every shader program so the first view switch never hitches
  // (staged over a few timers so a slow driver never blocks the main thread / GPU for long in one go)
  if (!window.__noCompile) {
    setTimeout(function () { try { renderer.compile(skScene, skCam); } catch (e) {} }, 200);
    setTimeout(function () {
      var ve = views.entry.group.visible, vx = views.exit.group.visible;
      views.entry.group.visible = true; views.exit.group.visible = false;
      try { renderer.compile(labScene, labCam); } catch (e) {}
      views.entry.group.visible = false; views.exit.group.visible = true;
      try { renderer.compile(labScene, labCam); } catch (e) {}
      views.entry.group.visible = ve; views.exit.group.visible = vx; needs = true;
    }, 900);
  }
  App.layout.init();
  function begin(mode) {
    App.layout.setMode(mode, true);
    $('overlay').classList.add('hide'); $('hud').classList.add('show'); document.body.classList.add('started'); skCtl.autoRotate = false;
    applyView('detail', 'entry', true); App.layout.measure(); updateViewOffset();
    var go = function () { if (App.layout.params.module) App.modules.start(App.layout.params.module); else app.startTour(); };
    if (mode === 'present') { go(); App.layout.toast(t('toast_present'), 5000); }                   // no coach marks in front of a class
    else if (App.onboarding.needed() && !App.layout.mobile) App.onboarding.start(go); else go();
  }
  $('startBtn').onclick = function () { begin('study'); };
  $('presentBtn').onclick = function () { begin('present'); };
  $('startBtn').disabled = false; $('presentBtn').disabled = false;
  if (App.layout.mode === 'present') $('presentBtn').focus(); else $('startBtn').focus();
  App.modules.renderDrawer();
  // real skull model: the 1 MB data file is loaded only after the first frame, so the page opens fast on any connection
  setTimeout(function () {
    var s = document.createElement('script'); s.src = 'js/skullmodel.js';
    s.onload = function () {
      App.skullMesh.load(function (geom) {
        if (!geom) return;
        try { var info = skull.useModel(geom); skull.setParams(dE, dX); needs = true; try { renderer.compile(skScene, skCam); } catch (e) {} window.__skullInfo = info; }
        catch (e) { console.info('skull model could not be used: ' + e.message); skull.useFallback(); }
      });
    };
    s.onerror = function () { console.info('skull model file not available: using the procedural skull'); };
    document.body.appendChild(s);
  }, 60);
  // offline support when published (network-first service worker; ignored when opened from a local file)
  if ('serviceWorker' in navigator && /^https:/.test(location.protocol)) { try { navigator.serviceWorker.register('sw.js').catch(function () {}); } catch (e) {} }
  requestAnimationFrame(function (n) { last = n; fT = n; frame(n); });
  window.__ready = true;
})(window.App = window.App || {});
