// KPC Typing — Phase 8A PWA install + mobile nav guard
// Fixes: mobile bottom nav and install banner showing on desktop.
(function(){
  'use strict';
  const MOBILE_QUERY = '(max-width: 760px)';
  const mq = window.matchMedia ? window.matchMedia(MOBILE_QUERY) : { matches: false, addEventListener: null };
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  let deferredPrompt = null;

  function isMobile(){ return !!mq.matches; }

  function removeLegacyBottomNav(){
    if (isMobile()) return;
    document.querySelectorAll('.mobile-bottom-nav').forEach(function(nav){ nav.remove(); });
  }

  function addBottomNav(){
    if(!isMobile()) { removeLegacyBottomNav(); return; }
    if(document.querySelector('.mobile-bottom-nav') || document.querySelector('.kpc-bottom-nav')) return;
    const nav=document.createElement('nav');
    nav.className='mobile-bottom-nav';
    nav.setAttribute('aria-label','Mobile quick navigation');
    nav.innerHTML='<a href="/"><span>🏠</span>Home</a><a href="/training-mode"><span>⌨️</span>Train</a><a href="/ai-coach"><span>🤖</span>Coach</a><a href="/career"><span>⭐</span>Career</a><a href="/multiplayer-race"><span>🏁</span>Race</a>';
    document.body.appendChild(nav);
  }

  function status(text, show){
    let pill=document.querySelector('.mobile-status-pill');
    if(!pill){pill=document.createElement('div');pill.className='mobile-status-pill';document.body.appendChild(pill)}
    pill.textContent=text;
    pill.classList.toggle('show', !!show && isMobile());
    if(show) setTimeout(()=>pill.classList.remove('show'),2500);
  }

  function banner(force){
    if(isStandalone || localStorage.getItem('kpcPwaBannerClosed')==='1') return;
    if(!isMobile() && !force) return;
    if(document.querySelector('.pwa-install-banner')) return;
    const el=document.createElement('div');
    el.className='pwa-install-banner';
    el.setAttribute('role','region');
    el.setAttribute('aria-label','Install KPC Typing');
    el.innerHTML='<div><strong>Install KPC Typing</strong><span>Use lessons faster on phone, with offline cache.</span></div><div><button class="pwa-install-btn" type="button">Install</button> <button class="pwa-close-btn" type="button" aria-label="Close install banner">×</button></div>';
    document.body.appendChild(el);
    el.querySelector('.pwa-close-btn').onclick=()=>{localStorage.setItem('kpcPwaBannerClosed','1');el.remove()};
    el.querySelector('.pwa-install-btn').onclick=async()=>{
      if(deferredPrompt){
        deferredPrompt.prompt();
        await deferredPrompt.userChoice;
        deferredPrompt=null;
        el.remove();
      } else {
        status('Use browser menu: Add to Home screen',true);
      }
    };
    setTimeout(()=>el.classList.add('show'),300);
  }

  window.addEventListener('beforeinstallprompt', e=>{
    e.preventDefault();
    deferredPrompt=e;
    if(isMobile()) banner(true);
  });
  window.addEventListener('online', ()=>status('Back online',true));
  window.addEventListener('offline', ()=>status('Offline mode ready',true));
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));}
  document.addEventListener('DOMContentLoaded',()=>{
    removeLegacyBottomNav();
    addBottomNav();
    if(isMobile() && !deferredPrompt) setTimeout(()=>banner(false),1400);
    document.body.classList.add(('ontouchstart' in window)?'touch-device':'pointer-device');
  });
  if(mq.addEventListener){
    mq.addEventListener('change', function(){
      if(isMobile()) addBottomNav(); else removeLegacyBottomNav();
      document.querySelectorAll('.pwa-install-banner').forEach(function(el){ if(!isMobile()) el.remove(); });
    });
  }
})();
