/* Microstructure inset: picture-in-picture view (scissor) of cortical plates, diploe trabeculae, oblique cracks and the spalled cone. */
(function (App) {
  var S = App.sim;
  var M = App.micro = { on: false, rect: null };

  M.init = function (renderer) {
    M.renderer = renderer;
    var sc = M.scene = new THREE.Scene(), i, j;
    sc.background = new THREE.Color(0x0b0e13);
    sc.add(new THREE.HemisphereLight(0xffffff, 0x303640, 1.0));
    var dl = new THREE.DirectionalLight(0xffffff, 0.8); dl.position.set(10, 20, 30); sc.add(dl);
    M.cam = new THREE.PerspectiveCamera(35, 380 / 280, 1, 200); M.cam.position.set(2, 3, 52); M.cam.lookAt(0, 0, 0);
    var root = M.root = new THREE.Group(); sc.add(root);
    var plateMat = new THREE.MeshStandardMaterial({ color: 0xf1e8d2, map: App.tex.table, roughness: 0.85 });
    // near plate (contact side) and far plate (free face). Entry orientation: contact on top, travel downward (-y).
    var near = new THREE.Mesh(new THREE.BoxGeometry(24, 3, 10), plateMat); near.position.set(0, 5.5, 0); root.add(near);
    var far = new THREE.Mesh(new THREE.BoxGeometry(16, 2, 10), plateMat); far.position.set(4, -5, 0); root.add(far);
    M.far = far;
    // spalled cone: chunks that detach from the free face next to the hole edge (x from -12 to -8)
    M.chunks = [];
    var r = S.rng(31);
    for (i = 0; i < 6; i++) {
      var g = new THREE.BoxGeometry(1.4 + r() * 0.8, 1.4 + r() * 0.5, 3.4 + r() * 1.2), p = g.attributes.position;
      for (j = 0; j < p.count; j++) p.setXYZ(j, p.getX(j) + (r() - 0.5) * 0.3, p.getY(j) + (r() - 0.5) * 0.3, p.getZ(j) + (r() - 0.5) * 0.3);
      var m = new THREE.Mesh(g, plateMat.clone()); m.material.transparent = true;
      m.userData.home = new THREE.Vector3(-11.2 + (i % 3) * 1.45, -5 + (i < 3 ? 0.3 : -0.3), -3.2 + Math.floor(i / 3) * 3.2 + (i % 2) * 0.6);
      m.userData.vel = new THREE.Vector3(r() * 2 - 1, -(4 + r() * 4), (r() - 0.5) * 3); m.userData.spin = new THREE.Vector3(r() * 3, r() * 3, r() * 3);
      m.position.copy(m.userData.home); root.add(m); M.chunks.push(m);
    }
    // trabeculae: jittered 3D lattice between the plates
    var nodes = [], nx = 6, ny = 3, nz = 4;
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) for (var k = 0; k < nz; k++) nodes.push(new THREE.Vector3(-9.5 + i * 4 + (r() - 0.5) * 1.6, -2.8 + j * 2.8 + (r() - 0.5) * 1.0, -3.6 + k * 2.4 + (r() - 0.5) * 1.2));
    M.nodes = nodes;
    var links = [];
    function idx(a, b, c) { return (a * ny + b) * nz + c; }
    for (i = 0; i < nx; i++) for (j = 0; j < ny; j++) for (k = 0; k < nz; k++) {
      var a = nodes[idx(i, j, k)];
      if (i + 1 < nx && r() < 0.85) links.push([a, nodes[idx(i + 1, j, k)]]);
      if (j + 1 < ny && r() < 0.9) links.push([a, nodes[idx(i, j + 1, k)]]);
      if (k + 1 < nz && r() < 0.8) links.push([a, nodes[idx(i, j, k + 1)]]);
      if (i + 1 < nx && j + 1 < ny && r() < 0.45) links.push([a, nodes[idx(i + 1, j + 1, k)]]);
    }
    var trab = new THREE.InstancedMesh(new THREE.CylinderGeometry(0.17, 0.17, 1, 6), new THREE.MeshStandardMaterial({ color: 0xc9a77c, roughness: 0.8 }), links.length);
    var mm = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), dv = new THREE.Vector3(), mid = new THREE.Vector3(), sc1 = new THREE.Vector3();
    links.forEach(function (l, n) {
      dv.subVectors(l[1], l[0]); var len = dv.length(); mid.addVectors(l[0], l[1]).multiplyScalar(0.5); q.setFromUnitVectors(up, dv.normalize()); sc1.set(1, len, 1); mm.compose(mid, q, sc1); trab.setMatrixAt(n, mm);
    });
    M.trab = trab; root.add(trab);
    // oblique cracks: snap each polyline to trabecula nodes, travelling from the hole edge toward the free face
    M.crackSegs = []; var cracks = [];
    for (i = 0; i < 5; i++) {
      var z = -4 + i * 2, pts = [], cx = -12, cy = 3.2 + (r() - 0.5) * 1.0, np = 12;
      for (j = 0; j <= np; j++) {
        var f = j / np; var px = -12 + 5.0 * f + (r() - 0.5) * 0.9, py = 3.2 - 9.4 * f + (r() - 0.5) * 0.5, best = null, bd = 1e9;
        nodes.forEach(function (nd) { var dd = Math.abs(nd.z - z) < 1.6 ? Math.hypot(nd.x - px, nd.y - py) : 1e9; if (dd < bd) { bd = dd; best = nd; } });
        if (best && bd < 1.5 && j > 1 && j < np) { px = best.x; py = best.y; }
        pts.push(new THREE.Vector3(px, py, 5.06 + (i % 2) * 0.02));
      }
      for (j = 0; j < np; j++) { cracks.push(pts[j], pts[j + 1]); }
    }
    var cg = new THREE.BufferGeometry().setFromPoints(cracks);
    M.crack = new THREE.LineSegments(cg, new THREE.LineBasicMaterial({ color: 0xffffff })); M.crackTotal = cracks.length; M.crack.frustumCulled = false; root.add(M.crack);
    // force arrows
    M.arC = new THREE.ArrowHelper(new THREE.Vector3(0, -1, 0), new THREE.Vector3(8, 11, 5.5), 4, 0xff5533, 1.4, 1.0);
    M.arT = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(3, -7.2, 5.5), 4, 0x3aa0ff, 1.4, 1.0);
    root.add(M.arC, M.arT);
  };

  // d: derived params of the shown mode, t: time, q: spall progress
  M.update = function (d, t, q) {
    var root = M.root, i, flip = d.exit;
    root.scale.y = flip ? -1 : 1;
    M.crack.geometry.setDrawRange(0, Math.floor(M.crackTotal * S.clamp01(q * 1.15) / 2) * 2);
    var det = S.smooth(0.6, 1.0, q);
    for (i = 0; i < M.chunks.length; i++) {
      var c = M.chunks[i], u = c.userData; c.position.copy(u.home).addScaledVector(u.vel, det * 3.5);
      c.rotation.set(u.spin.x * det, u.spin.y * det, u.spin.z * det); c.material.opacity = 1 - 0.85 * S.smooth(0.85, 1.0, q);
    }
    M.arC.visible = t >= 0.28 && t < 0.54; M.arT.visible = t >= 0.54 && t < 0.84;
    M.cam.position.x = 2 + (App.state.reduce ? 0 : Math.sin(t * 20) * 4);
    M.cam.lookAt(0, 0, 0);
  };

  M.render = function (rect, W, H) {
    var r = M.renderer;
    r.setScissorTest(true); r.setViewport(rect.left, H - rect.bottom, rect.width, rect.height); r.setScissor(rect.left, H - rect.bottom, rect.width, rect.height);
    r.render(M.scene, M.cam);
    r.setScissorTest(false); r.setViewport(0, 0, W, H);
  };
})(window.App = window.App || {});
