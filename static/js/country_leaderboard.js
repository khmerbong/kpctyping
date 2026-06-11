(function(){
  const rows=document.getElementById('countryRows');
  const input=document.getElementById('countryInput');
  const period=document.getElementById('countryPeriod');
  function rowHtml(p){return `<tr><td>${p.rank}</td><td><a class="player-link" href="/player/${encodeURIComponent(p.username)}">${p.username}</a></td><td>${p.wpm}</td><td>${p.accuracy}%</td><td>${p.xp}</td><td><span class="rank-pill">${p.career_rank}</span></td></tr>`}
  async function load(){const country=input.value||'Cambodia'; document.getElementById('countryTitle').textContent=`${country} Top Players`; rows.innerHTML='<tr><td colspan="6">Loading...</td></tr>'; const res=await fetch(`/api/country-leaderboard?country=${encodeURIComponent(country)}&period=${period.value}&limit=100`); const data=await res.json(); rows.innerHTML=data.players?.length?data.players.map(rowHtml).join(''):'<tr><td colspan="6">No scores yet.</td></tr>';}
  document.getElementById('refreshCountry')?.addEventListener('click',load); period?.addEventListener('change',load); load();
})();
