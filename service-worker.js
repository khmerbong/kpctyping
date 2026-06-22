const KPC_CACHE = 'kpc-typing-v39-typing-polish-v1';
const CORE_ASSETS = [
  '/',
  '/offline.html',
  '/static/manifest.json',
  '/static/images/og-kpc-typing.png',
  '/static/icons/kpc-typing-mark-96.png',
  '/static/icons/apple-touch-icon.png',
  '/static/icons/icon-512.png',
  '/static/icons/icon-192.png',
  '/static/icons/favicon-96.png',
  '/static/icons/favicon-48.png',
  '/favicon.ico',
  '/static/css/design-system.css',
  '/static/css/layout.css',
  '/static/css/components.css',
  '/static/css/mobile.css',
  '/static/css/legacy.css',
  '/static/css/final-ui-polish.css',
  '/static/css/base.css',
  '/static/css/pages.css',
  '/static/css/animations.css',
  '/static/js/pwa_install.js',
  '/static/js/mobile_typing_helper.js',
  '/static/js/kpc_theme.js',
  '/static/js/kpc_toast.js',
  '/static/js/kpc_mobile_more.js',
  '/static/js/training_mode.js',
  '/static/js/typing_test.js',
  '/static/js/home_live.js',
  '/static/js/global_leaderboard_live.js',
  '/static/js/tournaments_live.js',
  '/static/js/multiplayer_race_live.js',
  '/typing-test',
  '/lessons',
  '/training-mode',
  '/global-leaderboard',
  '/tournaments',
  '/multiplayer-race'
];

async function cacheCoreAssets() {
  const cache = await caches.open(KPC_CACHE);
  await Promise.allSettled(
    CORE_ASSETS.map(async asset => {
      const response = await fetch(asset, { cache: 'reload' });
      if (response.ok) await cache.put(asset, response);
    })
  );
}

self.addEventListener('install', event => {
  event.waitUntil(cacheCoreAssets().then(() => self.skipWaiting()));
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== KPC_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

async function networkFirst(req) {
  const cache = await caches.open(KPC_CACHE);
  try {
    const fresh = await fetch(req);
    if (fresh.ok) cache.put(req, fresh.clone());
    return fresh;
  } catch (err) {
    return (await caches.match(req)) || (await caches.match('/offline.html'));
  }
}

async function cacheFirst(req) {
  const cached = await caches.match(req);
  if (cached) return cached;
  const res = await fetch(req);
  if (res.ok) {
    const cache = await caches.open(KPC_CACHE);
    cache.put(req, res.clone());
  }
  return res;
}

self.addEventListener('fetch', event => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;

  if (req.mode === 'navigate' || req.destination === 'document') {
    event.respondWith(networkFirst(req));
    return;
  }

  if (url.pathname.startsWith('/static/') || ['style', 'script', 'image', 'font', 'manifest'].includes(req.destination)) {
    event.respondWith(cacheFirst(req));
    return;
  }

  event.respondWith(fetch(req).catch(() => caches.match(req)));
});
