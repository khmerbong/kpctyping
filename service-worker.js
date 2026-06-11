/* PHASE 9 — PWA & Offline Mode */
const KPC_CACHE = 'kpc-typing-phase9-pwa-v1';
const KPC_RUNTIME = 'kpc-typing-runtime-v1';
const OFFLINE_URL = '/offline.html';
const CORE_ASSETS = [
  '/', '/landing', '/offline.html', '/training-mode', '/typing-test', '/leaderboard', '/profile', '/friends', '/tournaments', '/ai-coach', '/mobile-app',
  '/static/manifest.json',
  '/static/css/design-system.css','/static/css/pages.css','/static/css/components.css','/static/css/theme.css','/static/css/mobile.css','/static/css/mobile_typing.css','/static/css/performance.css','/static/css/security.css','/static/css/mobile_pwa.css',
  '/static/css/typing2026.css','/static/css/dashboard.css','/static/css/ai_coach2026.css','/static/css/social2026.css','/static/css/tournament2026.css',
  '/static/js/security_fetch.js','/static/js/theme-toggle.js','/static/js/performance_loader.js','/static/js/lazy_routes.js','/static/js/mobile_nav.js','/static/js/mobile_typing.js','/static/js/typing_engine_v2.js','/static/js/ai_coach2026.js','/static/js/pwa_install.js',
  '/static/icons/icon-192.svg','/static/icons/icon-512.svg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(KPC_CACHE).then(cache => cache.addAll(CORE_ASSETS.map(url => new Request(url, {cache:'reload'})))).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => ![KPC_CACHE,KPC_RUNTIME].includes(k)).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function networkFirst(req){
  try{const fresh=await fetch(req); const cache=await caches.open(KPC_RUNTIME); if(fresh && fresh.ok) cache.put(req, fresh.clone()); return fresh;}catch(e){return (await caches.match(req)) || (await caches.match(OFFLINE_URL));}
}
async function staleWhileRevalidate(req){
  const cached=await caches.match(req); const fetchPromise=fetch(req).then(res=>{if(res && res.ok){const copy=res.clone(); caches.open(KPC_RUNTIME).then(cache=>cache.put(req,copy));} return res;}).catch(()=>cached); return cached || fetchPromise;
}
self.addEventListener('fetch', event => {
  const req = event.request;
  if(req.method !== 'GET') return;
  const url = new URL(req.url);
  if(url.origin !== location.origin) return;
  if(req.mode === 'navigate' || req.destination === 'document') { event.respondWith(networkFirst(req)); return; }
  if(url.pathname.startsWith('/static/') || ['style','script','image','font'].includes(req.destination)) { event.respondWith(staleWhileRevalidate(req)); return; }
  event.respondWith(caches.match(req).then(cached => cached || fetch(req).catch(()=>caches.match(OFFLINE_URL))));
});
self.addEventListener('message', event => { if(event.data && event.data.type === 'SKIP_WAITING') self.skipWaiting(); });
