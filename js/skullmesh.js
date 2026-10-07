/* Loads the embedded CC0 skull (base64 GLB in js/skullmodel.js), merges and normalises it. Falls back silently (console.info) if anything fails. */
(function (App) {
  // Euler rotation (radians) applied to the model so that the face looks toward +X and the top toward +Y. Tuned from screenshots.
  var SKULL_ROT = [0, Math.PI / 2, 0];
  var TARGET_LEN = 2.10;                            // front-back length in skull units (same as the procedural ellipsoid)
  var CRANIUM_Y = 0.62;                             // fraction of the model height (from the jaw) where the cranial centre sits

  function build(gltf) {
    var geoms = [];
    gltf.scene.updateMatrixWorld(true);
    gltf.scene.traverse(function (o) {
      if (!o.isMesh) return;
      var g = o.geometry.clone(); g.applyMatrix4(o.matrixWorld);
      Object.keys(g.attributes).forEach(function (k) { if (k !== 'position' && k !== 'normal') g.deleteAttribute(k); });
      geoms.push(g);
    });
    if (!geoms.length) return null;
    var geom = geoms.length === 1 ? geoms[0] : THREE.BufferGeometryUtils.mergeBufferGeometries(geoms, false);
    if (!geom) return null;
    var rot = App.skullRot || SKULL_ROT;
    geom.applyMatrix4(new THREE.Matrix4().makeRotationFromEuler(new THREE.Euler(rot[0], rot[1], rot[2])));
    geom.computeBoundingBox(); var bb = geom.boundingBox, size = new THREE.Vector3(); bb.getSize(size);
    var len = Math.max(size.x, size.z), s = TARGET_LEN / len;
    var cx = (bb.min.x + bb.max.x) / 2, cz = (bb.min.z + bb.max.z) / 2, cy = bb.min.y + size.y * CRANIUM_Y;
    geom.translate(-cx, -cy, -cz); geom.scale(s, s, s);
    // copy into plain Float32 attributes (glTF gives interleaved buffers) and recompute smooth normals
    var pa = geom.attributes.position, cnt = pa.count, pos = new Float32Array(cnt * 3), i;
    for (i = 0; i < cnt; i++) { pos[i * 3] = pa.getX(i); pos[i * 3 + 1] = pa.getY(i); pos[i * 3 + 2] = pa.getZ(i); }
    var out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    if (geom.index) { var ia = geom.index, idx = new Uint32Array(ia.count); for (i = 0; i < ia.count; i++) idx[i] = ia.getX(i); out.setIndex(new THREE.BufferAttribute(idx, 1)); }
    out.computeVertexNormals(); out.computeBoundingSphere(); out.computeBoundingBox();
    return out;
  }

  App.skullMesh = {
    load: function (cb) {
      if (window.__noSkullModel || !window.SKULL_GLB_B64 || !THREE.GLTFLoader || !THREE.BufferGeometryUtils) { console.info('skull model not available: using the procedural skull'); cb(null); return; }
      try {
        var bin = atob(window.SKULL_GLB_B64), buf = new Uint8Array(bin.length), i;
        for (i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        new THREE.GLTFLoader().parse(buf.buffer, '', function (gltf) {
          var g = null; try { g = build(gltf); } catch (e) { console.info('skull model failed: ' + e.message); }
          cb(g);
        }, function (e) { console.info('skull model parse error'); cb(null); });
      } catch (e) { console.info('skull model failed: ' + e.message); cb(null); }
    }
  };
})(window.App = window.App || {});
