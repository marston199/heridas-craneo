/* Cinematic bullet-time: automatic slow motion at impact, a short freeze-frame at the spalling moment, a camera path that follows the
   bullet, and a subtle shake. Everything is derived from the time t; seeking (setT) never touches it, so screenshots stay deterministic. */
(function (App) {
  var S = App.sim, I = App.i18n;
  var C = App.cine = { freezeAt: 0.70, freezeSec: 1.2 };

  // camera keyframes in lab mm: [t, pos, target]; the last keys equal the normal pose (filled at runtime)
  var KEY = {
    entry: [[0.00, [22, 26, 52], [0, 14, 0]], [0.12, [14, 10, 34], [0, 4, 0]], [0.30, [9, 1, 26], [0, -1.5, 0]], [0.55, [-7, -5, 24], [0, -4.5, 0]], [0.75, [-4, -9, 30], [0, -6, 0]], [0.88, null, null], [1.0, null, null]],
    exit: [[0.00, [20, -30, 50], [0, -22, 0]], [0.12, [14, -22, 34], [0, -14, 0]], [0.30, [9, -8, 26], [0, -6, 0]], [0.55, [-7, -2, 24], [0, -3, 0]], [0.75, [-4, 3, 30], [0, -3, 0]], [0.88, null, null], [1.0, null, null]]
  };

  C.enabled = function () {
    var st = App.state;
    return st.cinematic && st.view === 'detail' && !st.cineOff && !st.reduce && (st.playing || st.freezeLeft > 0);
  };
  // time scale: slow motion while the stress field builds and the cone detaches
  C.warp = function (t) {
    var st = App.state;
    if (!st.cinematic || st.view === 'skull') return 1;
    return 1 - 0.7 * S.smooth(0.25, 0.29, t) * (1 - S.smooth(0.80, 0.84, t));
  };
  C.slowActive = function () { var st = App.state; return st.cinematic && st.playing && st.view !== 'skull' && C.warp(st.t) < 0.95; };
  C.freezeCrossing = function (prevT, newT) {
    var st = App.state;
    return st.cinematic && !st.reduce && st.view === 'detail' && !st.freezeDone && prevT < C.freezeAt && newT >= C.freezeAt;
  };

  var P = new THREE.Vector3(), Tg = new THREE.Vector3(), N = new THREE.Vector3(), N2 = new THREE.Vector3();
  function pose(mode, t, normPos, normTgt, outP, outT) {
    var keys = KEY[mode], i, a, b;
    for (i = 0; i < keys.length - 1; i++) if (t < keys[i + 1][0]) break;
    if (i >= keys.length - 1) i = keys.length - 2;
    a = keys[i]; b = keys[i + 1];
    var ap = a[1] || normPos, at = a[2] || normTgt, bp = b[1] || normPos, bt = b[2] || normTgt;
    var k = S.clamp01((t - a[0]) / (b[0] - a[0])); k = k * k * (3 - 2 * k);
    outP.set(ap[0] + (bp[0] - ap[0]) * k, ap[1] + (bp[1] - ap[1]) * k, ap[2] + (bp[2] - ap[2]) * k);
    outT.set(at[0] + (bt[0] - at[0]) * k, at[1] + (bt[1] - at[1]) * k, at[2] + (bt[2] - at[2]) * k);
  }
  // moves the lab camera toward the choreographed pose (smoothed so starting/stopping never jumps)
  C.applyCamera = function (cam, ctl, mode, t, dt, normal) {
    var st = App.state;
    pose(mode, t, normal.pos, normal.tgt, P, Tg);
    if (st.freezeLeft > 0) { var f = (C.freezeSec - st.freezeLeft) / C.freezeSec; P.x += 6 * Math.sin(f * 1.6); }      // slow orbit during the freeze
    if (t > 0.66 && t < 0.72 && !st.reduce) {                                                                          // shake at spall onset
      var u = (t - 0.66) / 0.06, a = 0.35 * (1 - u), r = S.rng(Math.floor(t * 4000));
      P.x += (r() - 0.5) * 2 * a; P.y += (r() - 0.5) * 2 * a;
    }
    var k = 1 - Math.exp(-dt * 7);
    cam.position.lerp(P, k); ctl.target.lerp(Tg, k);
  };
})(window.App = window.App || {});
