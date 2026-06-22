(function(){
  'use strict';
  const periods = ['all','weekly','monthly','season'];
  let currentPeriod = (window.KPC_DEFAULT_PERIOD || 'all').replace('weekly','weekly').replace('monthly','monthly').replace('season','season');
  function esc(v){ return window.KPCGuest ? KPCGuest.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function countryFlag(country){ const map = {Cambodia:'🇰🇭', Global:'🌐', 'United States':'🇺🇸', Japan:'🇯🇵', Canada:'🇨🇦', 'United Kingdom':'🇬🇧', Australia:'🇦🇺', Germany:'🇩🇪', India:'🇮🇳', Vietnam:'🇻🇳', France:'🇫🇷'}; return map[country] || '🌐'; }
  function emptyRow(){ return '<tr class="kpc-table-empty"><td colspan="7">No real scores yet. Play Typing Test or Training Mode first.</td></tr>'; }
  function mergePlayers(remote){
    const local = window.KPCGuest ? KPCGuest.localLeaderboard() : [];
    const rows = [...local, ...(remote || [])];
    const seen = new Set();
    return rows.filter(p => {
      const key = `${p.local?'local':'remote'}:${String(p.username||'').toLowerCase()}:${p.created_at||p.score||''}`;
      if(seen.has(key)) return false; seen.add(key); return true;
    }).sort((a,b)=>Number(b.wpm||0)-Number(a.wpm||0) || Number(b.accuracy||0)-Number(a.accuracy||0) || Number(b.score||0)-Number(a.score||0)).slice(0,100);
  }
  function renderPodium(players){
    const podium = document.querySelector('.podium'); if(!podium) return;
    if(!players.length){ podium.innerHTML = '<div class="kpc-empty-state"><b>No leaderboard scores yet</b><p>Complete a real typing test to fill the podium.</p></div>'; return; }
    const order = players.length === 1 ? [0] : players.length === 2 ? [1,0] : [1,0,2];
    const medals = ['🥈','🥇','🥉'];
    const classes = ['podium-card','podium-card gold','podium-card bronze'];
    podium.innerHTML = order.map((idx, slot) => {
      const p = players[idx];
      const actualSlot = players.length === 1 ? 1 : slot;
      return `<div class="${classes[actualSlot]}"><h2>${medals[actualSlot]}</h2><div class="big-avatar">👤</div><h3>${esc(p.username)}${p.local?'<span class="kpc-local-pill">This device</span>':''}</h3><p>${countryFlag(p.country)} ${esc(p.country || 'Global')}</p><b class="${actualSlot===1?'kpc-accent-gold':'kpc-accent-blue'}">${esc(p.wpm)} WPM</b><p>Accuracy ${esc(p.accuracy)}%</p></div>`;
    }).join('');
  }
  function renderTable(players){
    const body = document.getElementById('leaderboardRows') || document.querySelector('.table tbody'); if(!body) return;
    if(!players.length){ body.innerHTML = emptyRow(); return; }
    body.innerHTML = players.map((p, i) => `<tr><td>${i+1}</td><td>👤 ${esc(p.username)}${p.local?'<span class="kpc-local-pill">Local</span>':''}</td><td>${countryFlag(p.country)} ${esc(p.country || 'Global')}</td><td>${esc(p.wpm)}</td><td>${esc(p.accuracy)}%</td><td>${esc(p.game_mode || 'training')}</td><td class="kpc-accent-green">${esc(p.score || 0)}</td></tr>`).join('');
  }
  function renderSide(players){
    const countryList = document.getElementById('topCountriesList');
    if(countryList){
      if(!players.length){ countryList.innerHTML = '<div class="kpc-empty-state"><b>No country data yet</b><p>Scores will group here automatically.</p></div>'; }
      else{
        const grouped = {}; players.forEach(p => { const c=p.country||'Global'; grouped[c] = Math.max(grouped[c]||0, Number(p.wpm||0)); });
        countryList.innerHTML = Object.entries(grouped).sort((a,b)=>b[1]-a[1]).slice(0,5).map(([c,w],i)=>`<div class="list-item"><b>${i===0?'🥇':i===1?'🥈':i===2?'🥉':i+1} ${countryFlag(c)} ${esc(c)}</b><span>${esc(w)} WPM</span></div>`).join('');
      }
    }
    const recent = document.getElementById('trendingPlayersList');
    if(recent){
      if(!players.length) recent.innerHTML = '<div class="kpc-empty-state"><b>No recent scores yet</b><p>Play a test to appear here.</p></div>';
      else recent.innerHTML = players.slice().sort((a,b)=>String(b.created_at||'').localeCompare(String(a.created_at||''))).slice(0,5).map(p=>`<div class="list-item"><b>${esc(p.username)}</b><span>${esc(p.wpm)} WPM</span></div>`).join('');
    }
    const hof = document.getElementById('hofHighlights');
    if(hof){
      if(!players.length) hof.innerHTML = '<div class="kpc-empty-state"><b>No records yet</b><p>High scores will appear after real attempts.</p></div>';
      else{
        const fastest = players[0];
        const accurate = players.slice().sort((a,b)=>Number(b.accuracy||0)-Number(a.accuracy||0))[0];
        const score = players.slice().sort((a,b)=>Number(b.score||0)-Number(a.score||0))[0];
        hof.innerHTML = `<div class="ref-card pad"><b>⚡<br>${esc(fastest.wpm)} WPM</b><p>Fastest</p></div><div class="ref-card pad"><b>🎯<br>${esc(accurate.accuracy)}%</b><p>Best Accuracy</p></div><div class="ref-card pad"><b>🏆<br>${esc(score.score)}</b><p>Highest Score</p></div>`;
      }
    }
  }
  async function load(period){
    currentPeriod = period || currentPeriod || 'all';
    let remote = [];
    try{
      const res = await fetch('/api/global-leaderboard?period='+encodeURIComponent(currentPeriod)+'&limit=100');
      const data = await res.json();
      remote = data.players || [];
    }catch(err){ remote = []; }
    const players = mergePlayers(remote);
    renderPodium(players.slice(0,3)); renderTable(players); renderSide(players);
    document.querySelectorAll('.tabs .tab').forEach((tab, idx)=>tab.classList.toggle('active', periods[idx] === currentPeriod));
    const note = document.getElementById('myRankNote');
    if(note){ const local = players.findIndex(p=>p.local); note.textContent = local >= 0 ? `Your local best is ranked #${local+1} on this view.` : 'Complete a test to create your first local score.'; }
  }
  function initTabs(){
    document.querySelectorAll('.tabs .tab').forEach((tab, idx)=>{
      if(idx < periods.length){ tab.style.cursor = 'pointer'; tab.addEventListener('click', () => load(periods[idx])); }
      else if(idx === 4){ tab.style.cursor = 'pointer'; tab.addEventListener('click', () => location.href = '/hall-of-fame'); }
    });
    document.getElementById('leaderboardRefresh')?.addEventListener('click', () => load(currentPeriod));
  }
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', ()=>{initTabs(); load(currentPeriod);}); else {initTabs(); load(currentPeriod);}
})();
