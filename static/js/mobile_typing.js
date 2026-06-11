/* PHASE 6 — Mobile Typing UX Helper */
(function(){
  'use strict';
  function isMobile(){ return window.matchMedia('(max-width: 820px)').matches; }
  function byId(id){ return document.getElementById(id); }

  function createToolbar(){
    const board = byId('typingBoard');
    if (!board || document.querySelector('.mobile-typing-toolbar')) return;
    const bar = document.createElement('div');
    bar.className = 'mobile-typing-toolbar';
    bar.innerHTML = `
      <button type="button" data-mobile-action="focus">Keyboard</button>
      <button type="button" data-mobile-action="pause">Pause</button>
      <button type="button" data-mobile-action="restart">Restart</button>`;
    board.insertAdjacentElement('afterend', bar);
    bar.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-mobile-action]');
      if (!btn) return;
      const action = btn.dataset.mobileAction;
      if (action === 'focus') byId('typingInput')?.focus({preventScroll:false});
      if (action === 'pause') document.dispatchEvent(new KeyboardEvent('keydown', {key:'Escape'}));
      if (action === 'restart') {
        const start = byId('startBtn') || byId('tryAgainBtn');
        byId('tryAgainBtn')?.click();
        start?.click();
        setTimeout(()=>byId('typingInput')?.focus(), 120);
      }
    });
  }

  function improveViewport(){
    const input = byId('typingInput');
    if (!input) return;
    input.setAttribute('inputmode','text');
    input.setAttribute('enterkeyhint','done');
    input.addEventListener('focus', () => {
      if (!isMobile()) return;
      setTimeout(() => input.scrollIntoView({block:'center', behavior:'smooth'}), 250);
    });
    ['startBtn','resumeBtn','tryAgainBtn'].forEach(id => {
      byId(id)?.addEventListener('click', () => {
        if (isMobile()) setTimeout(() => input.focus({preventScroll:false}), 180);
      });
    });
  }

  function markCompactMode(){
    const setMode = () => document.body.classList.toggle('is-mobile-typing', isMobile());
    setMode();
    window.addEventListener('resize', setMode, {passive:true});
    window.addEventListener('orientationchange', () => setTimeout(setMode, 200), {passive:true});
  }

  function boot(){ createToolbar(); improveViewport(); markCompactMode(); }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', boot);
  else boot();
})();
