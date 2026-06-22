(function(){
  'use strict';
  function esc(v){ return window.KPCGuest ? KPCGuest.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function setText(el, value){ if(el) el.textContent = value; }
  function localStats(){
    const s = window.KPCGuest ? KPCGuest.stats() : {};
    return {best_wpm:s.best_wpm||0, accuracy:s.best_accuracy||0, tests_saved:s.tests_completed||0, lessons_saved:s.lessons_completed||0, total_lessons:60};
  }
  function renderStats(stats){
    const preview = document.querySelectorAll('.kpc-preview-metrics strong');
    setText(preview[0], stats.best_wpm || 0);
    setText(preview[1], (stats.accuracy || 0) + '%');
    setText(preview[2], '60s');
    const cards = document.querySelectorAll('.kpc-focus-stats > div b');
    setText(cards[0], stats.best_wpm || 0);
    setText(cards[1], (stats.accuracy || 0) + '%');
    setText(cards[2], (stats.tests_saved || 0) + ' tests');
    setText(cards[3], (stats.lessons_saved || 0) + '/' + (stats.total_lessons || 60));
    const goalMins = Number((window.KPCGuest ? KPCGuest.stats().total_practice_minutes : 0) || 0);
    const percent = Math.min(100, Math.round((goalMins % 30) / 30 * 100));
    setText(document.getElementById('homeGoalPercent'), percent + '%');
    setText(document.getElementById('homeGoalText'), `${Math.min(30, Math.round(goalMins % 30))} / 30 min complete`);
    const bar=document.getElementById('homeGoalBar'); if(bar) bar.style.width = percent+'%';
    const prog=document.getElementById('homeTrainingProgress'); if(prog) prog.style.width = Math.min(100, Math.round((stats.lessons_saved||0)/(stats.total_lessons||60)*100)) + '%';
    const hint=document.getElementById('homeTrainingHint'); if(hint) hint.textContent = stats.lessons_saved ? `${stats.lessons_saved} lessons completed` : 'No saved lesson data yet.';
  }
  function renderPlayers(players){
    const topBox = document.querySelector('.kpc-players-clean'); if(!topBox) return;
    const local = window.KPCGuest ? KPCGuest.localLeaderboard().slice(0,3) : [];
    const rows = (players && players.length) ? players : local;
    if(!rows.length){ topBox.innerHTML = '<div class="kpc-empty-state"><b>No scores yet</b><p>Real top players will appear after saved tests.</p></div>'; return; }
    topBox.innerHTML = rows.slice(0,3).map((p, i) => `<div class="player"><span>${i+1}</span><b>${esc(p.username || p.player_name || 'Guest Player')}<br><small>${esc(p.wpm || 0)} WPM · ${esc(p.accuracy || 0)}%</small></b></div>`).join('');
  }
  async function loadHomeStats(){
    renderStats(localStats());
    renderPlayers([]);
    try{
      const res = await fetch('/api/home-stats', {headers:{'Accept':'application/json'}});
      const data = await res.json();
      if(!data.ok) return;
      const remote = data.stats || {};
      const local = localStats();
      const merged = {
        ...remote,
        best_wpm: Math.max(Number(remote.best_wpm)||0, Number(local.best_wpm)||0),
        accuracy: Math.max(Number(remote.accuracy)||0, Number(local.accuracy)||0),
        tests_saved: Math.max(Number(remote.tests_saved)||0, Number(local.tests_saved)||0),
        lessons_saved: Math.max(Number(remote.lessons_saved)||0, Number(local.lessons_saved)||0),
        total_lessons: remote.total_lessons || local.total_lessons
      };
      renderStats(merged);
      renderPlayers(data.top_players || []);
    }catch(err){ /* local fallback already rendered */ }
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', loadHomeStats); else loadHomeStats();
})();
