(function (App) {
  var D = App.data;
  function clamp(x, a, b) { return x < a ? a : x > b ? b : x; }
  function clamp01(x) { return x < 0 ? 0 : x > 1 ? 1 : x; }
  function smooth(a, b, x) { var t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); }
  function ease(x) { x = clamp01(x); return 1 - (1 - x) * (1 - x); }
  function lerp(a, b, k) { return a + (b - a) * k; }
  function rng(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; var t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }

  var S = App.sim = { clamp: clamp, clamp01: clamp01, smooth: smooth, ease: ease, lerp: lerp, rng: rng };

  S.defaults = function () { return { ammo: 'p9', hp: false, vScale: 1, T: 6, range: 'close', cut: false, scenario: 'perp', theta: 0 }; };

  S.KE = function (P) { var a = D.ammo[P.ammo], v = a.v * P.vScale; return 0.5 * a.m / 1000 * v * v; };

  // all geometry-driving numbers for one mode (entry | exit)
  S.derive = function (P, mode) {
    var a = D.ammo[P.ammo], d = { mode: mode, P: P, exit: mode === 'exit' };
    d.v = a.v * P.vScale; d.KE = S.KE(P); d.cal = a.cal;
    d.theta = P.scenario === 'oblique' ? (P.theta || 0) * Math.PI / 180 : 0;           // angle of incidence (oblique shot)
    d.tanT = Math.tan(d.theta); d.sinT = Math.sin(d.theta); d.ax = 1 / Math.cos(d.theta);
    d.contact = P.scenario === 'contact' && !d.exit;                                    // muzzle pressed on the skin
    var T = P.T, k = T / 6;
    d.T = T; d.To = 1.5 * k; d.Td = 3.5 * k; d.Ti = 1.0 * k;
    d.S = D.SKIN; d.DU = D.DURA; d.BR = D.BRAIN;
    d.defExit = P.hp ? 0.6 : 0.2;
    d.r0 = 0.5 * a.cal * (d.exit ? 1 + 0.35 * d.defExit : 1);
    d.sc = 0.3 * T;
    d.isRifle = d.v > 600; d.frag = P.ammo === 'r556' && d.v > 760;
    d.tan = clamp(0.35 + 0.25 * Math.log10(d.KE / 300), 0.30, 0.90) * (P.hp ? 1.10 : 1) * (d.exit ? 1.15 : 1) * (d.exit && d.isRifle ? 1.25 : 1);
    d.rFar = d.r0 + (T - d.sc) * d.tan;
    d.Dnear = 2 * d.r0; d.Dfar = 2 * d.rFar;
    d.rSkin = d.exit ? d.r0 * 1.45 : d.r0 * 0.85;
    d.cavMax = Math.min(9, 3 * a.cal * Math.pow(d.KE / 500, 1 / 3) * (P.hp ? 1.25 : 1) * 0.35);
    d.nCracks = clamp(Math.round(4 + 6 * Math.log10(d.KE / 100)), 3, 14);
    // layer y ranges (outside on top; y=0 outer surface of outer table)
    d.y = {
      skin: [d.S, 0], outer: [0, -d.To], diploe: [-d.To, -d.To - d.Td], inner: [-d.To - d.Td, -T],
      dura: [-T, -T - d.DU], brain: [-T - d.DU, -T - d.DU - d.BR]
    };
    // bullet knots along travel p (mm from first-touched bone face)
    var BL = 1.6 * a.cal;
    if (!d.exit) d.knots = [d.contact ? -7 : -18, -4, 0, d.To, d.To + d.Td, T + 1, T + d.DU + BL + 8];
    else d.knots = [-16, -8, -d.DU, d.Ti, d.Ti + d.Td, T + 1, T + d.S + BL + 18];
    // fragments (deterministic)
    var n = clamp(Math.round(20 + 40 * Math.log10(d.KE / 100)), 12, 120), r = rng(1234 + (d.exit ? 7 : 0)), ch = [];
    for (var i = 0; i < n; i++) {
      var far = r() < 0.7, phi = r() * Math.PI * 2, rho = far ? d.r0 + r() * (d.rFar - d.r0) : r() * d.r0 * 1.0;
      ch.push({
        far: far, ts: far ? 0.67 + r() * 0.10 : 0.46 + r() * 0.08,
        ox: Math.cos(phi) * rho, oz: Math.sin(phi) * rho,
        vy: 12 + r() * 16, vl: 3 + r() * 7, ph: phi, sz: 0.6 + r() * 0.8, rot: r() * 6
      });
    }
    d.chips = ch;
    return d;
  };

  S.stageOf = function (t) { var B = D.B; for (var i = 0; i < 6; i++) if (t < B[i + 1]) return i; return 5; };
  S.stageT = function (i) { return D.B[i]; };

  // pure function of t
  S.evaluate = function (t, d, o) {
    var B = D.B, st = S.stageOf(t), sl = (t - B[st]) / (B[st + 1] - B[st]);
    o.t = t; o.stage = st; o.sl = sl;
    var e = (st === 5 && !d.exit) ? ease(sl) : (st === 4 ? smooth(0, 1, sl) * 0.4 + sl * 0.6 : sl);
    var p = lerp(d.knots[st], d.knots[st + 1], e);
    o.p = p;
    o.q = ease((t - 0.66) / 0.14);
    o.tear = d.exit ? ease((t - 0.80) / 0.12) : 0;
    // bullet
    var hp = d.P.hp;
    if (!d.exit) o.def = (hp ? 0.5 : 0.1) * smooth(d.To, d.T + 1, p);
    else o.def = d.defExit + (hp ? 0.2 : 0.05) * smooth(0, 1, t);
    if (d.isRifle) o.yaw = d.exit ? 1.22 * smooth(0, 0.55, t) : 0.44 * smooth(0.8, 1, t);
    else o.yaw = d.exit ? 0.31 * Math.sin(t * 34) * (1 - smooth(0.5, 0.8, t)) : 0;
    o.split = d.frag ? (d.exit ? smooth(0.46, 0.62, t) : smooth(0.84, 0.96, t)) : 0;
    o.yBullet = d.exit ? p - d.T : -p;               // nose y
    o.dirY = d.exit ? 1 : -1;
    o.speedK = d.exit ? 0.6 : 1 - 0.45 * smooth(0, 1, t);
    // skin
    o.gas = d.contact ? 2.8 * smooth(0.14, 0.24, t) * (1 - smooth(0.36, 0.46, t)) : 0;     // Hoffmann's mine chamber (gas under the skin)
    if (d.contact) {
      o.skinSag = 0;
    } else if (!d.exit) {
      o.skinSag = -1.2 * clamp01((p + 4) / 1.2) * (1 - smooth(-2.8, -2.0, p));
    } else {
      o.skinSag = 1.5 * smooth(0.12, 0.80, t) * (1 - o.tear * 0.7);
    }
    // cavity
    if (!d.exit) {
      var tau = clamp01((t - 0.80) / 0.2);
      o.cavR = d.cavMax * ease(tau / 0.35) * (1 - 0.4 * smooth(0.35, 1, tau));
      o.cavY = -d.T - d.DU - d.cavMax * 0.55;
    } else {
      o.cavR = d.cavMax * ease(t / 0.28) * (1 - smooth(0.40, 0.70, t));
      o.cavY = Math.min(o.yBullet - 3, -d.T - d.DU - 2) - o.cavR * 0.2;
      if (t > 0.28) o.cavY = -d.T - d.DU - d.cavMax * 0.55;
    }
    // vault bulge (exit pressure)
    o.vaultBulge = d.exit ? 0.8 * smooth(0.12, 0.28, t) * (1 - smooth(0.54, 0.7, t)) : 0;
    return o;
  };

  // radius of the bone hole at depth s (0..T from first-touched face)
  S.holeBone = function (s, d, o) {
    if (s < 0 || s > o.p) return 0;
    if (s <= d.sc) return d.r0;
    var rc = d.r0 * 1.08, cone = d.r0 + (s - d.sc) * d.tan;
    var ql = clamp01(o.q * 1.4 - (1 - clamp01((s - d.sc) / (d.T - d.sc))) * 0.4);
    return rc + Math.max(0, cone - rc) * ql;
  };

  // hole radius of a layer at lab height y
  S.holeAtY = function (layer, y, d, o) {
    var s = d.exit ? y + d.T : -y, r;
    switch (layer) {
      case 'skin':
        if (d.contact) return o.t >= 0.28 ? d.r0 * (0.5 + 1.2 * ease((o.t - 0.28) / 0.08)) : 0;   // gas tears the skin before the bullet arrives
        if (!d.exit) return (o.p >= s + 1.2) ? d.rSkin : 0;
        if (o.p < s) return 0;
        return d.r0 * (0.5 + 0.95 * o.tear) * (1 + 0.4 * (y / d.S));
      case 'dura': return o.p >= s ? d.r0 * 1.15 : 0;
      case 'brain': return 0;
      default: return S.holeBone(s, d, o);
    }
  };

  // hole shape of a layer at height y: radius + eccentric centre + ellipse stretch (oblique shots). Replicated in the overlay shaders.
  S.holeShape = function (layer, y, d, o, out) {
    var r = S.holeAtY(layer, y, d, o), s = d.exit ? y + d.T : -y;
    out.cx = s * d.tanT + (r > 0 ? (r - d.r0) * 0.6 * d.sinT : 0); out.ax = d.ax;
    return r;
  };

  // chip position (analytic, deterministic in t); returns false if not alive
  S.chipPos = function (c, d, t, out) {
    var tau = (t - c.ts) * D.TOTAL_SEC;
    if (tau < 0) return false;
    var life = 2.0;
    if (tau > life) return false;
    var dir = d.exit ? 1 : -1;
    var y0 = c.far ? (d.exit ? 0 : -d.T) : (d.exit ? -d.T + d.Ti + d.Td * 0.5 : -d.To - d.Td * 0.5);
    var lat = Math.cos(c.ph), lz = Math.sin(c.ph);
    out.x = c.ox + lat * c.vl * tau;
    out.z = c.oz + lz * c.vl * tau;
    out.y = y0 + dir * c.vy * tau - 0.5 * 9 * tau * tau;
    out.s = c.sz * (1 - tau / life) * 0.6;
    out.r = c.rot + tau * 5;
    return true;
  };

  // readout numbers for UI/tests
  S.holes = function (P) {
    var en = S.derive(P, 'entry'), ex = S.derive(P, 'exit');
    return {
      entry: { outer: +en.Dnear.toFixed(1), inner: +en.Dfar.toFixed(1) },
      exit: { outer: +ex.Dfar.toFixed(1), inner: +ex.Dnear.toFixed(1) }
    };
  };
})(window.App = window.App || {});
