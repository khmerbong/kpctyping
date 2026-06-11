// PHASE 10 — small production UX helpers
(function(){
  'use strict';
  document.documentElement.classList.add('kpc-js-ready');
  window.addEventListener('error', function(event){
    try {
      const errors = JSON.parse(sessionStorage.getItem('kpc_client_errors') || '[]');
      errors.push({message:String(event.message||'error').slice(0,160), path:location.pathname, time:new Date().toISOString()});
      sessionStorage.setItem('kpc_client_errors', JSON.stringify(errors.slice(-5)));
    } catch (_) {}
  });
  document.addEventListener('click', function(event){
    const target = event.target.closest('[data-confirm]');
    if(target && !confirm(target.getAttribute('data-confirm'))){ event.preventDefault(); }
  });
})();
