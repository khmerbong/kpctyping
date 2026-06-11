(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  async function claim(payload){
    try{
      const r = await fetch('/api/xp/claim',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify(Object.assign({csrf_token:csrf}, payload||{}))});
      const j = await r.json();
      if(j && j.career){
        const xpEl=document.getElementById('xpValue')||document.getElementById('v43DashXP');
        if(xpEl) xpEl.textContent=j.career.xp;
      }
      window.dispatchEvent(new CustomEvent('kpc-career-updated',{detail:j}));
    }catch(e){}
  }
  window.KPCCareerClient={claimXP:claim};
  window.addEventListener('kpc-lesson-complete', function(ev){
    const d=ev.detail||{};
    claim({event_type:'lesson_complete', lesson_id:d.lesson_id||d.lessonName||document.getElementById('lessonName')?.textContent||'training', wpm:d.wpm||0, accuracy:d.accuracy||0});
    if((d.accuracy||0)>=100) claim({event_type:'perfect_accuracy', lesson_id:d.lesson_id||d.lessonName||'training', accuracy:d.accuracy||100, wpm:d.wpm||0});
  });
})();
