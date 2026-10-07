(function (App) {
  App.data = {
    ammo: {
      r22: { id: 'r22', label: '.22 LR (plomo / lead)', m: 2.6, v: 330, cal: 5.6 },
      p38: { id: 'p38', label: '.38 Special LRN', m: 10.2, v: 260, cal: 9.1 },
      p45: { id: 'p45', label: '.45 ACP FMJ', m: 14.9, v: 255, cal: 11.5 },
      p9: { id: 'p9', label: '9×19 mm FMJ', m: 8.0, v: 360, cal: 9.0 },
      r556: { id: 'r556', label: '5.56×45 mm', m: 4.0, v: 940, cal: 5.7 },
      r762: { id: 'r762', label: '7.62×39 mm', m: 8.0, v: 715, cal: 7.9 }
    },
    ammoOrder: ['r22', 'p38', 'p45', 'p9', 'r556', 'r762'],
    SKIN: 4, DURA: 0.5, BRAIN: 22, W: 18,
    TOTAL_SEC: 14,
    B: [0, 0.12, 0.28, 0.44, 0.54, 0.80, 1.0],
    ranges: ['contact', 'close', 'inter', 'distant'],
    layerKeys: ['skin', 'outer', 'diploe', 'inner', 'dura', 'brain'],
    colors: { skin: 0xd9a28a, outer: 0xf1e8d2, diploe: 0xc9a77c, inner: 0xece2c8, dura: 0x8f6a8c, brain: 0xd6a3a8 },
    WOUND_EXAG: 2.2
  };
})(window.App = window.App || {});
