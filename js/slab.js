(function (App) {
  var D = App.data, S = App.sim;
  var STRESS_VS = 'varying vec2 vXY; void main(){ vXY = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }';
  var STRESS_FS = [
    'uniform float uMode,uT,uTT,uR0,uSc,uTan,uQ,uP,uShow,uEmph,uSin,uTanT,uAx; varying vec2 vXY;',
    'void main(){',
    ' float y=vXY.y;',
    ' float s = uMode>0.5 ? y+uTT : -y;',
    ' if(s<0.0||s>uTT) discard;',
    ' float hr=0.0;',
    ' if(s<=uP){ if(s<=uSc) hr=uR0; else { float rc=uR0*1.08; float cone=uR0+(s-uSc)*uTan; float ql=clamp(uQ*1.4-(1.0-clamp((s-uSc)/(uTT-uSc),0.0,1.0))*0.4,0.0,1.0); hr=rc+max(0.0,cone-rc)*ql; } }',
    ' float cxo = s*uTanT + (hr>0.0 ? (hr-uR0)*0.6*uSin : 0.0); float x = abs(vXY.x-cxo)/uAx; if(x<hr) discard;',
    ' float wC = smoothstep(0.27,0.30,uT)*(1.0-smoothstep(0.52,0.56,uT));',
    ' float wT = smoothstep(0.54,0.57,uT)*(1.0-smoothstep(0.80,0.88,uT));',
    ' float wS = smoothstep(0.27,0.30,uT)*(1.0-smoothstep(0.44,0.47,uT));',
    ' float dx=(x-uR0*1.3)/(uR0*1.2+0.5), ds=(s-uP-0.5)/1.2;',
    ' float c = exp(-(dx*dx+ds*ds))*wC;',
    ' float sh = exp(-pow((x-uR0)/0.5,2.0))*step(s,uP)*step(uP-1.6,s)*wS;',
    ' float rf = uR0+(uTT-uSc)*uTan;',
    ' float tz = exp(-pow((uTT-s)/0.9,2.0))*(1.0-smoothstep(rf,rf+2.0,x))*wT*(0.65+0.35*sin(uT*90.0));',
    ' float sum=c+tz+sh; if(sum<0.02) discard;',
    ' vec3 col=(c*vec3(1.0,0.28,0.2)+tz*vec3(0.2,0.6,1.0)+sh*vec3(1.0,0.9,0.2))/sum;',
    ' gl_FragColor=vec4(col, clamp(sum,0.0,1.0)*0.8*uShow*(1.0+uEmph*0.4));',
    '}'
  ].join('\n');

  var WAVE_FS = [
    'uniform float uMode,uT,uTT,uR0,uSc,uTan,uQ,uP,uShow,uKE,uSin,uTanT,uAx; varying vec2 vXY;',
    'void main(){',
    ' float y=vXY.y; float s = uMode>0.5 ? y+uTT : -y;',
    ' if(s<0.0||s>uTT) discard;',
    ' float hr=0.0;',
    ' if(s<=uP){ if(s<=uSc) hr=uR0; else { float rc=uR0*1.08; float cone=uR0+(s-uSc)*uTan; float ql=clamp(uQ*1.4-(1.0-clamp((s-uSc)/(uTT-uSc),0.0,1.0))*0.4,0.0,1.0); hr=rc+max(0.0,cone-rc)*ql; } }',
    ' float cxo = s*uTanT + (hr>0.0 ? (hr-uR0)*0.6*uSin : 0.0); float x = abs(vXY.x-cxo)/uAx; if(x<hr) discard;',
    ' float tau=clamp((uT-0.28)/0.22,0.0,1.0); float front=tau*2.5*uTT;',
    ' float A=0.9+0.25*log(uKE/500.0)/2.302585;',
    ' float r1=length(vec2(x,s)); float si=A*exp(-pow((r1-front)/1.1,2.0))/(1.0+0.15*r1);',
    ' float r2=length(vec2(x,2.0*uTT-s)); float sr=-0.6*A*exp(-pow((r2-front)/1.1,2.0))/(1.0+0.15*r2);',
    ' float sg=si+sr; float a=min(1.0,abs(sg))*0.85*(1.0-smoothstep(0.50,0.62,uT))*uShow; if(a<0.03) discard;',
    ' vec3 col = sg>0.0 ? vec3(1.0,0.3,0.22) : vec3(0.2,0.6,1.0);',
    ' if(sg<-0.55) col=mix(col,vec3(1.0),0.5+0.5*sin(uT*200.0));',
    ' gl_FragColor=vec4(col,a);',
    '}'
  ].join('\n');

  function SlabView(mode, planes) {
    var self = this, W = D.W;
    this.mode = mode; this.d = null; this.o = {};
    this.group = new THREE.Group();
    this.solids = {};
    var maps = { skin: App.tex.skin, outer: App.tex.table, diploe: App.tex.diploe, inner: App.tex.table, dura: null, brain: App.tex.brain };
    D.layerKeys.forEach(function (k) {
      var bone = k === 'outer' || k === 'diploe' || k === 'inner';
      var ps = new App.ProfileSolid({ color: D.colors[k], map: maps[k], W: W, N: bone ? 14 : (k === 'brain' ? 2 : 8), planes: planes });
      ps.holeCb = function (y, so) { return S.holeShape(k, y, self.d, self.o, so); };
      ps.cap.userData.layer = k; self.solids[k] = ps; self.group.add(ps.group);
    });
    this.solids.skin.group.visible = true;
    // brain channel
    this.channel = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 16, 1, true), new THREE.MeshBasicMaterial({ color: 0x4a2530, transparent: true, opacity: 0.85, side: THREE.DoubleSide, clippingPlanes: planes }));
    this.channel.position.z = 0.04; this.group.add(this.channel);
    // temporary cavity
    this.cav = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), new THREE.MeshBasicMaterial({ color: 0xffb3c1, transparent: true, opacity: 0.33, depthWrite: false, clippingPlanes: planes }));
    this.group.add(this.cav);
    // bullet
    this.bullet = new App.Bullet(); this.group.add(this.bullet.group);
    // trail (fades to black with additive blending) and Mach cone, only while the bullet flies through air
    var tp = new Float32Array(24 * 3), tc = new Float32Array(24 * 3), k2;
    for (k2 = 0; k2 < 24; k2++) { var f = 1 - k2 / 23; tc[k2 * 3] = 1 * f; tc[k2 * 3 + 1] = 0.75 * f; tc[k2 * 3 + 2] = 0.45 * f; }
    var tg = new THREE.BufferGeometry(); tg.setAttribute('position', new THREE.BufferAttribute(tp, 3).setUsage(THREE.DynamicDrawUsage)); tg.setAttribute('color', new THREE.BufferAttribute(tc, 3));
    tg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    this.trail = new THREE.Line(tg, new THREE.LineBasicMaterial({ vertexColors: true, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false }));
    this.trail.frustumCulled = false; this.trail.visible = false; this.group.add(this.trail);
    this.mach = new THREE.Mesh(new THREE.ConeGeometry(1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x9fd8ff, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false }));
    this.mach.visible = false; this.group.add(this.mach);
    // stress overlay
    var U = this.U = { uMode: { value: mode === 'exit' ? 1 : 0 }, uT: { value: 0 }, uTT: { value: 6 }, uR0: { value: 4.5 }, uSc: { value: 1.8 }, uTan: { value: 0.4 }, uQ: { value: 0 }, uP: { value: 0 }, uShow: { value: 1 }, uEmph: { value: 0 }, uSin: { value: 0 }, uTanT: { value: 0 }, uAx: { value: 1 } };
    this.stress = new THREE.Mesh(new THREE.PlaneGeometry(2 * W, 12), new THREE.ShaderMaterial({ uniforms: U, vertexShader: STRESS_VS, fragmentShader: STRESS_FS, transparent: true, depthTest: false, depthWrite: false }));
    this.stress.position.set(0, -4.5, 0.08); this.stress.renderOrder = 10;
    // the plane geometry is centred, shader needs lab coords -> bake offset into geometry
    this.stress.geometry.translate(0, 0, 0); this.stress.position.set(0, 0, 0.08);
    var pg = this.stress.geometry.attributes.position; for (var i = 0; i < pg.count; i++) pg.setY(i, pg.getY(i) - 4.5);
    this.group.add(this.stress);
    // chips
    this.maxChips = 120;
    this.chips = new THREE.InstancedMesh(new THREE.TetrahedronGeometry(0.4), new THREE.MeshStandardMaterial({ color: 0xf0e6cf, roughness: 0.8, flatShading: true }), this.maxChips);
    this.chips.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.chips.frustumCulled = false;
    this.group.add(this.chips);
    // wave overlay (same hole mask as the stress overlay)
    var WU = this.WU = { uMode: U.uMode, uT: { value: 0 }, uTT: U.uTT, uR0: U.uR0, uSc: U.uSc, uTan: U.uTan, uQ: U.uQ, uP: U.uP, uShow: { value: 1 }, uKE: { value: 500 }, uSin: U.uSin, uTanT: U.uTanT, uAx: U.uAx };
    this.wave = new THREE.Mesh(this.stress.geometry, new THREE.ShaderMaterial({ uniforms: WU, vertexShader: STRESS_VS, fragmentShader: WAVE_FS, transparent: true, depthTest: false, depthWrite: false }));
    this.wave.position.set(0, 0, 0.09); this.wave.renderOrder = 11; this.wave.visible = false; this.group.add(this.wave);
    // force glyphs: instanced arrows (compression pairs squeeze, tension pairs pull apart)
    var shaftG = new THREE.CylinderGeometry(0.13, 0.13, 1, 6); shaftG.translate(0, 0.5, 0);
    var headG = new THREE.ConeGeometry(0.42, 1, 10); headG.translate(0, 0.5, 0);
    this.gMax = 40;
    this.gShaft = new THREE.InstancedMesh(shaftG, new THREE.MeshBasicMaterial({ color: 0xffffff }), this.gMax);
    this.gHead = new THREE.InstancedMesh(headG, new THREE.MeshBasicMaterial({ color: 0xffffff }), this.gMax);
    this.gShaft.frustumCulled = this.gHead.frustumCulled = false; this.gShaft.count = this.gHead.count = 0;
    var wc = new THREE.Color(0xffffff); for (var gi0 = 0; gi0 < this.gMax; gi0++) { this.gShaft.setColorAt(gi0, wc); this.gHead.setColorAt(gi0, wc); }   // creates instanceColor before the first compile
    this.gShaft.renderOrder = this.gHead.renderOrder = 12; this.gShaft.position.z = this.gHead.position.z = 0.7;
    this.group.add(this.gShaft, this.gHead); this.gi = 0; this._col = new THREE.Color();
    // contact shot: muzzle, gas pocket (Hoffmann's mine chamber), Benassi soot ring and sooted hole sleeve
    var mp = [new THREE.Vector2(1, 0), new THREE.Vector2(1.5, 0), new THREE.Vector2(1.5, 30), new THREE.Vector2(1, 30), new THREE.Vector2(1, 0)];
    this.muzzle = new THREE.Mesh(new THREE.LatheGeometry(mp, 32), new THREE.MeshStandardMaterial({ color: 0x5d6670, metalness: 0.8, roughness: 0.4, side: THREE.DoubleSide, clippingPlanes: planes }));
    this.muzzle.visible = false; this.muzzle.frustumCulled = false; this.group.add(this.muzzle);
    this.gasMesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 12), new THREE.MeshBasicMaterial({ color: 0x6b6f75, transparent: true, opacity: 0.45, depthWrite: false, clippingPlanes: planes }));
    this.gasMesh.visible = false; this.group.add(this.gasMesh);
    this.benassi = new THREE.Mesh(new THREE.RingGeometry(1, 2.6, 48), new THREE.MeshBasicMaterial({ color: 0x141414, transparent: true, opacity: 0.75, side: THREE.DoubleSide, clippingPlanes: planes }));
    this.benassi.rotation.x = -Math.PI / 2; this.benassi.position.y = 0.03; this.benassi.visible = false; this.group.add(this.benassi);
    this.sleeve = new THREE.Mesh(new THREE.CylinderGeometry(1, 1, 1, 24, 1, true), new THREE.MeshBasicMaterial({ color: 0x1a1a1a, transparent: true, opacity: 0.8, side: THREE.DoubleSide, clippingPlanes: planes }));
    this.sleeve.visible = false; this.group.add(this.sleeve);
    // bending fibre lines (near face = red, bunched; far face = blue, spread)
    function fiber(hex) { var g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(30 * 2 * 3), 3).setUsage(THREE.DynamicDrawUsage)); g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 100); var l = new THREE.LineSegments(g, new THREE.LineBasicMaterial({ color: hex, depthTest: false })); l.visible = false; l.renderOrder = 12; l.position.z = 0.7; l.frustumCulled = false; self.group.add(l); return l; }
    this.fiberNear = fiber(0xff5a40); this.fiberFar = fiber(0x4aa8ff);
    // bone dust puff at the moment the nose meets the bone (analytic, deterministic)
    var dg = new THREE.BufferGeometry(); dg.setAttribute('position', new THREE.BufferAttribute(new Float32Array(60 * 3), 3).setUsage(THREE.DynamicDrawUsage)); dg.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 200);
    this.dust = new THREE.Points(dg, new THREE.PointsMaterial({ color: 0xf0e6cf, size: 0.5, transparent: true, opacity: 1, depthWrite: false }));
    this.dust.frustumCulled = false; this.dust.visible = false; this.group.add(this.dust);
    var dr = S.rng(55); this.dustDir = [];
    for (var di = 0; di < 60; di++) { var da = dr() * 6.283, db = dr() * 1.2, dsp = 6 + dr() * 10; this.dustDir.push([Math.cos(da) * Math.sin(db) * dsp, Math.cos(db) * dsp, Math.sin(da) * Math.sin(db) * dsp]); }
    this.ov = { stress: true, forces: true };
    // arrows
    function arrow(hex) { var a = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(), 4, hex, 1.4, 0.9); a.visible = false; self.group.add(a); return a; }
    this.arForce = arrow(0xff5533); this.arSpall = arrow(0x4aa8ff); this.arP1 = arrow(0xffc0cb); this.arP2 = arrow(0xffc0cb);
    // scratch
    this._m = new THREE.Matrix4(); this._q = new THREE.Quaternion(); this._e = new THREE.Euler(); this._v = new THREE.Vector3(); this._s = new THREE.Vector3(); this._c = { x: 0, y: 0, z: 0, s: 0, r: 0 };
  }

  SlabView.prototype.setArrow = function (i, ox, oy, oz, dx, dy, dz, len, hex) {
    if (i >= this.gMax) return;
    var q = this._q, v = this._v, s = this._s, m = this._m, hl = Math.min(1.3, len * 0.45);
    v.set(dx, dy, dz).normalize(); q.setFromUnitVectors(this._up || (this._up = new THREE.Vector3(0, 1, 0)), v);
    s.set(1, len - hl, 1); this._p = this._p || new THREE.Vector3(); this._p.set(ox, oy, oz); m.compose(this._p, q, s); this.gShaft.setMatrixAt(i, m);
    this._p.set(ox + v.x * (len - hl), oy + v.y * (len - hl), oz + v.z * (len - hl)); s.set(1, hl, 1); m.compose(this._p, q, s); this.gHead.setMatrixAt(i, m);
    this._col.setHex(hex); this.gShaft.setColorAt(i, this._col); this.gHead.setColorAt(i, this._col);
  };

  SlabView.prototype.setParams = function (d) {
    this.d = d;
    var U = this.U; U.uSin.value = d.sinT; U.uTanT.value = d.tanT; U.uAx.value = d.ax; U.uTT.value = d.T; U.uR0.value = d.r0; U.uSc.value = d.sc; U.uTan.value = d.tan;
    this.bullet.setAmmo(d.P.ammo, d.P.hp, d.P.cut); this.bullet.update(0, 0, true);
    var t0 = 1, t1 = 0; for (var i = 0; i < d.chips.length; i++) { if (d.chips[i].ts < t0) t0 = d.chips[i].ts; if (d.chips[i].ts > t1) t1 = d.chips[i].ts; }
    this.chipT0 = t0; this.chipT1 = t1 + 2.0 / D.TOTAL_SEC; this._bkey = '';
  };

  SlabView.prototype.update = function (t) {
    var d = this.d, o = this.o, U = this.U, s, k;
    S.evaluate(t, d, o);
    // sag
    var sk = this.solids.skin; sk.sagAmp = o.skinSag; sk.sagSigma = Math.max(3 * d.r0, 2);
    var ou = this.solids.outer; ou.sagAmp = o.vaultBulge; ou.sagSigma = 9;
    var ov = this.ov, bendAmp = ov.bend ? (d.exit ? 1 : -1) * 1.6 * S.smooth(0.28, 0.45, t) * (1 - S.smooth(0.6, 0.66, t)) : 0;
    for (k = 0; k < D.layerKeys.length; k++) {
      var key = D.layerKeys[k], sol = this.solids[key];
      sol.bendAmp = key === 'brain' ? 0 : bendAmp + (key === 'skin' ? o.gas : 0); sol.bendSigma = 9;
      sol.update(d.y[key][0], d.y[key][1]);
    }
    // bullet
    var b = this.bullet; b.update(o.def, o.split);
    var L = b.L, bg = b.group;
    var th = d.theta, sT = d.sinT, cT = Math.cos(th), noseX = o.p * d.tanT;
    if (d.exit) { bg.rotation.z = -th + o.yaw; bg.position.set(noseX - sT * L / 2, o.yBullet - cT * L / 2, 0); }
    else { bg.rotation.z = Math.PI + th + o.yaw; bg.position.set(noseX - sT * L / 2, o.yBullet + cT * L / 2, 0); }
    // contact shot parts
    var cont = d.contact;
    this.muzzle.visible = cont && t < 0.30;
    if (this.muzzle.visible) { var rin = d.cal / 2 + 0.25; this.muzzle.scale.set(rin, 1, rin); this.muzzle.position.set(0, d.S + o.gas, 0); }
    this.gasMesh.visible = cont && o.gas > 0.05;
    if (this.gasMesh.visible) { this.gasMesh.scale.set(7, o.gas / 2 + 0.05, 7); this.gasMesh.position.set(0, o.gas / 2, 0); }
    this.benassi.visible = cont && t >= 0.30;
    this.sleeve.visible = cont && t >= 0.30 && o.p > d.To;
    if (this.benassi.visible) { this.benassi.scale.set(d.r0, d.r0, 1); this.benassi.material.opacity = 0.75 * S.smooth(0.30, 0.40, t); }
    if (this.sleeve.visible) { this.sleeve.scale.set(d.r0 * 0.98, d.To, d.r0 * 0.98); this.sleeve.position.set(0, -d.To / 2, 0); }
    bg.visible = !(d.exit && o.yBullet > d.T + d.S + 6) && !(!d.exit && t < 0.0);
    // trail + Mach cone (air only)
    var inAir = d.exit ? (o.yBullet > d.S + 1) : (o.yBullet > d.S - 1), vNow = d.v * o.speedK;
    this.trail.visible = inAir && o.p > -17;
    if (this.trail.visible) {
      var tpos = this.trail.geometry.attributes.position.array, len = Math.min(25, Math.abs(o.p + 18)), q2;
      for (q2 = 0; q2 < 24; q2++) { tpos[q2 * 3] = 0; tpos[q2 * 3 + 1] = o.yBullet - o.dirY * len * q2 / 23; tpos[q2 * 3 + 2] = 0; }
      this.trail.geometry.attributes.position.needsUpdate = true;
    }
    var mc = this.mach, mu = vNow > 343 ? Math.asin(343 / vNow) : 0;
    mc.visible = inAir && mu > 0 && o.p > -17;
    if (mc.visible) {
      var rad = Math.min(22, 18 * Math.tan(mu));
      mc.scale.set(rad, 18, rad); mc.position.set(0, o.yBullet - o.dirY * 9, 0); mc.rotation.z = d.exit ? 0 : Math.PI;
    }
    // channel
    var bt = -d.T - d.DU, bb = bt - d.BR, ytop, ybot, ch = this.channel;
    if (!d.exit) { ytop = bt; ybot = Math.max(o.yBullet, bb); } else { ybot = bb; ytop = Math.min(o.yBullet, bt); }
    var len = ytop - ybot;
    if (len > 0.05) {
      var xt = (d.exit ? ytop + d.T : -ytop) * d.tanT, xb = (d.exit ? ybot + d.T : -ybot) * d.tanT, rl = Math.hypot(xt - xb, len);
      ch.visible = true; ch.scale.set(d.r0 * 0.9, rl, d.r0 * 0.9); ch.position.set((xt + xb) / 2, (ytop + ybot) / 2, ch.position.z); ch.rotation.z = Math.atan2(-(xt - xb), len);
    } else ch.visible = false;
    // cavity
    if (o.cavR > 0.05) { this.cav.visible = true; this.cav.scale.setScalar(o.cavR); this.cav.position.set((d.exit ? o.cavY + d.T : -o.cavY) * d.tanT, o.cavY, 0); } else this.cav.visible = false;
    // stress uniforms
    U.uT.value = t; U.uQ.value = o.q; U.uP.value = o.p;
    this.stress.visible = U.uShow.value > 0 && t >= 0.26 && t <= 0.9;
    // chips
    var n = d.chips.length, cc = this._c, m = this._m, q = this._q, e = this._e, v = this._v, sc = this._s;
    var chipsLive = this.chipsOn !== false && t >= this.chipT0 && t <= this.chipT1;
    this.chips.visible = chipsLive; this.chips.count = n;
    for (var i = 0; chipsLive && i < n; i++) {
      if (this.chipsOn !== false && S.chipPos(d.chips[i], d, t, cc)) {
        e.set(cc.r, cc.r * 0.7, 0); q.setFromEuler(e); v.set(cc.x, cc.y, cc.z); sc.set(cc.s, cc.s, cc.s);
      } else { v.set(0, 0, 0); sc.set(0, 0, 0); q.identity(); }
      m.compose(v, q, sc); this.chips.setMatrixAt(i, m);
    }
    this.chips.instanceMatrix.needsUpdate = true;
    // dust puff
    var dtau = (t - 0.28) * D.TOTAL_SEC, dOn = this.dustOn !== false && dtau >= 0 && dtau < 0.7;
    this.dust.visible = dOn;
    if (dOn) {
      var dp = this.dust.geometry.attributes.position.array, yc0 = d.exit ? -d.T : 0, vy = -o.dirY, dk;
      for (dk = 0; dk < 60; dk++) { var dd = this.dustDir[dk]; dp[dk * 3] = dd[0] * dtau + (d.exit ? 0 : o.p * d.tanT * 0); dp[dk * 3 + 1] = yc0 + vy * Math.abs(dd[1]) * dtau; dp[dk * 3 + 2] = dd[2] * dtau; }
      this.dust.geometry.attributes.position.needsUpdate = true; this.dust.material.opacity = 1 - dtau / 0.7;
    }
    // wave overlay
    var WU = this.WU; WU.uT.value = t; WU.uKE.value = d.KE; WU.uShow.value = 1;
    this.wave.visible = !!ov.waves && t >= 0.27 && t <= 0.64;
    // bending fibre lines
    var nb = Math.abs(bendAmp) / 1.6, showFib = !!ov.bend && nb > 0.01;
    this.fiberNear.visible = this.fiberFar.visible = showFib;
    if (showFib) {
      var yNear = d.exit ? -d.T + 0.35 : -0.35, yFar = d.exit ? -0.35 : -d.T + 0.35, fi, ff;
      for (ff = 0; ff < 2; ff++) {
        var line = ff ? this.fiberFar : this.fiberNear, yy = ff ? yFar : yNear, fp = line.geometry.attributes.position.array, sc2 = ff ? 1 + 0.25 * nb : 1 - 0.25 * nb, ss = ff ? d.T - 0.35 : 0.35, rh = S.holeBone(ss, d, o) + 0.3, oo = 0;
        for (fi = 0; fi < 30; fi++) {
          var xa = (fi - 14.5) * 1.1 * sc2, xb = ((fi - 14.5) * 1.1 + 0.7) * sc2, skip = Math.abs(xa) < rh || Math.abs(xb) < rh;
          if (skip) { xa = xb = 0; }
          fp[oo++] = xa; fp[oo++] = skip ? 0 : yy + bendAmp * Math.exp(-xa * xa / 81); fp[oo++] = 0;
          fp[oo++] = xb; fp[oo++] = skip ? 0 : yy + bendAmp * Math.exp(-xb * xb / 81); fp[oo++] = 0;
        }
        line.geometry.attributes.position.needsUpdate = true;
      }
    }
    // force glyphs
    var gi = 0, dirG = o.dirY;
    if (ov.forces && t >= 0.28 && t < 0.54) {                         // compression: pairs squeezing along the travel axis
      var sN = Math.max(0.5, Math.min(d.T - 0.5, o.p + 0.8)), yc = d.exit ? sN - d.T : -sN, cols = [1.5, 3.5, 5.5], c1, sg;
      for (c1 = 0; c1 < 3; c1++) for (sg = -1; sg <= 1; sg += 2) {
        var xg = sg * (d.r0 + cols[c1]);
        this.setArrow(gi++, xg, yc + 3.0, 0, 0, -1, 0, 2.3, 0xff5533); this.setArrow(gi++, xg, yc - 3.0, 0, 0, 1, 0, 2.3, 0xff5533);
      }
    }
    if (ov.forces && t >= 0.54 && t < 0.84) {                         // tension: pairs pulling apart along the free face
      var yf2 = d.exit ? -0.5 : -d.T + 0.5, pulse = 0.7 + 0.3 * Math.sin(t * 60), c2, sg2, span = d.rFar + 3 - (d.r0 + 1);
      for (c2 = 0; c2 < 4; c2++) for (sg2 = -1; sg2 <= 1; sg2 += 2) {
        var xk = sg2 * (d.r0 + 1 + c2 * span / 3);
        this.setArrow(gi++, xk - 0.25, yf2, 0, -1, 0, 0, 1.5 * pulse, 0x3aa0ff); this.setArrow(gi++, xk + 0.25, yf2, 0, 1, 0, 0, 1.5 * pulse, 0x3aa0ff);
      }
    }
    this.gShaft.count = this.gHead.count = gi; this.gShaft.instanceMatrix.needsUpdate = this.gHead.instanceMatrix.needsUpdate = true;
    if (this.gShaft.instanceColor) { this.gShaft.instanceColor.needsUpdate = this.gHead.instanceColor.needsUpdate = true; }
    // arrows
    var dir = o.dirY, st = o.stage;
    var showF = ov.forces && (t >= 0.28 && t < 0.54);
    this.arForce.visible = showF;
    if (showF) { this.arForce.position.set(d.r0 + 3.2, o.yBullet - dir * 4.5, 0.6); this.arForce.setDirection(v.set(0, dir, 0)); this.arForce.setLength(4, 1.4, 0.9); }
    this.arSpall.visible = false;
    var showP = ov.forces && d.exit && t >= 0.12 && t < 0.46;
    this.arP1.visible = this.arP2.visible = showP;
    if (showP) {
      var yb = -d.T - d.DU - 3;
      this.arP1.position.set(-7, yb, 0.6); this.arP1.setDirection(v.set(0, 1, 0)); this.arP1.setLength(4.5, 1.4, 0.9);
      this.arP2.position.set(7, yb, 0.6); this.arP2.setDirection(v.set(0, 1, 0)); this.arP2.setLength(4.5, 1.4, 0.9);
    }
    return o;
  };

  App.SlabView = SlabView;
})(window.App = window.App || {});
