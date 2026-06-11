(function(){
  'use strict';
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const esc = (v) => String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));
  function guestId(){
    let id = localStorage.getItem('kpc_ai_guest_id');
    if(!id){ id = 'guest_' + Math.random().toString(36).slice(2) + Date.now().toString(36); localStorage.setItem('kpc_ai_guest_id', id); }
    return id;
  }
  function $(id){ return document.getElementById(id); }
  function text(id, value){ const el=$(id); if(el) el.textContent = value; }
  function coachLevel(total, accuracy){
    if(total >= 1200 && accuracy >= 96) return 'Elite Rhythm';
    if(total >= 600 && accuracy >= 94) return 'Advanced Builder';
    if(total >= 250) return 'Consistency Builder';
    if(total >= 50) return 'Starter Coach';
    return 'New Learner';
  }
  function feedback(data){
    const items = [];
    const acc = Number(data.accuracy ?? 100);
    const weak = data.weak_keys || [];
    const slow = data.slow_keys || [];
    if(acc < 90) items.push('Slow down for one round. Your first target is clean accuracy before speed.');
    else if(acc < 96) items.push('Good base. Keep accuracy above 95% while increasing speed slowly.');
    else items.push('Accuracy is strong. Now practice rhythm and longer sentences.');
    if(weak.length) items.push('Focus weak keys: ' + weak.slice(0,4).map(k=>k.key).join(', ') + '. Type them slowly for 3 minutes.');
    if(slow.length) items.push('Slow keys need rhythm practice: ' + slow.slice(0,3).map(k=>k.key).join(', ') + '. Use short repeated patterns.');
    if(!weak.length && !slow.length) items.push('No weak-key data yet. Complete a Typing Test or Training session to unlock personalized analysis.');
    return items;
  }
  function dailyPlan(data){
    const weak = (data.weak_keys || []).slice(0,4).map(k=>k.key).join(' ');
    const slow = (data.slow_keys || []).slice(0,3).map(k=>k.key).join(' ');
    return [
      'Warm up: 2 minutes home-row accuracy with relaxed hands.',
      weak ? `Weak-key drill: repeat ${esc(weak)} slowly for 4 minutes.` : 'Baseline drill: complete one medium typing test to generate weak-key data.',
      slow ? `Rhythm drill: practice slow keys ${esc(slow)} in short bursts.` : 'Rhythm drill: type simple words while keeping a steady pace.',
      'Finish: one clean 60-second test. Do not chase speed if accuracy drops below 95%.'
    ];
  }
  function renderKeys(id, keys){
    const box=$(id); if(!box) return;
    if(!keys || !keys.length){ box.innerHTML = '<div class="coach-empty">No data yet. Start a Typing Test or Training lesson and the coach will learn your weak keys.</div>'; return; }
    const maxRisk = Math.max(...keys.map(k => Number(k.risk || k.wrong || k.slow || 1)), 1);
    box.innerHTML = keys.map(k => {
      const risk = Math.max(8, Math.min(100, Math.round((Number(k.risk || k.wrong || k.slow || 1) / maxRisk) * 100)));
      return `<div class="coach-key-pill"><b>${esc(k.key)}</b><small>Accuracy ${esc(k.accuracy)}% · Wrong ${esc(k.wrong)} · Slow ${esc(k.slow)} · Avg ${esc(k.avg_time_ms || 0)}ms</small><div class="coach-risk" aria-label="risk"><span style="width:${risk}%"></span></div></div>`;
    }).join('');
  }
  function renderSessions(list){
    const box=$('aiSessions'); if(!box) return;
    if(!list || !list.length){ box.innerHTML='<div class="coach-empty">No saved sessions yet. Finish a Typing Test or Training session to see history here.</div>'; return; }
    box.innerHTML = list.map(s => {
      const total = Number(s.total_keys || 0); const correct = Number(s.correct_keys || 0); const acc = total ? Math.round((correct/total)*100) : 100;
      const date = s.created_at ? new Date(s.created_at).toLocaleString() : 'Recent';
      return `<div class="coach-session"><div><strong>${esc(s.lesson_name || 'Typing Practice')}</strong><small>${esc(date)}</small></div><span>${correct}/${total} · ${acc}% · ${esc(s.avg_time_ms || 0)}ms avg</span></div>`;
    }).join('');
  }
  function renderPlan(data){
    const plan = dailyPlan(data);
    const list=$('dailyPlanList'); if(list) list.innerHTML = plan.map(x => `<li>${x}</li>`).join('');
    const f=$('aiFeedbackList'); if(f) f.innerHTML = feedback(data).map(x => `<li>${esc(x)}</li>`).join('');
    const total = Number(data.total_keys || 0); const acc = Number(data.accuracy ?? 100);
    const goalProgress = Math.min(100, Math.round((Math.min(total,500)/500)*60 + (Math.min(acc,100)/100)*40));
    const fill=$('weeklyGoalFill'); if(fill) fill.style.width = goalProgress + '%';
    text('weeklyGoalText', total < 50 ? 'Complete at least 3 typing sessions this week to unlock stronger coach recommendations.' : `Keep accuracy above ${acc < 95 ? '95%' : '96%'} and reduce your top 3 weak-key errors by 20%.`);
    text('goalWpmHint', total < 50 ? 'Speed goal: build baseline' : 'Speed goal: +5 WPM');
    text('goalAccuracyHint', acc < 95 ? 'Accuracy goal: reach 95%+' : 'Accuracy goal: stay 96%+');
  }
  async function loadCoach(){
    try{
      const res = await fetch('/api/ai-coach', {headers:{'X-Guest-ID': guestId()}});
      const data = await res.json();
      const total = Number(data.total_keys || 0); const acc = Number(data.accuracy ?? 100);
      text('aiTotalKeys', total.toLocaleString());
      text('aiAccuracy', acc + '%');
      text('aiWrongKeys', Number(data.wrong_keys || 0).toLocaleString());
      text('aiSlowKeys', Number(data.slow_keys_count || 0).toLocaleString());
      text('aiCoachMessage', data.coach_message || 'Start typing and I will learn your weak keys.');
      text('aiRecommendedLesson', data.recommended_lesson || 'f j d k s l a ; f j d k s l a ;');
      text('coachLevelLabel', 'Coach Level: ' + coachLevel(total, acc));
      text('coachModeLabel', data.mode === 'account' ? 'Saved to your account' : 'Guest mode · saved in this browser');
      renderKeys('aiWeakKeys', data.weak_keys || []);
      renderKeys('aiSlowKeyList', data.slow_keys || []);
      renderSessions(data.recent_sessions || []);
      renderPlan(data);
    }catch(err){
      text('aiCoachMessage', 'Coach could not load right now. Check server/API status.');
    }
  }
  async function track(events, lessonName){
    const body = {events: Array.isArray(events) ? events : [events], lesson_name: lessonName || 'Typing Test 2026', csrf_token: csrf};
    const res = await fetch('/api/ai-coach/track', {method:'POST', headers:{'Content-Type':'application/json','X-CSRFToken':csrf,'X-Guest-ID':guestId()}, body:JSON.stringify(body)});
    return res.json();
  }
  window.KPCAICoach = {guestId, csrf, load:loadCoach, track};
  $('aiRefreshBtn')?.addEventListener('click', loadCoach);
  $('copyPracticeBtn')?.addEventListener('click', async () => {
    const txt = $('aiRecommendedLesson')?.textContent || '';
    try{ await navigator.clipboard.writeText(txt); text('copyPracticeBtn','Copied!'); setTimeout(()=>text('copyPracticeBtn','Copy Practice Text'),1200); }catch(_){ text('copyPracticeBtn','Copy failed'); }
  });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadCoach); else loadCoach();
})();
