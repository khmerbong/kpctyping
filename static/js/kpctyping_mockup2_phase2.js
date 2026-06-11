
// KPCTyping Mockup #2 Phase 2 UI-only helper. Does not modify backend logic or API behavior.
(function(){
  const navLinks=[['/','Home'],['/training-mode','Practice'],['/multiplayer-race','Multiplayer'],['/global-leaderboard','Leaderboard'],['/tournaments','Tournament'],['/ai-coach','AI Coach']];
  // Add a lightweight bottom nav for mobile if the page does not already have one.
  if(!document.querySelector('.kpc-pro-bottom-nav')){
    const nav=document.createElement('nav');
    nav.className='kpc-pro-bottom-nav';
    nav.innerHTML=[['/','⌂','Home'],['/training-mode','⌨','Practice'],['/multiplayer-race','⚡','Race'],['/global-leaderboard','🏆','Ranks'],['/profile','👤','Profile']]
      .map(([href,icon,label])=>`<a href="${href}" class="${location.pathname===href?'active':''}"><span>${icon}</span>${label}</a>`).join('');
    document.body.appendChild(nav);
  }
  // Add premium active states without changing route links.
  document.querySelectorAll('a[href]').forEach(a=>{
    try{ const u=new URL(a.href,location.origin); if(u.pathname===location.pathname) a.classList.add('active'); }catch(e){}
  });
  // Small toast to confirm new UI assets loaded; hidden after first load.
  if(!sessionStorage.getItem('kpc_phase2_seen')){
    const t=document.createElement('div'); t.className='kpc-toast'; t.textContent='Premium UI loaded'; document.body.appendChild(t);
    setTimeout(()=>t.classList.add('show'),500); setTimeout(()=>t.classList.remove('show'),2400); sessionStorage.setItem('kpc_phase2_seen','1');
  }
})();
