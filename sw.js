/* Service worker: network first (always the latest version when online), cache as fallback (keeps working with a bad
   classroom connection after the first visit). Bump VERSION on every deploy. */
var VERSION = 'heridas-craneo-v1';
var CORE = ['./', 'index.html', 'manifest.webmanifest', 'icon.svg', 'icon-192.png',
  'lib/three.min.js', 'lib/OrbitControls.js', 'lib/GLTFLoader.js', 'lib/BufferGeometryUtils.js', 'lib/qrcode.min.js',
  'js/i18n.js', 'js/i18n_extra.js', 'js/data.js', 'js/sim.js', 'js/geometry.js', 'js/projectiles.js', 'js/slab.js', 'js/skullmesh.js',
  'js/skull.js', 'js/skinpanel.js', 'js/waves.js', 'js/micro.js', 'js/cinematic.js', 'js/pauses.js', 'js/modules.js', 'js/onboarding.js',
  'js/layout.js', 'js/ui.js', 'js/windows.js', 'js/main.js', 'js/skullmodel.js'];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(CORE); }).then(function () { return self.skipWaiting(); }));
});
self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (keys) {
    return Promise.all(keys.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});
self.addEventListener('fetch', function (e) {
  if (e.request.method !== 'GET' || new URL(e.request.url).origin !== location.origin) return;
  e.respondWith(fetch(e.request).then(function (res) {
    if (res && res.ok) { var copy = res.clone(); caches.open(VERSION).then(function (c) { c.put(e.request, copy); }); }
    return res;
  }).catch(function () { return caches.match(e.request, { ignoreSearch: true }).then(function (r) { return r || caches.match('index.html'); }); }));
});
