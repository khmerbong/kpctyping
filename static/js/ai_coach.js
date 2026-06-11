(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  function guestId(){
    let id = localStorage.getItem('kpc_ai_guest_id');
    if(!id){ id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('kpc_ai_guest_id', id); }
    return id;
  }
  function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }
  function renderKeys(id, keys){
    const box=document.getElementById(id); if(!box) return;
    if(!keys || !keys.length){ box.innerHTML='<p>No data yet. Start a training lesson first.</p>'; return; }
    box.innerHTML = keys.map(k => `<div class="ai-key-pill"><b>${String(k.key).replace(/[<>]/g,'')}</b><small>Accuracy ${k.accuracy}% · Wrong ${k.wrong} · Slow ${k.slow}</small></div>`).join('');
  }
  function renderSessions(list){
    const box=document.getElementById('aiSessions'); if(!box) return;
    if(!list || !list.length){ box.innerHTML='<p>No saved sessions yet.</p>'; return; }
    box.innerHTML=list.map(s=>`<div class="ai-session"><span>${s.lesson_name || 'Training Mode'}</span><span>${s.correct_keys || 0}/${s.total_keys || 0} correct · ${s.avg_time_ms || 0}ms avg</span></div>`).join('');
  }
  async function loadCoach(){
    const res = await fetch('/api/ai-coach', {headers:{'X-Guest-ID': guestId()}});
    const data = await res.json();
    setText('aiTotalKeys', data.total_keys || 0);
    setText('aiAccuracy', (data.accuracy ?? 100) + '%');
    setText('aiWrongKeys', data.wrong_keys || data.wrong_keys_count || 0);
    setText('aiSlowKeys', data.slow_keys_count || 0);
    setText('aiCoachMessage', data.coach_message || 'Start typing and I will learn your weak keys.');
    setText('aiRecommendedLesson', data.recommended_lesson || 'f j d k s l a ;');
    renderKeys('aiWeakKeys', data.weak_keys || []);
    renderKeys('aiSlowKeyList', data.slow_keys || []);
    renderSessions(data.recent_sessions || []);
  }
  window.KPCAICoach = {
    guestId, csrf,
    track: async function(events, lessonName){
      const body = {events: Array.isArray(events)?events:[events], lesson_name: lessonName || 'Training Mode', csrf_token: csrf};
      const res = await fetch('/api/ai-coach/track', {method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken':csrf,'X-Guest-ID':guestId()}, body:JSON.stringify(body)});
      return res.json();
    },
    load: loadCoach
  };
  document.getElementById('aiRefreshBtn')?.addEventListener('click', loadCoach);
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadCoach); else loadCoach();
})();
