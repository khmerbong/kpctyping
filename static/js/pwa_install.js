// PHASE 9 — PWA install, offline status, and lightweight offline queue
(function(){
  'use strict';
  const LS_CLOSE='kpc_pwa_install_closed_v2';
  const QUEUE_KEY='kpc_offline_post_queue_v1';
  let deferredPrompt=null;
  function toast(msg){
    let el=document.querySelector('.pwa-toast');
    if(!el){el=document.createElement('div');el.className='pwa-toast';document.body.appendChild(el);} 
    el.textContent=msg; clearTimeout(el._t); el._t=setTimeout(()=>el.remove(),3200);
  }
  function banner(){
    if(localStorage.getItem(LS_CLOSE)==='1'||document.querySelector('.pwa-install-banner')) return;
    const standalone=window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
    if(standalone) return;
    const el=document.createElement('div'); el.className='pwa-install-banner';
    el.innerHTML='<div><strong>Install KPC Typing</strong><span>Open faster, keep core practice pages available offline.</span></div><div><button class="pwa-install-btn" type="button">Install</button><button class="pwa-close-btn" type="button" aria-label="Close">×</button></div>';
    document.body.appendChild(el);
    el.querySelector('.pwa-close-btn').onclick=function(){localStorage.setItem(LS_CLOSE,'1');el.remove();};
    el.querySelector('.pwa-install-btn').onclick=async function(){
      if(deferredPrompt){deferredPrompt.prompt(); await deferredPrompt.userChoice; deferredPrompt=null; el.remove();}
      else toast('Use browser menu → Add to Home screen');
    };
  }
  function showSyncChip(text){
    let el=document.querySelector('.pwa-sync-chip'); if(!el){el=document.createElement('div');el.className='pwa-sync-chip';document.body.appendChild(el);} el.textContent=text; clearTimeout(el._t); el._t=setTimeout(()=>el.remove(),3500);
  }
  function getQueue(){try{return JSON.parse(localStorage.getItem(QUEUE_KEY)||'[]')}catch(e){return[]}}
  function setQueue(q){localStorage.setItem(QUEUE_KEY,JSON.stringify(q.slice(-40)));}
  async function replayQueue(){
    if(!navigator.onLine) return;
    const q=getQueue(); if(!q.length) return;
    showSyncChip('Syncing '+q.length+' saved action(s)…');
    const left=[];
    for(const item of q){
      try{const res=await fetch(item.url,{method:item.method||'POST',headers:item.headers||{'Content-Type':'application/json'},body:item.body,credentials:'same-origin'}); if(!res.ok) left.push(item);}catch(e){left.push(item);} }
    setQueue(left); toast(left.length?('Some actions need retry: '+left.length):'Offline actions synced');
  }
  window.kpcQueueOfflinePost=function(url,payload){
    const headers={'Content-Type':'application/json'};
    const token=document.querySelector('meta[name="csrf-token"]')?.content; if(token) headers['X-CSRFToken']=token;
    const q=getQueue(); q.push({url,method:'POST',headers,body:JSON.stringify(payload||{}),ts:Date.now()}); setQueue(q); toast('Saved offline. It will sync when online.');
  };
  window.addEventListener('beforeinstallprompt',function(e){e.preventDefault();deferredPrompt=e;setTimeout(banner,900);});
  window.addEventListener('appinstalled',function(){localStorage.setItem(LS_CLOSE,'1');toast('KPC Typing installed');});
  window.addEventListener('online',function(){toast('Back online');replayQueue();});
  window.addEventListener('offline',function(){toast('Offline mode active');});
  if('serviceWorker' in navigator){window.addEventListener('load',function(){navigator.serviceWorker.register('/service-worker.js').then(function(reg){if(reg.waiting) toast('New app version ready after refresh');}).catch(function(){})});}
  document.addEventListener('DOMContentLoaded',function(){ if(!deferredPrompt) setTimeout(banner,1800); if(!navigator.onLine) toast('Offline mode active'); replayQueue(); });
})();
