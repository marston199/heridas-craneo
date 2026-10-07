(function (App) {
  var D = App.data, S = App.sim;

  // ---------- procedural textures ----------
  function speckle(base, dark, n, size, rmax, seed) {
    var c = document.createElement('canvas'); c.width = c.height = size;
    var x = c.getContext('2d'), r = S.rng(seed || 5);
    x.fillStyle = base; x.fillRect(0, 0, size, size);
    x.fillStyle = dark;
    for (var i = 0; i < n; i++) { x.globalAlpha = 0.25 + r() * 0.5; x.beginPath(); x.arc(r() * size, r() * size, 0.6 + r() * rmax, 0, 6.283); x.fill(); }
    x.globalAlpha = 1;
    var t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.encoding = THREE.sRGBEncoding;
    return t;
  }
  App.tex = {};
  App.makeTextures = function () {
    App.tex.diploe = speckle('#d3b384', '#7a5a35', 260, 128, 2.6, 11);
    App.tex.table = speckle('#f1e8d2', '#cfc3a4', 120, 128, 1.1, 21);
    App.tex.skin = speckle('#dba68e', '#b9806a', 90, 128, 1.4, 31);
    App.tex.brain = speckle('#d9a8ac', '#b98388', 70, 128, 2.2, 41);
  };

  // ---------- solid of revolution with a live-updatable hole ----------
  function ProfileSolid(o) {
    var N = this.N = o.N || 12, K = this.K = 8, SEG = this.SEG = 48, W = this.W = o.W;
    var P = this.P = N + K + 3, vc = P * (SEG + 1);
    this.hr = new Float32Array(N + 1); this.ys = new Float32Array(N + 1);
    this.pr = new Float32Array(P); this.py = new Float32Array(P); this.pc = new Float32Array(P); this.pa = new Float32Array(P); this.pf = new Float32Array(P);
    this.cx = new Float32Array(N + 1); this.ax = new Float32Array(N + 1); this.so = { cx: 0, ax: 1 };
    this.sagAmp = 0; this.sagSigma = 3; this.holeCb = null;
    var pos = new Float32Array(vc * 3), uv = new Float32Array(vc * 2), idx = [], i, j;
    for (i = 0; i < SEG; i++) for (j = 0; j < P - 1; j++) { var a = i * P + j, b = (i + 1) * P + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    this.sn = []; this.cs = [];
    for (i = 0; i <= SEG; i++) { this.sn.push(Math.sin(i / SEG * 6.2832)); this.cs.push(Math.cos(i / SEG * 6.2832)); }
    var g = this.geo = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); g.setIndex(idx);
    this.mat = new THREE.MeshStandardMaterial({ color: o.color, map: o.map, roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: o.planes, transparent: !!o.opacity, opacity: o.opacity || 1 });
    this.mesh = new THREE.Mesh(g, this.mat); this.mesh.frustumCulled = false;
    // cap on the cut plane
    var cp = new Float32Array(4 * (N + 1) * 3), cu = new Float32Array(4 * (N + 1) * 2), ci = [];
    for (j = 0; j < N; j++) { var q = 4 * j, n = 4 * (j + 1); ci.push(q, n, q + 1, q + 1, n, n + 1, q + 2, n + 2, q + 3, q + 3, n + 2, n + 3); }
    var cg = this.capGeo = new THREE.BufferGeometry();
    cg.setAttribute('position', new THREE.BufferAttribute(cp, 3).setUsage(THREE.DynamicDrawUsage));
    cg.setAttribute('uv', new THREE.BufferAttribute(cu, 2)); cg.setIndex(ci);
    cg.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -10, 0), 80);
    var cn = new Float32Array(4 * (N + 1) * 3); for (j = 0; j < 4 * (N + 1); j++) cn[j * 3 + 2] = 1;
    cg.setAttribute('normal', new THREE.BufferAttribute(cn, 3));
    var col = new THREE.Color(o.color);
    this.capMat = new THREE.MeshStandardMaterial({ color: o.color, map: o.map, roughness: 0.9, emissive: col.clone().multiplyScalar(0.28), side: THREE.DoubleSide, polygonOffset: true, polygonOffsetFactor: -1, polygonOffsetUnits: -1 });
    this.cap = new THREE.Mesh(cg, this.capMat); this.cap.frustumCulled = false; this.cap.position.z = 0.01;
    // outline
    var lp = new Float32Array((2 * N + 6) * 2 * 3), lg = this.lineGeo = new THREE.BufferGeometry();
    lg.setAttribute('position', new THREE.BufferAttribute(lp, 3).setUsage(THREE.DynamicDrawUsage));
    this.line = new THREE.LineSegments(lg, new THREE.LineBasicMaterial({ color: 0x20242b })); this.line.frustumCulled = false; this.line.position.z = 0.03;
    this.group = new THREE.Group(); this.group.add(this.mesh, this.cap, this.line);
  }
  // The hole may be eccentric (oblique shots): per level j the hole is an ellipse centred at x = cx with semi-axes (r*ax, r).
  ProfileSolid.prototype.update = function (yTop, yBot) {
    var N = this.N, K = this.K, SEG = this.SEG, W = this.W, P = this.P, hr = this.hr, ys = this.ys, pr = this.pr, py = this.py, pc = this.pc, pa = this.pa, pf = this.pf, cx = this.cx, ax = this.ax, so = this.so, j, i, m;
    var lim = W - 0.5;
    for (j = 0; j <= N; j++) {
      var y = yTop + (yBot - yTop) * j / N; ys[j] = y; so.cx = 0; so.ax = 1;
      var r = this.holeCb ? this.holeCb(y, so) : 0;
      if (r > 0) { var maxr = (lim - Math.abs(so.cx)) / so.ax; if (r > maxr) r = Math.max(0, maxr); }
      hr[j] = r; cx[j] = so.cx; ax[j] = so.ax;
    }
    var amp = this.sagAmp, sg = this.sagSigma;
    var ba = this.bendAmp || 0, bs2 = Math.pow(this.bendSigma || 9, 2);
    function bd(x, z) { return ba ? ba * Math.exp(-(x * x + z * z) / bs2) : 0; }     // optional global bending displacement
    var sig = yTop + yBot * 3 + amp * 7 + sg * 0.1 + ba * 13; for (j = 0; j <= N; j++) sig += hr[j] * (j + 1.37) + cx[j] * (j + 2.11) + ax[j] * 0.7;
    if (sig === this._sig) return; this._sig = sig;
    var sag = function (rad) { return amp ? amp * Math.exp(-(rad * rad) / (sg * sg)) : 0; };
    for (m = 0; m <= N; m++) { pr[m] = hr[m]; pc[m] = cx[m]; pa[m] = ax[m]; pf[m] = 0; py[m] = ys[m] + (m === 0 ? sag(hr[0]) : 0); }
    pr[N + 1] = W; pc[N + 1] = 0; pa[N + 1] = 1; pf[N + 1] = 0; py[N + 1] = yBot;
    pr[N + 2] = W; pc[N + 2] = 0; pa[N + 2] = 1; pf[N + 2] = 0; py[N + 2] = yTop;
    for (var k = 1; k <= K; k++) {
      var rr = hr[0] + (W - hr[0]) * Math.pow((K - k) / K, 1.8), fk = W - hr[0] > 1e-6 ? (rr - hr[0]) / (W - hr[0]) : 1;
      pr[N + 2 + k] = hr[0]; pc[N + 2 + k] = cx[0]; pa[N + 2 + k] = ax[0]; pf[N + 2 + k] = fk; py[N + 2 + k] = yTop + sag(rr);
    }
    var pos = this.geo.attributes.position.array, uv = this.geo.attributes.uv.array, o = 0, u = 0;
    for (i = 0; i <= SEG; i++) for (m = 0; m < P; m++) {
      var f = pf[m], sn = this.sn[i], cs = this.cs[i];
      var x = (1 - f) * (pc[m] + pr[m] * pa[m] * sn) + f * W * sn, z = (1 - f) * pr[m] * cs + f * W * cs;
      pos[o++] = x; pos[o++] = py[m] + bd(x, z); pos[o++] = z;
      uv[u++] = x * 0.06 + z * 0.02; uv[u++] = z * 0.06 + py[m] * 0.06;
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.attributes.uv.needsUpdate = true;
    this.geo.computeVertexNormals();
    // cap on the cut plane
    var cp = this.capGeo.attributes.position.array, cu = this.capGeo.attributes.uv.array; o = 0; u = 0;
    for (j = 0; j <= N; j++) {
      var yy = ys[j], yi = j === 0 ? yy + sag(hr[0]) : yy, xl = cx[j] - hr[j] * ax[j], xr = cx[j] + hr[j] * ax[j];
      cp[o++] = -W; cp[o++] = yy + bd(W, 0); cp[o++] = 0; cp[o++] = xl; cp[o++] = yi + bd(xl, 0); cp[o++] = 0;
      cp[o++] = xr; cp[o++] = yi + bd(xr, 0); cp[o++] = 0; cp[o++] = W; cp[o++] = yy + bd(W, 0); cp[o++] = 0;
      cu[u++] = -W * 0.06; cu[u++] = yy * 0.06; cu[u++] = xl * 0.06; cu[u++] = yi * 0.06; cu[u++] = xr * 0.06; cu[u++] = yi * 0.06; cu[u++] = W * 0.06; cu[u++] = yy * 0.06;
    }
    this.capGeo.attributes.position.needsUpdate = true; this.capGeo.attributes.uv.needsUpdate = true;
    // outline
    var lp = this.lineGeo.attributes.position.array; o = 0;
    function seg(x1, y1, x2, y2) { lp[o++] = x1; lp[o++] = y1 + bd(x1, 0); lp[o++] = 0; lp[o++] = x2; lp[o++] = y2 + bd(x2, 0); lp[o++] = 0; }
    for (j = 0; j < N; j++) {
      if (hr[j] < 0.01 && hr[j + 1] < 0.01) { seg(0, 0, 0, 0); seg(0, 0, 0, 0); continue; }   // no hole here: no centre line
      var yj = j === 0 ? ys[0] + sag(hr[0]) : ys[j];
      seg(cx[j] - hr[j] * ax[j], yj, cx[j + 1] - hr[j + 1] * ax[j + 1], ys[j + 1]); seg(cx[j] + hr[j] * ax[j], yj, cx[j + 1] + hr[j + 1] * ax[j + 1], ys[j + 1]);
    }
    var yt = ys[0] + sag(hr[0]);
    seg(-W, yTop, cx[0] - hr[0] * ax[0], yt); seg(cx[0] + hr[0] * ax[0], yt, W, yTop);
    seg(-W, yBot, cx[N] - hr[N] * ax[N], yBot); seg(cx[N] + hr[N] * ax[N], yBot, W, yBot);
    seg(-W, yTop, -W, yBot); seg(W, yTop, W, yBot);
    this.lineGeo.attributes.position.needsUpdate = true;
  };  ProfileSolid.prototype.setVisible = function (v) { this.group.visible = v; };
  App.ProfileSolid = ProfileSolid;

  // ---------- bullet (ogive, live deformation) ----------
  function Bullet() {
    var SEG = 20, PT = 7; this.SEG = SEG; this.PT = PT;
    var pos = new Float32Array((SEG + 1) * PT * 3), idx = [], i, j;
    for (i = 0; i < SEG; i++) for (j = 0; j < PT - 1; j++) { var a = i * PT + j, b = (i + 1) * PT + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(pos, 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(idx);
    this.mat = new THREE.MeshStandardMaterial({ color: 0xc9773e, metalness: 0.6, roughness: 0.35, side: THREE.DoubleSide });
    this.mesh = new THREE.Mesh(this.geo, this.mat); this.mesh.frustumCulled = false;
    this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 10, 0), 40); this.mesh.userData.bullet = true;
    this.group = new THREE.Group(); this.group.add(this.mesh);
    this.L = 1;
    this.rm = [0, 1, 1, 0.92, 0.7, 0.38, 0]; this.fm = [0, 0, 0.5, 0.75, 0.9, 0.97, 1];
  }
  Bullet.prototype.update = function (cal, def, hp) {
    var R = cal / 2, L = 1.6 * cal * (1 - 0.3 * def), mush = 1 + (hp ? 0.8 : 0.15) * def, pos = this.geo.attributes.position.array, o = 0, i, j;
    this.L = L;
    for (i = 0; i <= this.SEG; i++) {
      var s = Math.sin(i / this.SEG * 6.2832), c = Math.cos(i / this.SEG * 6.2832);
      for (j = 0; j < this.PT; j++) {
        var rm = this.rm[j]; if (j >= 3) rm *= mush; if (j === 6 && hp) rm = 0.3 * mush * (1 - 0.4 * def);
        var r = R * rm; pos[o++] = r * s; pos[o++] = this.fm[j] * L; pos[o++] = r * c;
      }
    }
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals();
    this.mat.color.setHex(hp ? 0xb87a4a : 0xc9773e);
  };
  App.Bullet = Bullet;
})(window.App = window.App || {});
