(function(){
  'use strict';
  function closeAll(){
    document.querySelectorAll('.kpc-mobile-more-wrap.is-open').forEach(w=>{
      w.classList.remove('is-open');
      const btn = w.querySelector('[data-kpc-mobile-more-toggle]');
      if(btn) btn.setAttribute('aria-expanded','false');
    });
  }
  function init(){
    document.querySelectorAll('[data-kpc-mobile-more-toggle]').forEach(btn=>{
      const wrap = btn.closest('.kpc-mobile-more-wrap');
      if(!wrap || btn.dataset.bound === '1') return;
      btn.dataset.bound = '1';
      btn.addEventListener('click', e=>{
        e.preventDefault();
        e.stopPropagation();
        const open = !wrap.classList.contains('is-open');
        closeAll();
        wrap.classList.toggle('is-open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    });
    document.addEventListener('click', closeAll);
    document.addEventListener('keydown', e=>{ if(e.key === 'Escape') closeAll(); });
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
