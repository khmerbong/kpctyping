(function(){
  function current(path){ return location.pathname === path || (path !== '/' && location.pathname.startsWith(path)); }
  function addMobileNav(){
    if(document.querySelector('.kpc-mobile-nav')) return;
    const nav=document.createElement('nav'); nav.className='kpc-mobile-nav'; nav.setAttribute('aria-label','Mobile navigation');
    const items=[['/','🏠','Home'],['/training-mode','📘','Practice'],['/typing-test','⌨️','Test'],['/global-leaderboard','🏆','Rank'],['/profile','👤','Profile']];
    nav.innerHTML=items.map(([href,ico,label])=>`<a href="${href}" class="${current(href)?'active':''}"><span>${ico}</span>${label}</a>`).join('');
    document.body.appendChild(nav);
  }
  function improveFocus(){
    document.querySelectorAll('button,a,input,textarea,select').forEach(el=>{ if(!el.getAttribute('aria-label') && el.textContent && el.textContent.trim()) el.setAttribute('aria-label', el.textContent.trim().slice(0,60)); });
  }
  document.addEventListener('DOMContentLoaded', function(){ addMobileNav(); improveFocus(); });
})();
