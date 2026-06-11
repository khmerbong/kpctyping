const KPC_CACHE = 'kpc-typing-phase7-performance-v1';
const CORE_ASSETS = [
  '/', '/offline.html', '/training-mode', '/typing-test', '/leaderboard', '/profile', '/friends', '/tournaments', '/ai-coach',
  '/static/manifest.json',
  '/static/css/design-system.css', '/static/css/pages.css', '/static/css/components.css', '/static/css/theme.css',
  '/static/css/mobile.css', '/static/css/mobile_typing.css', '/static/css/performance.css',
  '/static/css/typing2026.css', '/static/css/dashboard.css', '/static/css/ai_coach2026.css', '/static/css/social2026.css', '/static/css/tournament2026.css',
  '/static/js/theme-toggle.js', '/static/js/performance_loader.js', '/static/js/lazy_routes.js',
  '/static/js/mobile_nav.js', '/static/js/mobile_typing.js', '/static/js/typing_engine_v2.js', '/static/js/ai_coach2026.js'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(KPC_CACHE).then(cache => cache.addAll(CORE_ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== KPC_CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;
  event.respondWith(
    caches.match(req).then(cached => cached || fetch(req).then(res => {
      const copy = res.clone();
      if (res.ok && (req.destination === 'style' || req.destination === 'script' || req.destination === 'document' || url.pathname.startsWith('/static/'))) {
        caches.open(KPC_CACHE).then(cache => cache.put(req, copy));
      }
      return res;
    }).catch(() => caches.match('/offline.html')))
  );
});
