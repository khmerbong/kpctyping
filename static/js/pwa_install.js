// REAL PHASE 12: PWA install + offline/mobile UI helpers
(function(){
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
  let deferredPrompt = null;
  function addBottomNav(){
    if(document.querySelector('.mobile-bottom-nav')) return;
    const nav=document.createElement('nav'); nav.className='mobile-bottom-nav';
    nav.innerHTML='<a href="/"><span>🏠</span>Home</a><a href="/training-mode"><span>⌨️</span>Train</a><a href="/ai-coach"><span>🤖</span>Coach</a><a href="/career"><span>⭐</span>Career</a><a href="/multiplayer-race"><span>🏁</span>Race</a>';
    document.body.appendChild(nav);
  }
  function status(text, show){
    let pill=document.querySelector('.mobile-status-pill');
    if(!pill){pill=document.createElement('div');pill.className='mobile-status-pill';document.body.appendChild(pill)}
    pill.textContent=text; pill.classList.toggle('show', !!show); if(show) setTimeout(()=>pill.classList.remove('show'),2500);
  }
  function banner(){
    if(isStandalone || localStorage.getItem('kpcPwaBannerClosed')==='1') return;
    if(document.querySelector('.pwa-install-banner')) return;
    const el=document.createElement('div'); el.className='pwa-install-banner';
    el.innerHTML='<div><strong>Install KPC Typing</strong><span>Use lessons faster on phone, with offline cache.</span></div><div><button class="pwa-install-btn">Install</button> <button class="pwa-close-btn">×</button></div>';
    document.body.appendChild(el);
    el.querySelector('.pwa-close-btn').onclick=()=>{localStorage.setItem('kpcPwaBannerClosed','1');el.remove()};
    el.querySelector('.pwa-install-btn').onclick=async()=>{if(deferredPrompt){deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; el.remove()}else{status('Use browser menu: Add to Home screen',true)}};
    setTimeout(()=>el.classList.add('show'),800);
  }
  window.addEventListener('beforeinstallprompt', e=>{e.preventDefault(); deferredPrompt=e; banner();});
  window.addEventListener('online', ()=>status('Back online',true));
  window.addEventListener('offline', ()=>status('Offline mode ready',true));
  if('serviceWorker' in navigator){window.addEventListener('load',()=>navigator.serviceWorker.register('/service-worker.js').catch(()=>{}));}
  document.addEventListener('DOMContentLoaded',()=>{addBottomNav(); if(!deferredPrompt) setTimeout(banner,1400); document.body.classList.add(('ontouchstart' in window)?'touch-device':'pointer-device');});
})();
