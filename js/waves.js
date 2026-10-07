/* Stress-wave model (CPU replica of the wave shader in slab.js) + the live stress graph. Schematic units: 1.0 = 150 MPa. */
(function (App) {
  var S = App.sim, I = App.i18n;
  var CS = 1.0, TS = -80 / 150;                      // compressive / tensile strength in graph units
  var W = App.waves = {};
  W.front = function (t, T) { return S.clamp01((t - 0.28) / 0.22) * 2.5 * T; };
  W.sigma = function (x, s, t, T, KE) {
    var front = W.front(t, T), A = 0.9 + 0.25 * Math.log10(KE / 500);
    var r1 = Math.hypot(x, s), si = A * Math.exp(-Math.pow((r1 - front) / 1.1, 2)) / (1 + 0.15 * r1);
    var r2 = Math.hypot(x, 2 * T - s), sr = -0.6 * A * Math.exp(-Math.pow((r2 - front) / 1.1, 2)) / (1 + 0.15 * r2);
    return si + sr;
  };

  W.drawGraph = function (cv, d, t) {
    var x = cv.getContext('2d'), w = 300, h = 150, L = 38, R = 8, Tp = 16, B = 28, pw = w - L - R, ph = h - Tp - B, t_ = I.t, N = 60, i;
    function X(s) { return L + s / d.T * pw; }
    function Y(v) { return Tp + (1.25 - v) / 2.5 * ph; }
    x.setTransform(cv.width / 300, 0, 0, cv.height / 150, 0, 0);
    x.clearRect(0, 0, w, h);
    x.fillStyle = 'rgba(12,16,22,0.9)'; x.fillRect(0, 0, w, h);
    x.font = '10px system-ui,sans-serif'; x.lineWidth = 1;
    // axes
    x.strokeStyle = '#46566b'; x.beginPath(); x.moveTo(L, Y(0)); x.lineTo(w - R, Y(0)); x.moveTo(L, Tp); x.lineTo(L, h - B); x.stroke();
    // strength thresholds (dashed)
    x.setLineDash([4, 3]);
    x.strokeStyle = '#ff7a66'; x.beginPath(); x.moveTo(L, Y(CS)); x.lineTo(w - R, Y(CS)); x.stroke();
    x.strokeStyle = '#59b0ff'; x.beginPath(); x.moveTo(L, Y(TS)); x.lineTo(w - R, Y(TS)); x.stroke();
    x.setLineDash([]);
    x.fillStyle = '#ff9d8e'; x.textAlign = 'left'; x.fillText(t_('g_cs'), L + 4, Y(CS) - 3);
    x.fillStyle = '#8cc8ff'; x.fillText(t_('g_ts'), L + 4, Y(TS) + 11);
    // curve at x = r0 + 1.5 (just beside the hole)
    var xr = 1.0, pts = [], minV = 0;                 // along the bullet axis (schematic)
    for (i = 0; i <= N; i++) { var s = d.T * i / N, v = W.sigma(xr, s, t, d.T, d.KE); pts.push([X(s), Y(v), v]); if (v < minV) minV = v; }
    // tensile failure fill
    x.fillStyle = 'rgba(58,160,255,0.35)'; x.beginPath(); var open = false;
    for (i = 0; i <= N; i++) {
      if (pts[i][2] < TS) { if (!open) { x.moveTo(pts[i][0], Y(TS)); open = true; } x.lineTo(pts[i][0], pts[i][1]); }
      else if (open) { x.lineTo(pts[i][0], Y(TS)); x.closePath(); x.fill(); x.beginPath(); open = false; }
    }
    if (open) { x.lineTo(pts[N][0], Y(TS)); x.closePath(); x.fill(); }
    // curve coloured by sign
    x.lineWidth = 2;
    for (i = 1; i <= N; i++) { x.strokeStyle = pts[i][2] >= 0 ? '#ff5a45' : '#3aa0ff'; x.beginPath(); x.moveTo(pts[i - 1][0], pts[i - 1][1]); x.lineTo(pts[i][0], pts[i][1]); x.stroke(); }
    x.lineWidth = 1;
    // labels
    x.fillStyle = '#9aa7b5'; x.textAlign = 'left'; x.fillText(t_('g_near'), L, h - 12); x.textAlign = 'right'; x.fillText(t_('g_far'), w - R, h - 12);
    x.textAlign = 'center'; x.fillText(t_('g_ax_x'), L + pw / 2, h - 2);
    x.save(); x.translate(10, Tp + ph / 2); x.rotate(-Math.PI / 2); x.textAlign = 'center'; x.fillText(t_('g_ax_y'), 0, 0); x.restore();
    if (minV < TS) { x.fillStyle = '#8cc8ff'; x.font = 'bold 11px system-ui,sans-serif'; x.textAlign = 'right'; x.fillText(t_('wv_fail'), w - R, Tp + 4); }
  };
})(window.App = window.App || {});
