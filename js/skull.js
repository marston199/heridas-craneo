(function (App) {
  var D = App.data, S = App.sim;
  var AX = new THREE.Vector3(1.05, 0.85, 0.75);       // procedural fallback: outer ellipsoid semi-axes
  var MM = 0.0111 * D.WOUND_EXAG;                     // mm -> skull units (exaggerated)
  var NW = 4;                                         // wound slots: 0 entry, 1 exit (perpendicular) · 2 tangential entry part, 3 tangential exit part

  // unrolled (constant array indices) so the fragment shader compiles quickly on every driver
  var HOLE_GLSL = (function () {
    var out = [];
    for (var n = 0; n < 4; n++) {
      out.push('if(uW[' + n + '].x>0.0){ vec3 dd=vWorldH-uP[' + n + ']; float u=dot(dd,uD[' + n + ']); float s=u+uW[' + n + '].w*0.5;');
      out.push(' if(s>=0.0&&s<=uW[' + n + '].w){ vec3 rv=dd-uD[' + n + ']*u; float rad=length(rv);');
      out.push('  float r=s<=uW[' + n + '].z?uW[' + n + '].x:uW[' + n + '].x+(s-uW[' + n + '].z)*uW[' + n + '].y*uQ[' + n + '];');
      out.push('  if(uK[' + n + '].w>0.0&&rad>1e-5){ float cp=max(dot(rv/rad,uK[' + n + '].xyz),0.0); r*=1.0+uK[' + n + '].w*cp*cp; }');
      out.push('  if(rad<r) discard; } }');
    }
    return out.join('\n');
  })();

  function patchHole(mat, U) {
    if (window.__dbg && window.__dbg.noPatchAll) return;
    mat.onBeforeCompile = function (sh) {
      sh.uniforms.uP = U.uP; sh.uniforms.uD = U.uD; sh.uniforms.uW = U.uW; sh.uniforms.uQ = U.uQ; sh.uniforms.uK = U.uK;
      sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldH;')
        .replace('#include <begin_vertex>', '#include <begin_vertex>\nvWorldH=(modelMatrix*vec4(transformed,1.0)).xyz;');
      sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nvarying vec3 vWorldH;\nuniform vec3 uP[4];uniform vec3 uD[4];uniform vec4 uW[4];uniform float uQ[4];uniform vec4 uK[4];')
        .replace('void main() {', 'void main() {\n' + HOLE_GLSL);
    };
    mat.customProgramCacheKey = function () { return 'skullHole4'; };
  }

  function onEllipsoid(dir, out) {
    var k = 1 / Math.sqrt(dir.x * dir.x / (AX.x * AX.x) + dir.y * dir.y / (AX.y * AX.y) + dir.z * dir.z / (AX.z * AX.z));
    return out.copy(dir).multiplyScalar(k);
  }
  function normalAt(p, out) { return out.set(p.x / (AX.x * AX.x), p.y / (AX.y * AX.y), p.z / (AX.z * AX.z)).normalize(); }

  function Skull() {
    var g = this.group = new THREE.Group(), self = this, i;
    this.T = 0.065; this.scenario = 'perp'; this.source = 'procedural'; this.model = null;
    this.base = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.45);
    this.cut = new THREE.Plane(new THREE.Vector3(0, 0, 0), 1);
    var planes = this.planes = [this.base, this.cut];
    var U = this.U = { uP: { value: [] }, uD: { value: [] }, uW: { value: [] }, uQ: { value: [0, 0, 0, 0] }, uK: { value: [] } };
    for (i = 0; i < NW; i++) { U.uP.value.push(new THREE.Vector3()); U.uD.value.push(new THREE.Vector3(0, 1, 0)); U.uW.value.push(new THREE.Vector4()); U.uK.value.push(new THREE.Vector4()); }
    function M(color, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.8, side: THREE.DoubleSide, clippingPlanes: planes }, extra || {})); }
    this.M = M;
    var bone = 0xe9dfc8;
    // procedural cranium shells (fallback)
    var outerMat = M(bone, { map: App.tex.table }), innerMat = M(0xd6c9aa, { map: App.tex.table });
    patchHole(outerMat, U); patchHole(innerMat, U);
    var geo = new THREE.SphereGeometry(1, 64, 48);
    var o = this.outer = new THREE.Mesh(geo, outerMat); o.scale.copy(AX);
    var i2 = this.inner = new THREE.Mesh(geo, innerMat); i2.scale.copy(AX).multiplyScalar(0.93);
    g.add(o, i2);
    this.mats = [outerMat, innerMat]; this.patch = patchHole;
    // procedural face
    var face = this.face = new THREE.Group(); g.add(face);
    var cutOnly = [this.cut];
    function Mf(color, extra) { return new THREE.MeshStandardMaterial(Object.assign({ color: color, roughness: 0.8, side: THREE.DoubleSide, clippingPlanes: cutOnly }, extra || {})); }
    function add(mesh, x, y, z, sx, sy, sz) { mesh.position.set(x, y, z); if (sx) mesh.scale.set(sx, sy, sz); face.add(mesh); return mesh; }
    add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), Mf(bone)), 0.80, -0.52, 0, 0.36, 0.36, 0.46);
    add(new THREE.Mesh(new THREE.SphereGeometry(1, 32, 24), Mf(bone)), 0.88, -0.02, 0, 0.18, 0.07, 0.58);
    var dark = Mf(0x1a1612, { side: THREE.FrontSide });
    for (var sgn = -1; sgn <= 1; sgn += 2) {
      add(new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), dark), 0.99, -0.20, sgn * 0.27, 0.10, 0.16, 0.16);
      var ap = [new THREE.Vector3(0.05, -0.30, sgn * 0.72), new THREE.Vector3(0.40, -0.36, sgn * 0.74), new THREE.Vector3(0.82, -0.40, sgn * 0.50)];
      face.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(ap), 16, 0.04, 6, false), Mf(bone)));
    }
    var nas = new THREE.Shape(); nas.moveTo(0, -0.12); nas.lineTo(0.09, 0.07); nas.lineTo(-0.09, 0.07); nas.lineTo(0, -0.12);
    var nm = add(new THREE.Mesh(new THREE.ShapeGeometry(nas), dark), 1.17, -0.38, 0); nm.rotation.y = Math.PI / 2; nm.position.set(1.185, -0.36, 0);
    var pts = [new THREE.Vector3(-0.10, -0.22, -0.66), new THREE.Vector3(0.0, -0.60, -0.58), new THREE.Vector3(0.55, -0.72, -0.40), new THREE.Vector3(0.95, -0.76, -0.12), new THREE.Vector3(1.02, -0.77, 0),
      new THREE.Vector3(0.95, -0.76, 0.12), new THREE.Vector3(0.55, -0.72, 0.40), new THREE.Vector3(0.0, -0.60, 0.58), new THREE.Vector3(-0.10, -0.22, 0.66)];
    face.add(new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 40, 0.05, 8, false), Mf(bone)));
    var th = new THREE.InstancedMesh(new THREE.BoxGeometry(0.05, 0.07, 0.06), Mf(0xf6f2e6), 24), mm = new THREE.Matrix4(), q = new THREE.Quaternion(), ps = new THREE.Vector3(), one = new THREE.Vector3(1, 1, 1);
    for (var r = 0; r < 2; r++) for (var k = 0; k < 12; k++) {
      var a = (k / 11 - 0.5) * 2.0; ps.set(0.98 - Math.abs(a) * 0.3, r ? -0.70 : -0.62, a * 0.34); q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), -a * 0.6);
      mm.compose(ps, q, one); th.setMatrixAt(r * 12 + k, mm);
    }
    face.add(th);
    face.updateMatrix(); face.traverse(function (m) { if (m !== face) { m.matrixAutoUpdate = false; m.updateMatrix(); } });

    // ---- wound machinery ----
    this.E = new THREE.Vector3(); this.X = new THREE.Vector3(); this.Dv = new THREE.Vector3(); this.nE = new THREE.Vector3(); this.nX = new THREE.Vector3();
    this.K = new THREE.Vector3(); this.nK = new THREE.Vector3(); this.tg = new THREE.Vector3(); this.Dk = new THREE.Vector3();
    this.W = []; var up = this.up = new THREE.Vector3(0, 1, 0);
    for (i = 0; i < NW; i++) {
      var lg = new THREE.LatheGeometry([new THREE.Vector2(0.1, 0), new THREE.Vector2(0.1, 0.02), new THREE.Vector2(0.2, this.T)], 28);
      lg.attributes.position.setUsage(THREE.DynamicDrawUsage);
      var wm = new THREE.Mesh(lg, M(0xcdbf9d, { emissive: 0x1f1a10 })); wm.frustumCulled = false; wm.visible = false; g.add(wm);
      this.W.push({ wall: wm, P0: new THREE.Vector3(), dir: new THREE.Vector3(0, 1, 0), tc: 0.2, kind: i === 0 || i === 2 ? 0 : 1, active: false, key: '', frac: null, wedge: 0 });
    }
    // trajectory + bullet
    function dashed(hex) { var l = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(0, 0, 0.01)]), new THREE.LineDashedMaterial({ color: hex, dashSize: 0.06, gapSize: 0.04, depthTest: false, transparent: true, opacity: 0.9 })); l.renderOrder = 5; l.frustumCulled = false; g.add(l); return l; }
    this.lineA = dashed(0xff8a3d); this.lineB = dashed(0x6ee7a8);
    this.sb = new THREE.Mesh(new THREE.CylinderGeometry(0.028, 0.028, 0.12, 12), new THREE.MeshStandardMaterial({ color: 0xc9773e, metalness: 0.6, roughness: 0.4 })); this.sb.renderOrder = 6; g.add(this.sb);
    // hotspots
    var c = document.createElement('canvas'); c.width = c.height = 64; var x = c.getContext('2d'); x.strokeStyle = '#fff'; x.lineWidth = 3; x.beginPath(); x.arc(32, 32, 24, 0, 6.283); x.stroke();
    var tex = new THREE.CanvasTexture(c);
    this.hot = [];
    for (var h = 0; h < 2; h++) {
      var sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, color: h ? 0x6ee7a8 : 0xff8a3d, transparent: true, depthTest: false }));
      sp.scale.setScalar(0.42); sp.renderOrder = 8; sp.userData.mode = h ? 'exit' : 'entry'; g.add(sp); this.hot.push(sp);
    }
    this.d = [null, null]; this.nCr = 6;
    this.surfaceFn = this.surfEllipsoid; this.projFn = this.projEllipsoid;
    this.placeWounds();
  }

  // ---------- surface providers ----------
  Skull.prototype.surfEllipsoid = function (dir, outP, outN) { onEllipsoid(dir, outP); normalAt(outP, outN); return 0.065; };
  Skull.prototype.projEllipsoid = function (p, outP, outN) { onEllipsoid(p, outP); normalAt(outP, outN); outP.addScaledVector(outN, 0.006); return outP; };
  // The real model is star-shaped around the cranial centre, so its outer surface is stored as a spherical depth map
  // (radius for every direction). Surface lookups are then O(1) instead of ray-casting 40k triangles per query.
  Skull.prototype.buildMap = function (geom) {
    var NT = 180, NP = 360, R = new Float32Array(NT * NP), pos = geom.attributes.position.array, idx = geom.index ? geom.index.array : null;
    var O = this._origin, ntri = idx ? idx.length / 3 : pos.length / 9, t, k, i, j, PI = Math.PI;
    var th = [0, 0, 0], ph = [0, 0, 0], rr = [0, 0, 0];
    for (t = 0; t < ntri; t++) {
      for (k = 0; k < 3; k++) {
        var vi = idx ? idx[t * 3 + k] : t * 3 + k, dx = pos[vi * 3] - O.x, dy = pos[vi * 3 + 1] - O.y, dz = pos[vi * 3 + 2] - O.z, r = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
        th[k] = Math.acos(Math.max(-1, Math.min(1, dy / r))); ph[k] = Math.atan2(dz, dx); rr[k] = r;
      }
      for (k = 1; k < 3; k++) { var dp = ph[k] - ph[0]; if (dp > PI) ph[k] -= 2 * PI; else if (dp < -PI) ph[k] += 2 * PI; }
      var t0 = Math.min(th[0], th[1], th[2]), t1 = Math.max(th[0], th[1], th[2]), p0 = Math.min(ph[0], ph[1], ph[2]), p1 = Math.max(ph[0], ph[1], ph[2]);
      var i0 = Math.max(0, Math.floor(t0 / PI * NT)), i1 = Math.min(NT - 1, Math.floor(t1 / PI * NT)), j0 = Math.floor((p0 + PI) / (2 * PI) * NP), j1 = Math.floor((p1 + PI) / (2 * PI) * NP);
      var den = (th[1] - th[2]) * (ph[0] - ph[2]) + (ph[2] - ph[1]) * (th[0] - th[2]);
      for (i = i0; i <= i1; i++) {
        var tc = (i + 0.5) / NT * PI;
        for (j = j0; j <= j1; j++) {
          var pc = (j + 0.5) / NP * 2 * PI - PI, a, b, c;
          if (Math.abs(den) < 1e-12) { a = 1; b = 0; c = 0; }
          else { a = ((th[1] - th[2]) * (pc - ph[2]) + (ph[2] - ph[1]) * (tc - th[2])) / den; b = ((th[2] - th[0]) * (pc - ph[2]) + (ph[0] - ph[2]) * (tc - th[2])) / den; c = 1 - a - b; }
          if (a < -0.05 || b < -0.05 || c < -0.05) continue;
          var rv = a * rr[0] + b * rr[1] + c * rr[2], jj = ((j % NP) + NP) % NP, ci = i * NP + jj;
          if (rv > R[ci]) R[ci] = rv;
        }
      }
    }
    for (var pass = 0; pass < 4; pass++) {          // close small gaps
      for (i = 1; i < NT - 1; i++) for (j = 0; j < NP; j++) {
        var c0 = i * NP + j; if (R[c0] > 0) continue;
        var m = Math.max(R[c0 - NP], R[c0 + NP], R[i * NP + (j + 1) % NP], R[i * NP + (j + NP - 1) % NP]); if (m > 0) R[c0] = m;
      }
    }
    this.map = { R: R, NT: NT, NP: NP };
  };
  Skull.prototype.mapR = function (theta, phi) {      // bilinear radius lookup
    var m = this.map, NT = m.NT, NP = m.NP, u = theta / Math.PI * NT - 0.5, v = (phi + Math.PI) / (2 * Math.PI) * NP - 0.5;
    var i0 = Math.max(0, Math.min(NT - 2, Math.floor(u))), fu = Math.max(0, Math.min(1, u - i0)), j0 = Math.floor(v), fv = v - j0;
    j0 = ((j0 % NP) + NP) % NP; var j1 = (j0 + 1) % NP, R = m.R;
    return (R[i0 * NP + j0] * (1 - fv) + R[i0 * NP + j1] * fv) * (1 - fu) + (R[(i0 + 1) * NP + j0] * (1 - fv) + R[(i0 + 1) * NP + j1] * fv) * fu;
  };
  Skull.prototype.mapPoint = function (theta, phi, out) {
    var r = this.mapR(theta, phi), st = Math.sin(theta);
    return out.set(this._origin.x + r * st * Math.cos(phi), this._origin.y + r * Math.cos(theta), this._origin.z + r * st * Math.sin(phi));
  };
  Skull.prototype.mapNormal = function (theta, phi, dir, out) {
    var d = 0.02, a = this._mp1 || (this._mp1 = new THREE.Vector3()), b = this._mp2 || (this._mp2 = new THREE.Vector3()), c = this._mp3 || (this._mp3 = new THREE.Vector3()), e = this._mp4 || (this._mp4 = new THREE.Vector3());
    this.mapPoint(theta + d, phi, a); this.mapPoint(theta - d, phi, b); this.mapPoint(theta, phi + d, c); this.mapPoint(theta, phi - d, e);
    a.sub(b); c.sub(e); out.crossVectors(c, a).normalize(); if (out.dot(dir) < 0) out.negate(); return out;
  };
  Skull.prototype.surfModel = function (dir, outP, outN) {
    var l = dir.length(), th = Math.acos(Math.max(-1, Math.min(1, dir.y / l))), ph = Math.atan2(dir.z, dir.x);
    this.mapPoint(th, ph, outP); this.mapNormal(th, ph, dir, outN); return 0.065;
  };
  Skull.prototype.projModel = function (p, outP, outN) {
    var dx = p.x - this._origin.x, dy = p.y - this._origin.y, dz = p.z - this._origin.z, l = Math.sqrt(dx * dx + dy * dy + dz * dz) || 1e-6;
    var th = Math.acos(Math.max(-1, Math.min(1, dy / l))), ph = Math.atan2(dz, dx), dir = this._pd || (this._pd = new THREE.Vector3());
    dir.set(dx / l, dy / l, dz / l); this.mapPoint(th, ph, outP); this.mapNormal(th, ph, dir, outN); outP.addScaledVector(outN, 0.004); return outP;
  };
  // ---------- wound placement (recomputed when the surface source changes) ----------
  Skull.prototype.placeWounds = function () {
    var i, W = this.W, U = this.U, T;
    T = this.T = this.surfaceFn.call(this, new THREE.Vector3(0.55, 0.40, 0.75), this.E, this.nE);
    // exit point: nudge the nominal direction until the trajectory crosses the vault as perpendicularly as possible at both ends
    var bestA = 9, bp = new THREE.Vector3(), bn = new THREE.Vector3(), cp = new THREE.Vector3(), cn = new THREE.Vector3(), cd = new THREE.Vector3(), ox, oy, oz, cand = new THREE.Vector3();
    for (ox = -0.25; ox <= 0.251; ox += 0.125) for (oy = -0.2; oy <= 0.201; oy += 0.1) for (oz = -0.12; oz <= 0.121; oz += 0.12) {
      cand.set(-0.55 + ox, 0.12 + oy, -0.78 + oz); this.surfaceFn.call(this, cand, cp, cn); cd.subVectors(cp, this.E).normalize();
      var aE = Math.acos(Math.min(1, -cd.dot(this.nE))), aX = Math.acos(Math.min(1, cd.dot(cn))), worst = Math.max(aE, aX);
      if (worst < bestA) { bestA = worst; bp.copy(cp); bn.copy(cn); }
    }
    this.X.copy(bp); this.nX.copy(bn);
    this.Dv.subVectors(this.X, this.E).normalize();
    this.angE = Math.acos(Math.min(1, -this.Dv.dot(this.nE))); this.angX = Math.acos(Math.min(1, this.Dv.dot(this.nX)));
    // tangential impact point
    this.surfaceFn.call(this, new THREE.Vector3(0.05, 0.75, 0.66), this.K, this.nK);
    var v = new THREE.Vector3(1, -0.2, 0); this.tg.copy(v).addScaledVector(this.nK, -v.dot(this.nK)).normalize();
    var a15 = 15 * Math.PI / 180; this.Dk.copy(this.tg).multiplyScalar(Math.cos(a15)).addScaledVector(this.nK, -Math.sin(a15)).normalize();
    // slot 0/1: perpendicular entry / exit
    W[0].P0.copy(this.E); W[0].dir.copy(this.Dv); W[0].tc = 0.18; W[0].wedge = 0;
    W[1].P0.copy(this.X).addScaledVector(this.Dv, -T); W[1].dir.copy(this.Dv); W[1].tc = 0.68; W[1].wedge = 0;
    // slot 2/3: tangential entry part (internal bevel) and exit part (external bevel, flared downrange)
    var r0v = 4.5 * MM, off = 1.6 * r0v + 0.02;
    var pb = this.K.clone().addScaledVector(this.tg, off), nb = new THREE.Vector3(), tmpP = new THREE.Vector3();
    this.projFn.call(this, pb, tmpP, nb); pb.copy(tmpP).addScaledVector(nb, -0.004);
    var dirB = nb.clone().multiplyScalar(0.8).addScaledVector(this.tg, 0.6).normalize();
    W[2].P0.copy(this.K); W[2].dir.copy(this.Dk); W[2].tc = 0.30; W[2].wedge = 0;
    W[3].P0.copy(pb).addScaledVector(dirB, -T); W[3].dir.copy(dirB); W[3].tc = 0.33; W[3].wedge = 0.8;
    this.nB = nb.clone(); this.Bout = pb.clone();
    for (i = 0; i < NW; i++) {
      var w = W[i]; U.uD.value[i].copy(w.dir); U.uP.value[i].copy(w.P0).addScaledVector(w.dir, T / 2);
      U.uK.value[i].set(i === 3 ? this.tg.x : 0, i === 3 ? this.tg.y : 0, i === 3 ? this.tg.z : 0, w.wedge);
      w.wall.position.copy(w.P0); w.wall.quaternion.setFromUnitVectors(this.up, w.dir); w.key = '';
      // fracture lines around the surface point of each wound
      var cen = new THREE.Vector3(), nn = new THREE.Vector3();
      if (i === 0) { cen.copy(this.E); nn.copy(this.nE); } else if (i === 1) { cen.copy(this.X); nn.copy(this.nX); }
      else if (i === 2) { cen.copy(this.K); nn.copy(this.nK); } else { cen.copy(this.Bout); nn.copy(this.nB); }
      if (w.frac) { this.group.remove(w.frac.line); w.frac.line.geometry.dispose(); }
      w.frac = this.makeFrac(i, cen, nn);
    }
    this.applyScenarioGeometry();
  };

  Skull.prototype.applyScenarioGeometry = function () {
    var tang = this.scenario === 'tangential', W = this.W, i;
    for (i = 0; i < NW; i++) W[i].active = tang ? i >= 2 : i < 2;
    var hotE = this.hot[0], hotX = this.hot[1];
    if (tang) { hotE.position.copy(this.K).addScaledVector(this.nK, 0.06); hotX.visible = false; }
    else { hotE.position.copy(this.E).addScaledVector(this.nE, 0.06); hotX.position.copy(this.X).addScaledVector(this.nX, 0.06); hotX.visible = true; }
    var a = this.lineA.geometry, b = this.lineB.geometry, p0, p1;
    if (tang) {
      p0 = this.K.clone().addScaledVector(this.Dk, -0.7); p1 = this.K.clone().addScaledVector(this.Dk, 0.9); a.setFromPoints([p0, this.K]); b.setFromPoints([this.K, p1]);
    } else {
      a.setFromPoints([this.E.clone().addScaledVector(this.Dv, -0.7), this.E, this.X]); b.setFromPoints([this.X, this.X.clone().addScaledVector(this.Dv, 0.7)]);
    }
    this.lineA.computeLineDistances(); this.lineB.computeLineDistances();
    this.sb.quaternion.setFromUnitVectors(this.up, tang ? this.Dk : this.Dv);
    this.pathStart = tang ? this.K.clone() : this.E.clone();
    this.pathDir = tang ? this.Dk : this.Dv; this.pathLen = tang ? 1.0 : this.E.distanceTo(this.X);
    this.pathT0 = tang ? 0.30 : 0.18; this.pathSpan = 0.5;
    for (i = 0; i < NW; i++) { W[i].wall.visible = false; if (W[i].frac) W[i].frac.line.visible = false; W[i].key = ''; }
  };

  Skull.prototype.setScenario = function (sc) {
    sc = sc === 'tangential' ? 'tangential' : 'perp'; if (sc === this.scenario) return;
    this.scenario = sc; this.applyScenarioGeometry();
  };

  // ---------- fracture lines: radial + concentric, precomputed on the surface, revealed with an index range ----------
  Skull.prototype.makeFrac = function (w, center, n) {
    var rr = S.rng(77 + w * 13), N = 14, i, j, self = this, tmpN = new THREE.Vector3(), tmp = new THREE.Vector3(), out = new THREE.Vector3();
    var tx = new THREE.Vector3().crossVectors(n, new THREE.Vector3(0, 1, 0)).normalize(), ty = new THREE.Vector3().crossVectors(n, tx);
    var ang = [], len = [], base = 0.30, jit = [];
    for (i = 0; i < N; i++) { ang.push(i / N * 6.283 + (rr() - 0.5) * 0.3); len.push(0.35 + rr() * 0.65); }
    for (i = 0; i < N * 4; i++) jit.push((rr() - 0.5) * 0.35);
    var verts = new Float32Array((N * 4 + N * 2) * 3), o = 0;
    function pt(rad, an) {
      tmp.copy(center).addScaledVector(tx, Math.cos(an) * rad).addScaledVector(ty, Math.sin(an) * rad);
      self.projFn.call(self, tmp, out, tmpN); verts[o++] = out.x; verts[o++] = out.y; verts[o++] = out.z;
    }
    for (i = 0; i < N; i++) for (j = 0; j < 4; j++) pt(base * (0.12 + (len[i] - 0.12) * j / 3), ang[i] + jit[i * 4 + j]);
    for (i = 0; i < N; i++) {
      var rho = base * (i % 2 ? 0.30 : 0.50), a1 = ang[i], a2 = ang[(i + 1) % N] + (i === N - 1 ? 6.283 : 0);
      pt(rho, a1); pt(rho, a1 + (a2 - a1) * 0.8);
    }
    var geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(verts, 3)); geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 4);
    var line = new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0x3a2f22 })); line.frustumCulled = false; line.visible = false; this.group.add(line);
    var f = { line: line, N: N, nShown: -1, total: 0, lastDraw: -1 };
    f.setCount = function (n) {                      // number of radial lines drawn (depends on kinetic energy)
      n = Math.min(N, n); if (n === f.nShown) return; f.nShown = n; var idx = [], jj, ii;
      for (jj = 0; jj < 3; jj++) for (ii = 0; ii < n; ii++) idx.push(ii * 4 + jj, ii * 4 + jj + 1);
      for (ii = 0; ii < n; ii++) idx.push(N * 4 + ii * 2, N * 4 + ii * 2 + 1);
      geo.setIndex(idx); f.total = idx.length / 2; f.lastDraw = -1;
    };
    f.draw = function (q) {
      if (q < 0.02) { line.visible = false; return; }
      line.visible = true; var c = Math.max(1, Math.ceil(f.total * Math.min(1, q))) * 2; if (c !== f.lastDraw) { geo.setDrawRange(0, c); f.lastDraw = c; }
    };
    f.setCount(this.nCr);
    return f;
  };

  Skull.prototype.setParams = function (dEntry, dExit) {
    this.d = [dEntry, dExit]; this.nCr = dEntry.nCracks;
    for (var i = 0; i < NW; i++) { this.W[i].key = ''; if (this.W[i].frac) this.W[i].frac.setCount(this.nCr); }
  };

  Skull.prototype.update = function (t) {
    var U = this.U, i, W = this.W, T = this.T;
    for (i = 0; i < NW; i++) {
      var w = W[i], d = this.d[w.kind];
      if (!d || !w.active) { U.uW.value[i].set(0, 0, 0, T); U.uQ.value[i] = 0; if (w.wall.visible) w.wall.visible = false; if (w.frac && w.frac.line.visible) w.frac.line.visible = false; continue; }
      var open = S.smooth(w.tc - 0.03, w.tc + 0.03, t), q = S.smooth(w.tc, w.tc + 0.16, t);
      var kk = MM, scv = 0.3 * T, depthK = d.T / T, r0v = d.r0 * kk * open;
      U.uW.value[i].set(r0v, d.tan * kk * depthK, scv, T); U.uQ.value[i] = q;
      var wkey = (open * 500 | 0) + '|' + (q * 500 | 0) + '|' + d.r0 + '|' + d.tan + '|' + T;
      if (wkey === w.key) continue;
      w.key = wkey;
      var pa = w.wall.geometry.attributes.position.array, SEG = 28, o = 0, j, ii, wedge = w.wedge;
      var rfar = r0v + (T - scv) * d.tan * kk * depthK * q;
      var rs = [r0v, r0v, rfar], ys = [0, scv, T];
      for (ii = 0; ii <= SEG; ii++) { var ph = ii / SEG * 6.2832; for (j = 0; j < 3; j++) { pa[o++] = rs[j] * Math.sin(ph); pa[o++] = ys[j]; pa[o++] = rs[j] * Math.cos(ph); } }
      w.wall.geometry.attributes.position.needsUpdate = true; w.wall.geometry.computeVertexNormals();
      w.wall.visible = open > 0.01 && wedge === 0;     // the flared (keyhole) wall is not a surface of revolution: shader hole only
      w.frac.draw(q);
    }
    // bullet along the path
    var u = (t - this.pathT0) / this.pathSpan;
    this.sb.position.copy(this.pathStart).addScaledVector(this.pathDir, u * this.pathLen);
    this.sb.visible = t < 0.9 && t > 0.0;
  };

  // the point (vector from the centre) each camera preset looks at
  Skull.prototype.focusVec = function (name) {
    if (this.scenario === 'tangential') return this.K.clone();
    return (name === 'ent_out' || name === 'ent_in') ? this.E.clone() : this.X.clone();
  };
  Skull.prototype.setCut = function (mode, vec) {
    var c = this.cut;
    if (!mode) { c.normal.set(0, 0, 0); c.constant = 1; return; }
    var v = vec || (this.scenario === 'tangential' ? this.K : (mode === 'entry' ? this.E : this.X));
    c.constant = 0; c.normal.copy(v).normalize();
  };

  // ---------- real anatomical model (decoded asynchronously); procedural skull stays as fallback ----------
  Skull.prototype.useModel = function (geom) {
    var vault = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0.1), cutOnly = [this.cut];
    var outerMat = new THREE.MeshStandardMaterial({ color: 0xd6c7a6, roughness: 0.82, side: THREE.DoubleSide, clippingPlanes: cutOnly });   // the model has no UVs: no texture map
    if (!(window.__dbg && window.__dbg.noPatch)) this.patch(outerMat, this.U);
    var mesh = new THREE.Mesh(geom, outerMat); this.group.add(mesh); mesh.updateMatrixWorld(true);
    this.model = { outerMesh: mesh, innerMesh: null }; this._origin = new THREE.Vector3(0, 0.05, 0);
    this.buildMap(geom);
    var single = true;                               // this model is a single outer shell: build an inner table from it
    if (single) {                                    // inner shell = the vertices pushed inward along their normals
      var ig = geom.clone(), p = ig.attributes.position, n = ig.attributes.normal, j;
      for (j = 0; j < p.count; j++) p.setXYZ(j, p.getX(j) - n.getX(j) * 0.065, p.getY(j) - n.getY(j) * 0.065, p.getZ(j) - n.getZ(j) * 0.065);
      var innerMat = new THREE.MeshStandardMaterial({ color: 0xd6c9aa, roughness: 0.85, side: THREE.DoubleSide, clippingPlanes: [this.cut, vault] }); this.patch(innerMat, this.U);
      var im = new THREE.Mesh(ig, innerMat); this.group.add(im); this.model.innerMesh = im;
    }
    this.outer.visible = this.inner.visible = false; this.face.visible = false;
    this.surfaceFn = this.surfModel; this.projFn = this.projModel; this.source = 'model';
    this.placeWounds();
    return { singleShell: single, ratio: 0 };
  };
  Skull.prototype.useFallback = function () {
    if (this.source === 'procedural') return;
    if (this.model) { this.model.outerMesh.visible = false; if (this.model.innerMesh) this.model.innerMesh.visible = false; }
    this.outer.visible = this.inner.visible = true; this.face.visible = true;
    this.surfaceFn = this.surfEllipsoid; this.projFn = this.projEllipsoid; this.source = 'procedural'; this.placeWounds();
  };
  Skull.prototype.useModelAgain = function () {
    if (this.source === 'model' || !this.model) return;
    this.model.outerMesh.visible = true; if (this.model.innerMesh) this.model.innerMesh.visible = true;
    this.outer.visible = this.inner.visible = false; this.face.visible = false;
    this.surfaceFn = this.surfModel; this.projFn = this.projModel; this.source = 'model'; this.placeWounds();
  };

  App.Skull = Skull;
})(window.App = window.App || {});

