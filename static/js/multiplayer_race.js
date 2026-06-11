
(function(){
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || window.CSRF_TOKEN || '';
  const $ = (id)=>document.getElementById(id);
  let roomCode='', promptText='', startedAt=null, timer=null, typedStarted=null;
  async function post(url, data){ const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify(data||{})}); return await r.json(); }
  async function getState(){ if(!roomCode)return; const r=await fetch('/api/race/state?room_code='+encodeURIComponent(roomCode)); const j=await r.json(); if(j.ok) render(j); }
  function render(j){
    $('raceRoom').style.display='block'; $('raceCode').textContent=j.room_code; $('racePrompt').textContent=j.prompt_text; promptText=j.prompt_text; startedAt=j.started_at;
    $('raceStatus').textContent=j.status; $('playerCount').textContent=(j.players||[]).length+'/'+j.max_players;
    $('players').innerHTML=(j.players||[]).map((p,i)=>`<div class="player-row"><div class="player-name"><b>${i+1}. ${p.name}</b><span>${p.progress}% • ${p.wpm} WPM • ${p.accuracy}%</span></div><div class="bar"><span style="width:${p.progress}%"></span></div></div>`).join('');
    if(j.status==='running') $('raceInput').disabled=false;
    if(j.status==='finished') $('raceInput').disabled=true;
  }
  $('createRace')?.addEventListener('click', async()=>{ const j=await post('/api/race/create',{title:$('raceTitle').value, prompt_text:$('raceCustomPrompt').value, player_name:$('playerName').value, max_players:10, countdown_seconds:5}); if(j.ok){roomCode=j.room.room_code; render(j.room); startPoll();} else alert(j.error||'Create failed'); });
  $('joinRace')?.addEventListener('click', async()=>{ const j=await post('/api/race/join',{room_code:$('joinCode').value, player_name:$('playerName').value}); if(j.ok){roomCode=j.room.room_code; render(j.room); startPoll();} else alert(j.error||'Join failed'); });
  $('startRace')?.addEventListener('click', async()=>{ const j=await post('/api/race/start',{room_code:roomCode}); if(j.ok) render(j.room); });
  $('raceInput')?.addEventListener('input', async(e)=>{ if(!typedStarted) typedStarted=Date.now(); const val=e.target.value; let correct=0, mistakes=0; for(let i=0;i<val.length;i++){ if(val[i]===promptText[i]) correct++; else mistakes++; } const progress=Math.min(100, Math.floor((val.length/Math.max(1,promptText.length))*100)); const mins=Math.max(1/60,(Date.now()-typedStarted)/60000); const wpm=Math.round((correct/5)/mins); const acc=Math.round((correct/Math.max(1,val.length))*100); const finished=val.length>=promptText.length && val===promptText; const j=await post('/api/race/progress',{room_code:roomCode,progress,wpm,accuracy:acc,mistakes,finished}); if(j.ok) render(j); });
  function startPoll(){ clearInterval(timer); timer=setInterval(getState,1800); getState(); }
})();
