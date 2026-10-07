(function (App) {
  var S = App.sim;
  var PX = 2.4;
  var lastKey = '';
  function draw(cv, mode, range, d, t) {
    var key = [mode, range, d.P.ammo, d.P.hp, d.P.vScale, d.P.T, d.P.scenario, d.theta, t >= 0.18 ? 1 : 0, t >= 0.2 ? 1 : 0, Math.round(S.smooth(0.12, 0.28, t) * 20), Math.round(S.ease((t - 0.80) / 0.12) * 20), t >= 0.78 ? 1 : 0, App.i18n.lang].join('|');
    if (key === lastKey) return; lastKey = key;
    var x = cv.getContext('2d'), W = cv.width, H = cv.height, cx = W / 2, cy = H / 2, r, i, a;
    var g = x.createRadialGradient(cx, cy, 10, cx, cy, W * 0.75);
    g.addColorStop(0, '#e1ae96'); g.addColorStop(1, '#c98d77');
    x.fillStyle = g; x.fillRect(0, 0, W, H);
    var rnd = S.rng(99); x.fillStyle = 'rgba(150,95,80,0.12)';
    for (i = 0; i < 80; i++) { x.beginPath(); x.arc(rnd() * W, rnd() * H, 1 + rnd() * 2, 0, 6.283); x.fill(); }
    var r0 = d.r0 * PX, rs;
    if (mode === 'entry') {
      var open = t >= 0.18 ? 1 : 0, reveal = S.smooth(0.12, 0.28, t), ringOn = t >= 0.2 ? 1 : 0;
      rs = d.rSkin * PX;
      var rr = S.rng(5), n, maxR, j;
      if (range === 'contact') {
        if (open) {
          x.strokeStyle = 'rgba(40,30,25,' + (0.55 * reveal) + ')'; x.lineWidth = 5; x.beginPath(); x.arc(cx, cy, r0 * 2.1, 0, 6.283); x.stroke();
          x.strokeStyle = 'rgba(20,15,12,' + (0.35 * reveal) + ')'; x.lineWidth = 2; x.beginPath(); x.arc(cx, cy, r0 * 2.7, 0, 6.283); x.stroke();
        }
      } else if (range === 'close') {
        var sg = x.createRadialGradient(cx, cy, rs, cx, cy, r0 * 4.2);
        sg.addColorStop(0, 'rgba(25,20,18,' + (0.85 * reveal) + ')'); sg.addColorStop(1, 'rgba(25,20,18,0)');
        x.fillStyle = sg; x.beginPath(); x.arc(cx, cy, r0 * 4.2, 0, 6.283); x.fill();
      }
      n = range === 'close' ? 180 : range === 'inter' ? 60 : 0; maxR = range === 'close' ? r0 * 5.5 : Math.min(92, r0 * 10);
      x.fillStyle = '#7b2f1c';
      for (i = 0; i < n * reveal; i++) { a = rr() * 6.283; r = rs * 1.4 + Math.sqrt(rr()) * (maxR - rs * 1.4); x.beginPath(); x.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, 0.9 + rr() * 0.6, 0, 6.283); x.fill(); }
      if (open) {
        var cg = x.createRadialGradient(cx, cy, rs, cx, cy, r0 * 1.9);
        cg.addColorStop(0, 'rgba(150,50,50,0.45)'); cg.addColorStop(1, 'rgba(150,50,50,0)'); x.fillStyle = cg; x.beginPath(); x.arc(cx, cy, r0 * 1.9, 0, 6.283); x.fill();
        if (ringOn) {
          x.strokeStyle = '#a8503a'; x.lineWidth = Math.max(3, r0 * 0.28); x.beginPath(); x.ellipse(cx, cy, (rs + 1.5) * (d.ax || 1), rs + 1.5, 0, 0, 6.283); x.stroke();
          if (d.theta > 0) { x.lineWidth = Math.max(5, r0 * 0.6); x.beginPath(); x.ellipse(cx, cy, (rs + 2.5) * d.ax, rs + 2.5, 0, Math.PI * 0.62, Math.PI * 1.38); x.stroke(); }   // wider on the side the bullet came from
        }
        if (range === 'contact') {
          x.strokeStyle = '#2a1512'; x.lineWidth = 2;
          for (j = 0; j < 5; j++) { a = j * 1.2566 + 0.3; x.beginPath(); x.moveTo(cx + Math.cos(a) * rs, cy + Math.sin(a) * rs); x.lineTo(cx + Math.cos(a + 0.05) * (rs + r0 * (1.8 + (j % 2))), cy + Math.sin(a + 0.05) * (rs + r0 * (1.8 + (j % 2)))); x.stroke(); }
        }
        x.fillStyle = range === 'contact' ? '#0d0907' : '#2a1512'; x.beginPath(); x.ellipse(cx, cy, rs * (d.ax || 1), rs, 0, 0, 6.283); x.fill();
      }
    } else {
      var tear = S.ease((t - 0.80) / 0.12); rs = d.r0 * (0.5 + 0.95 * tear) * PX * 1.1;
      if (t >= 0.78) {
        var rx = S.rng(8), pts = [], k = 6;
        for (i = 0; i < k * 2; i++) { var an = i / (k * 2) * 6.283 + rx() * 0.15, rad = i % 2 ? rs * (0.7 + rx() * 0.2) : rs * (1.5 + rx() * 1.2); pts.push([Math.cos(an) * rad, Math.sin(an) * rad]); }
        var axs = d.ax || 1; x.beginPath(); x.moveTo(cx + pts[0][0] * axs, cy + pts[0][1]); for (i = 1; i < pts.length; i++) x.lineTo(cx + pts[i][0] * axs, cy + pts[i][1]); x.closePath();
        x.fillStyle = '#3a1a16'; x.fill(); x.strokeStyle = '#efc2ac'; x.lineWidth = 3; x.lineJoin = 'round'; x.stroke();
      }
    }
  }
  App.skinPanel = { draw: draw };
})(window.App = window.App || {});
