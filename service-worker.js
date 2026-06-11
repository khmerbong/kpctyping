const KPC_CACHE = 'kpc-typing-phase12-v1';
const CORE_ASSETS = [
  '/', '/offline.html', '/training-mode', '/typing-test', '/progress', '/career', '/ai-coach', '/analytics-pro', '/multiplayer-race',
  '/static/manifest.json', '/static/css/style.css', '/static/css/mobile_pwa.css', '/static/js/pwa_install.js',
  '/static/css/training_academy.css', '/static/css/ai_coach.css', '/static/css/career.css', '/static/css/analytics_pro.css', '/static/css/multiplayer_race.css',
  '/static/js/mobile_typing_helper.js'
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
