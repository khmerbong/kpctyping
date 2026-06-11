
// KPCTyping UI/UX Redesign Final - UI-only enhancements.
(function(){
  const root=document.documentElement; root.classList.add('kpc-redesign-final');
  document.querySelectorAll('section, article, .card, [class*="card"], [class*="panel"]').forEach((el,i)=>{
    if(!el.hasAttribute('data-kpc-animate')){el.setAttribute('data-kpc-animate','');el.style.animationDelay=Math.min(i*35,420)+'ms';}
  });
  if(!document.querySelector('.kpc-pro-bottom-nav')){
    const nav=document.createElement('nav'); nav.className='kpc-pro-bottom-nav'; nav.setAttribute('aria-label','Mobile quick navigation');
    const items=[['/','⌂','Home'],['/training-mode','⌨','Practice'],['/global-leaderboard','🏆','Rank'],['/ai-coach','🤖','Coach'],['/profile','👤','Profile']];
    nav.innerHTML=items.map(([href,icon,label])=>`<a href="${href}" class="${location.pathname===href?'active':''}"><span>${icon}</span><small>${label}</small></a>`).join('');
    document.body.appendChild(nav);
  }
  if(!document.querySelector('.kpc-toast')){
    const toast=document.createElement('div'); toast.className='kpc-toast'; toast.textContent='Premium UI loaded'; document.body.appendChild(toast);
    window.kpcToast=function(msg){toast.textContent=msg||'Done';toast.classList.add('show');setTimeout(()=>toast.classList.remove('show'),2200)};
  }
  document.querySelectorAll('button,[role="button"],.primary-btn,a[href]').forEach(el=>{
    if(!el.dataset.kpcUiBound){el.dataset.kpcUiBound='1';el.addEventListener('click',()=>{ if(window.kpcToast && el.tagName==='BUTTON') window.kpcToast('Loading...');},{passive:true});}
  });
})();
