(function(){
 const el=document.getElementById('playerProfile');
 async function load(){const res=await fetch(`/api/player/${encodeURIComponent(window.PROFILE_USERNAME)}`); const data=await res.json(); if(!data.ok){el.innerHTML='<p>Player not found.</p>';return;} const p=data.profile; el.innerHTML=`<h2>${p.username}</h2><p><strong>Country:</strong> ${p.country}</p><p><strong>Best WPM:</strong> ${p.wpm}</p><p><strong>Best Accuracy:</strong> ${p.accuracy}%</p><p><strong>XP:</strong> ${p.xp}</p><p><strong>Career Rank:</strong> ${p.career_rank}</p><h3>Recent Scores</h3>${data.recent_scores.map(s=>`<div class="record-row"><span>${s.game_mode}<br><small>${s.created_at}</small></span><strong>${s.wpm} WPM</strong></div>`).join('')}`;}
 load();
})();
