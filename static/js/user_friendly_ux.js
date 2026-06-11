// KPCTyping28 User Friendly UX Layer - visual/navigation helper only.
(function(){
  if (window.__kpcUserFriendlyUxLoaded) return;
  window.__kpcUserFriendlyUxLoaded = true;
  function ready(fn){document.readyState==='loading'?document.addEventListener('DOMContentLoaded',fn):fn();}
  ready(function(){
    if(!document.querySelector('.ux-quick-dock')){
      var dock=document.createElement('nav');
      dock.className='ux-quick-dock';
      dock.setAttribute('aria-label','Quick actions');
      dock.innerHTML='<a href="/training-mode">⌨️ <span>Start</span></a><a href="/typing-test">🎯 <span>Test</span></a><a href="/global-leaderboard">🏆 <span>Rank</span></a><a href="/profile">👤 <span>Me</span></a>';
      document.body.appendChild(dock);
    }
    if(!localStorage.getItem('kpc_ux_tip_closed') && location.pathname === '/'){
      var tip=document.createElement('aside');
      tip.className='ux-helper-tip';
      tip.innerHTML='<button aria-label="Close tip">×</button><strong>New here?</strong><span>Click Start to practice immediately. Use the bottom bar anytime.</span>';
      tip.querySelector('button').addEventListener('click',function(){localStorage.setItem('kpc_ux_tip_closed','1');tip.remove();});
      document.body.appendChild(tip);
      setTimeout(function(){ if(tip && tip.parentNode){tip.remove();} },9000);
    }
    document.querySelectorAll('a[href],button').forEach(function(el){
      if(!el.getAttribute('aria-label') && !el.textContent.trim()) el.setAttribute('aria-label','Action');
    });
  });
})();
