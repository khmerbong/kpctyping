(function(){
  const rows=document.getElementById('leaderboardRows');
  const period=document.getElementById('periodSelect');
  const token=document.querySelector('meta[name="csrf-token"]')?.content || '';
  if(period && window.PHASE13_DEFAULT_PERIOD){period.value=window.PHASE13_DEFAULT_PERIOD;}
  function rowHtml(p){return `<tr><td>${p.rank}</td><td><a class="player-link" href="/player/${encodeURIComponent(p.username)}">${p.username}</a></td><td>${p.country}</td><td>${p.wpm}</td><td>${p.accuracy}%</td><td>${p.xp}</td><td><span class="rank-pill">${p.career_rank}</span></td></tr>`}
  function renderPodium(players){const box=document.getElementById('leaderboardPodium'); if(!box) return; const fallback=[players[1],players[0],players[2]]; const cls=['silver','gold','bronze']; const pos=[2,1,3]; box.innerHTML=fallback.map((p,i)=>{if(!p){return `<article class="podium-card ${cls[i]}"><div class="medal">${pos[i]}</div><div class="avatar">?</div><h3>No score</h3><p>-- WPM</p><strong>${pos[i]}</strong></article>`} const initial=(p.username||'?').slice(0,1).toUpperCase(); return `<article class="podium-card ${cls[i]}"><div class="medal">${pos[i]}</div><div class="avatar">${initial}</div><h3>${p.username}</h3><p>${p.wpm} WPM · ${p.accuracy}%</p><strong>${pos[i]}</strong></article>`}).join('');}
  async function load(){rows.innerHTML='<tr><td colspan="7">Loading...</td></tr>'; const res=await fetch(`/api/global-leaderboard?period=${encodeURIComponent(period.value)}&limit=100`); const data=await res.json(); const players=data.players||[]; renderPodium(players); rows.innerHTML=players.length?players.map(rowHtml).join(''):'<tr><td colspan="7">No scores yet.</td></tr>';}
  async function submitScore(){
    const payload={csrf_token:token,username:document.getElementById('submitUsername').value,country:document.getElementById('submitCountry').value,wpm:Number(document.getElementById('submitWpm').value||0),accuracy:Number(document.getElementById('submitAccuracy').value||0),score:Number(document.getElementById('submitScore').value||0),duration_sec:60,total_keys:240,game_mode:'manual_test'};
    const res=await fetch('/api/leaderboard/submit-global',{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':token},body:JSON.stringify(payload)}); const data=await res.json(); document.getElementById('submitMessage').textContent=data.ok?`Submitted. Verified: ${data.verified}`:`Submit failed: ${data.error||data.message}`; await load();
  }
  document.getElementById('refreshLeaderboard')?.addEventListener('click',load); period?.addEventListener('change',load); document.getElementById('submitGlobalScore')?.addEventListener('click',submitScore); load();
})();
