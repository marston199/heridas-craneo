/* Detailed projectile models: FMJ, lead round nose, jacketed hollow point (petals), spitzer boat-tail (cannelure).
   Replaces the simple ogive App.Bullet. Contract used by slab.js: .group (origin = bullet centre, tip toward +Y), .mesh, .L,
   setAmmo(id, hp), setCutaway(bool), update(def, split). */
(function (App) {
  var S = App.sim, TAU = Math.PI * 2;
  // real-ish dimensions in mm (approximate)
  var SPECS = {
    r22: { d: 5.7, L: 11.0, Lo: 4.5, mep: 0.6, bt: 0, grooves: [2.4, 3.8], mat: 'lead' },
    p38: { d: 9.07, L: 17.4, Lo: 7.0, mep: 1.2, bt: 0, grooves: [3.0, 5.2], mat: 'lead', hpAllowed: true },
    p45: { d: 11.48, L: 17.0, Lo: 7.5, mep: 1.0, bt: 0, mat: 'jacket', hpAllowed: true },
    p9: { d: 9.02, L: 15.6, Lo: 7.0, mep: 0.8, bt: 0, mat: 'jacket', hpAllowed: true },
    r556: { d: 5.70, L: 18.9, Lo: 10.5, mep: 0.4, bt: 2.4, can: 7.6, mat: 'jacket', split: true },
    r762: { d: 7.92, L: 26.8, Lo: 13.5, mep: 0.5, bt: 3.5, mat: 'steel', core: 'steel' }
  };
  var COL = { jacket: 0xc9773e, steel: 0xb98a5e, lead: 0x8e9196, core: 0x7c8088, dark: 0x8a4f26 };

  function ogiveProfile(R, Lo, mep, n) {
    var rho = (R * R + Lo * Lo) / (2 * R), xm = Lo, pts = [], i;
    if (mep > 0) { var k = mep - R + rho; xm = Math.sqrt(Math.max(0, rho * rho - k * k)); }
    for (i = 0; i <= n; i++) { var x = xm * i / n; pts.push([R - rho + Math.sqrt(Math.max(0, rho * rho - x * x)), x]); }
    if (mep > 0) pts.push([0, xm]);
    return pts;                                    // [r, xAlongOgive]
  }
  function bodyProfile(s, upTo) {                    // base (y=0) up to y=upTo (or the tip when undefined); returns [r,y]
    var R = s.d / 2, Rb = R - (s.bt ? s.bt * Math.tan(7 * Math.PI / 180) : 0), pts = [[0, 0], [Rb, 0]], yo = s.L - s.Lo;
    if (s.bt) pts.push([R, s.bt]);
    var gr = (s.grooves || []).slice(); if (s.can) gr.push(s.can); gr.sort(function (a, b) { return a - b; });
    gr.forEach(function (y) { if (y < yo && (upTo === undefined || y < upTo)) pts.push([R, y - 0.4], [R - 0.22, y - 0.2], [R - 0.22, y + 0.2], [R, y + 0.4]); });
    if (upTo !== undefined) { pts.push([R, upTo]); return pts; }
    pts.push([R, yo]);
    ogiveProfile(R, s.Lo, s.mep, 14).forEach(function (p, i) { if (i > 0) pts.push([p[0], yo + p[1]]); });
    return pts;
  }

  // ---------- parametric surface helper ----------
  function Surf(grids) {
    this.grids = grids; var vc = 0, idx = [];
    grids.forEach(function (g) {
      g.off = vc;
      for (var i = 0; i < g.nPhi; i++) for (var j = 0; j < g.nS; j++) { var a = vc + i * (g.nS + 1) + j, b = vc + (i + 1) * (g.nS + 1) + j; idx.push(a, b, a + 1, b, b + 1, a + 1); }
      vc += (g.nPhi + 1) * (g.nS + 1);
    });
    this.geo = new THREE.BufferGeometry();
    this.geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(vc * 3), 3).setUsage(THREE.DynamicDrawUsage));
    this.geo.setIndex(idx); this.geo.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 30);
  }
  Surf.prototype.fill = function (def, yoff) {
    var pos = this.geo.attributes.position.array, o = 0, out = [0, 0, 0];
    this.grids.forEach(function (g) {
      for (var i = 0; i <= g.nPhi; i++) for (var j = 0; j <= g.nS; j++) { g.fn(i, j, def, out); pos[o++] = out[0]; pos[o++] = out[1] - yoff; pos[o++] = out[2]; }
    });
    this.geo.attributes.position.needsUpdate = true; this.geo.computeVertexNormals();
  };
  function revGrid(prof, def0, phiLen, deform) {     // surface of revolution of [r,y] points
    return {
      nPhi: 40, nS: prof.length - 1, fn: function (i, j, def, out) {
        var ph = i / 40 * phiLen, r = prof[j][0], y = prof[j][1];
        if (deform) { var d2 = deform(r, y, def); r = d2[0]; y = d2[1]; }
        out[0] = r * Math.sin(ph); out[1] = y; out[2] = r * Math.cos(ph);
      }
    };
  }

  function Bullet() {
    this.group = new THREE.Group(); this.L = 1; this.id = ''; this.hp = false; this.cut = false; this._def = -1; this._split = -1;
    this.mats = {
      jacket: new THREE.MeshStandardMaterial({ color: COL.jacket, metalness: 0.75, roughness: 0.32, side: THREE.DoubleSide }),
      steel: new THREE.MeshStandardMaterial({ color: COL.steel, metalness: 0.7, roughness: 0.38, side: THREE.DoubleSide }),
      lead: new THREE.MeshStandardMaterial({ color: COL.lead, metalness: 0.4, roughness: 0.6, side: THREE.DoubleSide }),
      core: new THREE.MeshStandardMaterial({ color: COL.core, metalness: 0.35, roughness: 0.65, side: THREE.DoubleSide }),
      dark: new THREE.MeshStandardMaterial({ color: COL.dark, metalness: 0.7, roughness: 0.4, side: THREE.DoubleSide })
    };
    this.parts = []; this.surfs = []; this.extra = [];
    this.mesh = null;
  }
  Bullet.prototype.clear = function () {
    var g = this.group; this.parts.concat(this.extra).forEach(function (m) { g.remove(m); if (m.geometry) m.geometry.dispose(); });
    this.parts = []; this.surfs = []; this.extra = []; this.mesh = null;
  };
  Bullet.prototype.setAmmo = function (id, hp, cut) {
    var s0 = SPECS[id] || SPECS.p9; hp = !!hp && !!s0.hpAllowed; cut = !!cut;
    if (id === this.id && hp === this.hp && cut === this.cut) return;
    this.id = id; this.hp = hp; this.cut = cut; this._def = -1; this._split = -1;
    this.clear();
    var s = Object.assign({}, s0), R = s.d / 2, self = this, phiLen = cut ? Math.PI * 1.5 : TAU, M = this.mats;
    if (hp) { s.L = s.L - 0.4; s.Lo = 5.0; }
    this.spec = s; this.L = s.L; this.yoff = s.L / 2;
    var bodyMat = M[s.mat], i;
    function addMesh(surf, mat, userBullet) { var m = new THREE.Mesh(surf.geo, mat); m.frustumCulled = false; if (userBullet) m.userData.bullet = true; self.group.add(m); self.parts.push(m); self.surfs.push(surf); return m; }
    if (hp) {
      var yH = s.L - 5.0, prof = bodyProfile(s, yH);
      var gr = [revGrid(prof, 0, phiLen)];
      this.mesh = addMesh(new Surf(gr), M.jacket, true);
      // petals: 6 sectors of the truncated cone with cavity; curl outward with `def`
      var rt = R * 0.62, cav = 1.75;
      var pp = [[R, yH], [R * 0.97, yH + 1.5], [R * 0.85, yH + 3.1], [rt, s.L], [cav + 0.3, s.L], [cav, s.L - 1.2], [R - 0.55, yH + 0.2]];
      var petals = [];
      for (i = 0; i < 6; i++) (function (idx) {
        var pc = idx * Math.PI / 3 + 0.03, half = Math.PI / 6 * 0.9;
        petals.push({
          nPhi: 6, nS: pp.length - 1, fn: function (a, j, def, out) {
            var r = pp[j][0], y = pp[j][1], phi = pc + (a / 6 - 0.5) * 2 * half, h = y - yH, e = r - R;
            if (def > 0.001) {
              var Rc = 5.0 / Math.max(1e-3, def * 2.2), ang = Math.min(2.6, h / Rc);
              var nr = R + Rc * (1 - Math.cos(ang)) + e * Math.cos(ang), ny = yH + Rc * Math.sin(ang) - e * Math.sin(ang);
              phi = pc + (phi - pc) * Math.pow(R / Math.max(R, nr), 0.9); r = nr; y = ny;
            }
            out[0] = r * Math.sin(phi); out[1] = y; out[2] = r * Math.cos(phi);
          }
        });
      })(i);
      this.petalSurf = new Surf(petals); addMesh(this.petalSurf, M.jacket, true);
      // lead core under the petals (mushrooms with def)
      var cp = [[0, yH - 2.5], [R * 0.8, yH - 2.5], [R * 0.8, yH - 0.4], [R * 0.6, yH + 0.5], [0, yH + 0.9]];
      addMesh(new Surf([revGrid(cp, 0, phiLen, function (r, y, def) { return [r * (1 + (y > yH - 1 ? 0.8 * def : 0)), yH - 2.5 + (y - (yH - 2.5)) * (1 - 0.3 * def)]; })]), M.core, true);
      addMesh(new Surf([revGrid([[0, 0.02], [R * 0.9, 0.02]], 0, phiLen)]), M.lead, true);
    } else if (s.split) {
      // two pieces split at the cannelure (fragmentation above 760 m/s)
      var full = bodyProfile(s), yc = s.can, a = [], b = [];
      full.forEach(function (p) { if (p[1] <= yc) a.push(p); else b.push(p); });
      a.push([R, yc]); b.unshift([R, yc]);
      var defA = function (r, y, def) { return [r, y]; };
      var defB = function (r, y, def) { var w = Math.pow(Math.max(0, (y - yc) / (s.L - yc)), 2); return [r * (1 + 0.18 * def * w), yc + (y - yc) * (1 - 0.25 * def * w)]; };
      this.mesh = addMesh(new Surf([revGrid(a, 0, phiLen, defA)]), M[s.mat], true);
      this.pieceB = addMesh(new Surf([revGrid(b, 0, phiLen, defB)]), M[s.mat], true);
      addMesh(new Surf([revGrid([[0, 0.02], [R * 0.9, 0.02]], 0, phiLen)]), M.lead, true);
      var ring = new THREE.Mesh(new THREE.TorusGeometry(R - 0.05, 0.14, 6, 24), M.dark); ring.rotation.x = Math.PI / 2; ring.position.y = yc - this.yoff; this.group.add(ring); this.extra.push(ring); this.ring = ring;
    } else {
      var full2 = bodyProfile(s);
      var def1 = function (r, y, def) { var w = Math.pow(y / s.L, 2); return [r * (1 + 0.18 * def * w), y * (1 - 0.25 * def * w)]; };
      this.mesh = addMesh(new Surf([revGrid(full2, 0, phiLen, def1)]), bodyMat, true);
      if (s.mat !== 'lead') addMesh(new Surf([revGrid([[0, 0.02], [R * 0.9, 0.02]], 0, phiLen)]), M.lead, true);
    }
    if (cut) this.addSection(s, R, hp);
    this.update(0, 0, true);
  };

  // flat section faces for the cut-away (jacket band, lead core, steel core)
  Bullet.prototype.addSection = function (s, R, hp) {
    var self = this, M = this.mats, prof = bodyProfile(s), band = 0.45;
    var outer = prof.map(function (p) { return new THREE.Vector2(p[0], p[1] - self.yoff); });
    var inner = prof.slice().reverse().map(function (p) { return new THREE.Vector2(Math.max(0, p[0] - band), p[1] - self.yoff - (p[1] > s.L - 1 ? band : 0)); });
    var shapeBand = new THREE.Shape(outer.concat(inner));
    var shapes = [[shapeBand, s.mat === 'lead' ? M.lead : M[s.mat]], [new THREE.Shape(inner.slice().reverse()), M.core]];
    if (s.core === 'steel') {
      var yo = s.L - s.Lo, sc = [[0, 3.5], [R * 0.62, 3.5], [R * 0.62, yo + 2], [0, yo + 7.5]].map(function (p) { return new THREE.Vector2(p[0], p[1] - self.yoff); });
      shapes.push([new THREE.Shape(sc), M.dark]);
    }
    [-Math.PI / 2, Math.PI].forEach(function (rot) {
      shapes.forEach(function (sh, k) {
        var m = new THREE.Mesh(new THREE.ShapeGeometry(sh[0]), sh[1]); m.rotation.y = rot; m.position.y = 0; m.renderOrder = k; self.group.add(m); self.extra.push(m);
      });
    });
  };

  Bullet.prototype.update = function (def, split, force) {
    split = split || 0;
    if (!force && Math.abs(def - this._def) < 0.004 && Math.abs(split - this._split) < 0.004) return;
    this._def = def; this._split = split;
    var yoff = this.yoff, i;
    for (i = 0; i < this.surfs.length; i++) this.surfs[i].fill(def, yoff);
    if (this.pieceB) {
      this.pieceB.position.set(0.5 * split, 2.2 * split, 0); this.pieceB.rotation.z = -0.5 * split;
      this.mesh.position.set(-0.3 * split, -0.8 * split, 0); this.mesh.rotation.z = 0.25 * split;
      if (this.ring) this.ring.position.y = this.spec.can - yoff + 0.6 * split;
    }
  };
  App.SPECS = SPECS;
  App.Bullet = Bullet;
})(window.App = window.App || {});
