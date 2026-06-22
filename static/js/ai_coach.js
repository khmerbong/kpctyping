(function(){
  'use strict';
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  function guestId(){
    if(window.KPCGuest) return KPCGuest.uid();
    let id = localStorage.getItem('kpc_ai_guest_id');
    if(!id){ id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('kpc_ai_guest_id', id); }
    return id;
  }
  function setText(id, value){ const el=document.getElementById(id); if(el) el.textContent=value; }
  function empty(box, title, text){
    box.innerHTML = '';
    const wrap = document.createElement('div');
    wrap.className = 'kpc-empty-state';
    const b = document.createElement('b'); b.textContent = title;
    const p = document.createElement('p'); p.textContent = text;
    wrap.append(b,p); box.appendChild(wrap);
  }
  function renderKeys(id, keys){
    const box=document.getElementById(id); if(!box) return;
    box.innerHTML='';
    if(!keys || !keys.length){ empty(box, 'No data yet', 'Start a training lesson first.'); return; }
    keys.forEach(k => {
      const item = document.createElement('div');
      item.className = 'ai-key-pill';
      const b = document.createElement('b'); b.textContent = String(k.key || k || '?').slice(0,8);
      const small = document.createElement('small');
      small.textContent = `Accuracy ${k.accuracy ?? 0}% · Wrong ${k.wrong ?? 0} · Slow ${k.slow ?? 0}`;
      item.append(b, small);
      box.appendChild(item);
    });
  }
  function renderSessions(list){
    const box=document.getElementById('aiSessions'); if(!box) return;
    box.innerHTML='';
    if(!list || !list.length){ empty(box, 'No saved sessions yet', 'Training Mode and Typing Test will save real coach sessions here.'); return; }
    list.forEach(s=>{
      const item = document.createElement('div');
      item.className = 'ai-session';
      const title = document.createElement('span'); title.textContent = s.lesson_name || 'Training Mode';
      const meta = document.createElement('span'); meta.textContent = `${s.correct_keys || 0}/${s.total_keys || 0} correct · ${s.avg_time_ms || 0}ms avg`;
      item.append(title, meta);
      box.appendChild(item);
    });
  }
  async function loadCoach(){
    try{
      const res = await fetch('/api/ai-coach', {headers:{'X-Guest-ID': guestId(), 'Accept':'application/json'}});
      const data = await res.json();
      setText('aiTotalKeys', data.total_keys || 0);
      setText('aiAccuracy', (data.accuracy ?? 100) + '%');
      setText('aiWrongKeys', data.wrong_keys || data.wrong_keys_count || 0);
      setText('aiSlowKeys', data.slow_keys_count || 0);
      setText('aiCoachMessage', data.total_keys ? (data.coach_message || 'Keep practicing from your saved data.') : 'No coach data yet. Start typing and I will learn your weak keys.');
      setText('aiRecommendedLesson', data.recommended_lesson || 'Start with Training Mode');
      renderKeys('aiWeakKeys', data.weak_keys || []);
      renderKeys('aiSlowKeyList', data.slow_keys || []);
      renderSessions(data.recent_sessions || []);
    }catch(e){
      setText('aiCoachMessage', 'Coach data could not load. Try again after a practice session.');
    }
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
