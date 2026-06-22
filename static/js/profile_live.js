(function(){
  'use strict';
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n || 0).toLocaleString();
  function set(id, value){ const el=$(id); if(el) el.textContent = value; }
  function rankFor(stats){
    if(stats.best_wpm >= 90) return 'Legend';
    if(stats.best_wpm >= 70) return 'Expert';
    if(stats.best_wpm >= 50) return 'Skilled';
    if(stats.tests_completed > 0) return 'Beginner';
    return stats.is_guest ? 'Guest' : 'Beginner';
  }
  function localProfile(){
    const s = window.KPCGuest ? KPCGuest.stats() : {player_name:'Guest Player', tests_completed:0, best_wpm:0, best_accuracy:0, avg_wpm:0, avg_accuracy:0, best_score:0, xp:0, level:1, lessons_completed:0, total_practice_minutes:0, weak_key_heatmap:[]};
    const attempts = window.KPCGuest ? KPCGuest.attempts() : [];
    return {ok:true, guest:true, profile:{...s, rank:rankFor(s)}, recent: attempts.slice(0,10), achievements: []};
  }
  function showProfileFallbackNotice(){
    const page = document.querySelector('[data-kpc-page="profile"]');
    if(!page || document.querySelector('[data-profile-fallback-warning]')) return;
    const note = document.createElement('div');
    note.className = 'profile-fallback-warning';
    note.setAttribute('data-profile-fallback-warning','');
    note.textContent = 'Could not load account profile. Showing local guest data.';
    const section = page.querySelector('section');
    if(section) section.prepend(note);
    (window.KPCToast?.show || window.showToast || function(){})('Could not load account profile. Showing local guest data.', 'warning');
  }
  async function accountProfile(){
    try{
      const r = await fetch('/api/profile/summary', {headers:{'Accept':'application/json'}});
      if(!r.ok){ showProfileFallbackNotice(); return null; }
      const data = await r.json();
      if(data.ok || data.success) return data;
      showProfileFallbackNotice();
      return null;
    }catch(e){ showProfileFallbackNotice(); return null; }
  }
  function renderTrend(rows){
    const box = $('profileTrend'); if(!box) return;
    const points = (rows||[]).slice().reverse().slice(-12);
    if(!points.length){ box.innerHTML = '<div class="kpc-empty-state"><b>No chart data yet</b><p>Your speed trend appears after saved tests.</p></div>'; return; }
    const max = Math.max(1, ...points.map(p=>Number(p.wpm)||0));
    const step = 500 / Math.max(1, points.length - 1);
    const poly = points.map((p,i)=>`${Math.round(i*step)},${150-Math.round((Number(p.wpm)||0)/max*120)}`).join(' ');
    box.innerHTML = `<svg viewBox="0 0 500 160" aria-label="WPM trend"><polyline points="${poly}" fill="none" stroke="currentColor" stroke-width="4"/></svg>`;
  }
  function renderRecent(rows){
    const body = $('profileRecent'); if(!body) return;
    if(!rows || !rows.length){ body.innerHTML='<tr class="kpc-table-empty"><td>No data yet. Complete your first typing test.</td></tr>'; return; }
    body.innerHTML = rows.slice(0,8).map(r=>`<tr><td>${KPCGuest.escapeHtml(r.lesson_id || r.game_mode || r.mode || 'Typing Test')}</td><td>${KPCGuest.escapeHtml(r.wpm || 0)} WPM</td><td>${KPCGuest.escapeHtml(r.accuracy || 0)}%</td><td>${KPCGuest.escapeHtml(String(r.created_at||'').slice(0,10))}</td></tr>`).join('');
  }
  function renderWeak(keys){
    const box = $('profileWeakKeys'); if(!box) return;
    const letters = 'QWERTYUIOPASDFGHJKLZXCVBNM'.split('');
    const map = Object.fromEntries((keys||[]).map(k=>[String(k.key||'').toUpperCase(), Number(k.count)||0]));
    if(!Object.keys(map).length){ box.innerHTML='<div class="kpc-empty-state"><b>No weak keys yet</b><p>AI Coach will detect weak keys after practice.</p></div>'; return; }
    const max = Math.max(1,...Object.values(map));
    box.innerHTML = letters.map(k=>`<span class="key ${map[k] ? (map[k]/max>.66?'poor':'weak') : ''}">${k}</span>`).join('');
  }
  function renderAchievements(profile){
    const box = $('profileAchievements'); if(!box) return;
    const items = [];
    if(profile.tests_completed >= 1) items.push(['🟢 First Test','Unlocked']);
    if(profile.tests_completed >= 10) items.push(['🔥 10 Tests','Unlocked']);
    if(profile.best_wpm >= 50) items.push(['🥇 50 WPM','Unlocked']);
    if(profile.best_accuracy >= 95) items.push(['🎯 Accuracy 95%','Unlocked']);
    if(!items.length){ box.innerHTML='<div class="kpc-empty-state"><b>No achievements yet</b><p>Start typing to unlock achievements.</p></div>'; return; }
    box.innerHTML = items.map(i=>`<div class="list-item"><b>${i[0]}</b><span>✅</span></div>`).join('');
  }
  function renderActivity(profile){
    const box = $('profileActivity'); if(!box) return;
    if(!profile.tests_completed){ box.innerHTML='<div class="kpc-empty-state"><b>No activity yet</b><p>Practice sessions will be summarized here automatically.</p></div>'; return; }
    box.innerHTML = `<div class="list"><div class="list-item"><span>Tests completed</span><b>${fmt(profile.tests_completed)}</b></div><div class="list-item"><span>Lessons completed</span><b>${fmt(profile.lessons_completed)}</b></div><div class="list-item"><span>Total practice</span><b>${fmt(profile.total_practice_minutes)} min</b></div></div>`;
  }
  function render(data){
    const p = data.profile || {};
    const rank = p.rank || rankFor(p);
    const mode = data.guest ? 'Guest profile · saved on this browser' : 'Account profile · saved in database';
    set('profileName', p.player_name || p.username || 'Guest Player');
    set('profileMode', mode);
    set('profileCountry', '🌐 ' + (p.country || 'Global'));
    set('profileIntro', p.tests_completed ? 'Great progress. Keep practicing to improve your speed and accuracy.' : 'Your real typing progress will appear here after you practice.');
    set('sideStreak', fmt(p.streak || 0));
    set('sideXp', fmt(p.xp || 0));
    set('sideRank', rank);
    set('profileLevel', p.level || 1);
    set('profileLevelText', `${fmt(p.xp || 0)} XP`);
    set('profileRank', rank);
    set('profileBestWpm', p.best_wpm || 0);
    set('profileBestAccuracy', (p.best_accuracy || 0) + '%');
    set('profileTests', fmt(p.tests_completed || 0));
    set('profileAvgWpm', p.avg_wpm || 0);
    set('profileAvgAccuracy', (p.avg_accuracy || 0) + '%');
    set('profileBestScore', fmt(p.best_score || 0));
    set('profileLessons', fmt(p.lessons_completed || 0));
    set('profilePracticeTime', fmt(p.total_practice_minutes || 0) + ' min');
    const goal = Math.min(100, Math.round(((p.total_practice_minutes || 0) % 30) / 30 * 100));
    set('profileGoalPercent', goal + '%');
    set('profileGoalText', `${Math.min(30, Math.round((p.total_practice_minutes || 0) % 30))} / 30 min`);
    const bar = $('profileGoalBar'); if(bar) bar.style.width = goal + '%';
    const nameInput = $('guestProfileName'); if(nameInput && data.guest) nameInput.value = KPCGuest.name();
    renderTrend(data.recent || []);
    renderRecent(data.recent || []);
    renderWeak(p.weak_key_heatmap || []);
    renderAchievements(p);
    renderActivity(p);
  }
  async function load(){ render(await accountProfile() || localProfile()); }
  $('saveGuestProfileName')?.addEventListener('click', ()=>{ const v=$('guestProfileName')?.value; if(window.KPCGuest) KPCGuest.setName(v); load(); });
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
