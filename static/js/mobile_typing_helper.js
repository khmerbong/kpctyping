// REAL PHASE 12: mobile/touch typing helper shared by lessons and games
(function(){
  const keys = 'abcdefghijklmnopqrstuvwxyz0123456789'.split('');
  function buildMobileKeyboard(targetSelector){
    const target = document.querySelector(targetSelector || '[data-mobile-keyboard]');
    if(!target || target.dataset.mobileReady==='1') return;
    target.dataset.mobileReady='1';
    const panel=document.createElement('section'); panel.className='mobile-panel';
    panel.innerHTML='<h3>Mobile Touch Keyboard</h3><p>Tap keys to practice on phone/tablet. Physical keyboard still works.</p><div class="mobile-grid"></div>';
    const grid=panel.querySelector('.mobile-grid');
    keys.forEach(k=>{const b=document.createElement('button'); b.className='key-tile mobile-touch-target'; b.type='button'; b.textContent=k.toUpperCase(); b.dataset.key=k; b.onclick=()=>{document.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true})); highlight(k)}; grid.appendChild(b);});
    target.appendChild(panel);
  }
  function highlight(k){document.querySelectorAll('.key-tile').forEach(el=>el.classList.toggle('active',el.dataset.key===String(k).toLowerCase()));}
  document.addEventListener('keydown',e=>highlight(e.key));
  document.addEventListener('DOMContentLoaded',()=>{ if(window.innerWidth<=780) buildMobileKeyboard('main, .training-shell, .game-shell'); });
  window.KPCMobileTyping = { buildMobileKeyboard, highlight };
})();

// KPC 2026 mobile bottom navigation - safe auto-inject
(function(){
  if (document.querySelector('.kpc-mobile-bottom-nav')) return;
  const links = [
    ['🏠','Home','/landing'],
    ['⌨️','Test','/typing-test'],
    ['🎮','Games','/landing#games'],
    ['🏆','Rank','/leaderboard'],
    ['👤','Profile','/profile']
  ];
  const nav = document.createElement('nav');
  nav.className = 'kpc-mobile-bottom-nav';
  nav.setAttribute('aria-label','Mobile quick navigation');
  const path = location.pathname;
  nav.innerHTML = links.map(([icon,label,href]) => {
    const active = (href !== '/landing#games' && (path === href || (href === '/landing' && path === '/'))) ? ' active' : '';
    return `<a class="${active}" href="${href}"><span>${icon}</span>${label}</a>`;
  }).join('');
  document.addEventListener('DOMContentLoaded', () => document.body.appendChild(nav));
})();
