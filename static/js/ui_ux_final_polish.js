// KPCTyping UI/UX Final Polish helpers. Visual UX only; no API/route changes.
(function(){
  function ensureToastWrap(){
    var wrap=document.querySelector('.kpc-toast-wrap');
    if(!wrap){wrap=document.createElement('div');wrap.className='kpc-toast-wrap';document.body.appendChild(wrap);}return wrap;
  }
  window.kpcToast=function(message,type){
    var wrap=ensureToastWrap();
    var box=document.createElement('div');
    box.className='kpc-toast '+(type||'ok');
    box.textContent=message||'Done';
    wrap.appendChild(box);
    setTimeout(function(){box.style.opacity='0';box.style.transform='translateY(8px)';},2600);
    setTimeout(function(){box.remove();},3100);
  };
  document.addEventListener('click',function(e){
    var el=e.target.closest('button,a');
    if(!el) return;
    if(el.matches('button')) el.classList.add('kpc-tapped');
    setTimeout(function(){el.classList.remove('kpc-tapped');},220);
  },true);
  document.addEventListener('DOMContentLoaded',function(){
    document.querySelectorAll('tbody[id], #friendsList, #tournamentList, #achievementList, #aiSessions').forEach(function(el){
      if(!el.textContent.trim() || /Loading/i.test(el.textContent)) el.classList.add('kpc-skeleton');
      var observer=new MutationObserver(function(){ if(el.textContent.trim() && !/Loading/i.test(el.textContent)) el.classList.remove('kpc-skeleton'); });
      observer.observe(el,{childList:true,subtree:true,characterData:true});
    });
    var install=document.querySelector('#pwaInstallBtn,[data-pwa-install]');
    if(install && !localStorage.getItem('kpc_pwa_hint_seen')){
      setTimeout(function(){ window.kpcToast('Tip: you can install KPCTyping like an app on mobile.','ok'); localStorage.setItem('kpc_pwa_hint_seen','1'); },1200);
    }
  });
})();
