(function(){
  const $ = (id) => document.getElementById(id);
  const safe = (value) => String(value ?? '').replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  function toast(message){ const el=$('coachToast'); if(!el) return; el.textContent=message; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
  function setText(id,value){ const el=$(id); if(el) el.textContent=value; }
  function setWidth(id,value){ const el=$(id); if(el) el.style.width=Math.max(0,Math.min(100,Number(value)||0))+'%'; }
  function renderKeyList(id, keys){
    const box=$(id); if(!box) return;
    if(!keys || !keys.length){ box.innerHTML='<div class="coach-rec"><b>No data yet</b><p>Complete a typing session first.</p></div>'; return; }
    box.innerHTML=keys.map(k=>`<div class="coach-key-pill"><b>${safe(k.key).toUpperCase()}</b><small>Accuracy ${safe(k.accuracy)}% · Wrong ${safe(k.wrong)} · Slow ${safe(k.slow)} · Avg ${safe(k.avg_time_ms)}ms</small></div>`).join('');
  }
  function renderHeatmap(rows){
    const box=$('aiKeyboardHeatmap'); if(!box) return;
    const data = Array.isArray(rows) && rows.length ? rows : ["QWERTYUIOP".split(''),"ASDFGHJKL".split(''),"ZXCVBNM".split('')].map(r=>r.map(k=>({key:k,level:'none'})));
    box.innerHTML=data.map(row=>`<div class="keyboard-row">${row.map(k=>`<button class="keycap ${safe(k.level)}" title="${safe(k.key)} · wrong ${safe(k.wrong||0)} · accuracy ${safe(k.accuracy||100)}%">${safe(k.key)}</button>`).join('')}</div>`).join('');
  }
  function renderRecommendations(list){
    const box=$('aiRecommendations'); if(!box) return;
    if(!list || !list.length){ box.innerHTML='<div class="coach-rec"><b>Keep practicing</b><p>Your coach will create recommendations after your next session.</p></div>'; return; }
    box.innerHTML=list.map(r=>`<div class="coach-rec"><b>${safe(r.title)}</b><p>${safe(r.body)}</p></div>`).join('');
  }
  function renderSessions(list){
    const box=$('aiSessions'); if(!box) return;
    if(!list || !list.length){ box.innerHTML='<div class="coach-session"><b>No saved sessions yet</b><small>Open training mode and complete a lesson.</small></div>'; return; }
    box.innerHTML=list.slice(0,8).map(s=>`<div class="coach-session"><b>${safe(s.lesson_name || 'Training Mode')}</b><small>${safe(s.correct_keys||0)}/${safe(s.total_keys||0)} correct · wrong ${safe(s.wrong_keys||0)} · avg ${safe(s.avg_time_ms||0)}ms</small></div>`).join('');
  }
  async function loadPhase4Coach(){
    try{
      const guest = window.KPCAICoach?.guestId ? window.KPCAICoach.guestId() : (localStorage.kpc_ai_guest_id || 'guest-local');
      const res = await fetch('/api/ai-coach', {headers:{'X-Guest-ID': guest}});
      const data = await res.json();
      setText('aiTotalKeys', data.total_keys || 0);
      setText('aiAccuracy', (data.accuracy ?? 100) + '%');
      setText('aiWeakKeyCount', (data.weak_keys || []).length);
      setText('aiImprovementScore', data.improvement_score ?? 0);
      setText('aiCoachMessage', data.coach_message || 'Start typing and I will learn your weak keys.');
      const level=data.skill_level || {};
      setText('aiSkillLevel', level.name || 'Starter'); setText('aiSkillMessage', level.message || 'Complete a session to unlock coach insights.'); setText('aiNextLevel', level.next || 'Beginner'); setWidth('aiSkillProgress', level.progress || 0);
      const c=data.daily_challenge || {};
      setText('aiDailyStatus', c.completed ? 'Completed' : 'Today'); setText('aiDailyWpm', (c.target_wpm || 35)+' WPM'); setText('aiDailyAccuracy', (c.target_accuracy || 95)+'%'); setText('aiDailyReward', '+'+(c.reward_xp || 100)+' XP'); setText('aiDailyFocus', c.focus_keys || 'f j d k');
      const w=data.weekly_goal || {};
      setText('aiWeekKey', w.week_key || 'This week'); setText('aiWeeklySessions', (w.completed_sessions || 0)+' / '+(w.target_sessions || 20)+' sessions'); setText('aiWeeklyXp', (w.current_xp || 0)+' / '+(w.target_xp || 5000)+' XP'); setText('aiWeeklyFocus', w.focus_area || 'Accuracy + weak keys'); setWidth('aiWeeklyProgress', w.progress_percent || 0);
      setText('aiRecommendedLesson', data.recommended_lesson || 'f j d k s l a ;');
      renderKeyList('aiWeakKeys', data.weak_keys || []); renderKeyList('aiSlowKeyList', data.slow_keys || []); renderHeatmap(data.keyboard_heatmap || []); renderRecommendations(data.recommendations || []); renderSessions(data.recent_sessions || []);
    }catch(err){ toast('Coach failed to load. Please try again.'); console.error(err); }
  }
  $('copyPracticeBtn')?.addEventListener('click', async()=>{ try{ await navigator.clipboard.writeText($('aiRecommendedLesson')?.textContent || ''); toast('Practice text copied'); }catch(e){ toast('Copy not available'); }});
  $('aiRefreshBtn')?.addEventListener('click', loadPhase4Coach);
  window.KPCAICoach2026={load:loadPhase4Coach};
  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded', loadPhase4Coach); else loadPhase4Coach();
})();
