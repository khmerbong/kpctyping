(function(){
  'use strict';
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const $ = id => document.getElementById(id);
  function esc(v){ return window.KPCGuest ? KPCGuest.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function playerName(){ return window.KPCGuest ? KPCGuest.name() : (localStorage.getItem('kpc_player_name') || 'Guest Player'); }
  function setText(id, value){ const el=$(id); if(el) el.textContent = value; }
  let roomCode = localStorage.getItem('kpc_race_room') || '';
  let promptText = '';
  let startAt = 0;
  let pollTimer = null;
  const input = $('raceInput');
  const nameInput = $('racePlayerName');
  const codeInput = $('raceJoinCode');
  if(nameInput) nameInput.value = playerName();
  if(codeInput) codeInput.value = roomCode;
  setText('raceLocalName', playerName());
  setText('raceLocalBest', localStorage.getItem('kpc_race_best_wpm') || localStorage.getItem('kpc_best_wpm') || 0);
  setText('raceLocalCount', localStorage.getItem('kpc_race_count') || 0);
  function saveName(){ if(nameInput && window.KPCGuest) KPCGuest.setName(nameInput.value); setText('raceLocalName', playerName()); }
  async function post(url, body){
    saveName();
    const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify(Object.assign({csrf_token:csrf,player_name:playerName()},body||{}))});
    return r.json();
  }
  function calc(){
    const typed = input?.value || '';
    let correct=0, errors=0;
    for(let i=0;i<typed.length;i++){ if(typed[i] === promptText[i]) correct++; else errors++; }
    const progress = promptText ? Math.min(100, Math.round(typed.length / promptText.length * 100)) : 0;
    const mins = startAt ? Math.max((Date.now()-startAt)/60000, 1/60) : 1/60;
    const wpm = Math.round((correct/5)/mins);
    const acc = typed.length ? Math.round(correct/typed.length*100) : 100;
    return {typed, correct, errors, progress, wpm:Math.max(0,wpm), acc};
  }
  function renderPrompt(){
    const box=$('racePrompt'); if(!box) return;
    if(!promptText){ box.innerHTML='<span class="current-letter">Create or join a room first.</span>'; return; }
    const typed = input?.value || '';
    let html='';
    for(let i=0;i<promptText.length;i++){
      const ch = promptText[i];
      if(i < typed.length) html += `<span class="${typed[i]===ch?'kpc-char-ok':'kpc-char-bad'}">${esc(ch)}</span>`;
      else if(i === typed.length) html += `<span class="current-letter">${esc(ch)}</span>`;
      else html += esc(ch);
    }
    box.innerHTML = html;
  }
  function renderTrack(players){
    const track = $('raceTrack'); if(!track) return;
    if(!players || !players.length){ track.innerHTML='<div class="kpc-empty-state"><b>No players yet</b><p>Create or join a room to show real racers.</p></div>'; return; }
    track.innerHTML = players.map((p,i)=>{
      const medal = i===0?'🥇':i===1?'🥈':i===2?'🥉':String(i+1);
      const progress = Math.max(0, Math.min(100, Number(p.progress||0)));
      return `<div class="racer"><b>${medal} 👤 ${esc(p.name)}<br><small>${p.finished?'Finished':'Typing'}</small></b><div class="road"><span style="width:${progress}%"></span><i>🚕</i></div><b>${esc(p.wpm || 0)}<br>WPM</b></div>`;
    }).join('');
  }
  function renderRoom(room){
    if(!room) return;
    roomCode = room.room_code || roomCode;
    promptText = room.prompt_text || promptText;
    localStorage.setItem('kpc_race_room', roomCode);
    if(codeInput) codeInput.value = roomCode;
    setText('raceRoomCode', roomCode || '—');
    setText('raceRoomTitle', `${room.title || 'Typing Race'} • Real Room`);
    setText('raceRoomPlayers', `👥 ${(room.players||[]).length} / ${room.max_players || 10}`);
    setText('raceRoomStatus', room.status || 'waiting');
    setText('raceRoomStarted', room.started_at ? 'Live' : 'Waiting');
    setText('racePromptHint', room.status === 'running' ? 'Race is live. Type the prompt below.' : 'Start the room when players are ready.');
    renderPrompt(); renderTrack(room.players || []); renderStats(room);
  }
  function renderStats(room){
    const s = calc();
    const players = room?.players || [];
    const idx = players.findIndex(p => String(p.name).toLowerCase() === String(playerName()).toLowerCase());
    setText('raceRank', idx >= 0 ? `${idx+1} / ${players.length}` : '—');
    setText('raceWpm', s.wpm);
    setText('raceAcc', s.acc + '%');
    setText('raceChars', s.typed.length);
    setText('raceErrors', s.errors);
    setText('raceProgressStat', s.progress + '%');
  }
  async function poll(){
    if(!roomCode) return;
    try{ const res = await fetch('/api/race/state?room_code='+encodeURIComponent(roomCode)); const data=await res.json(); if(data.ok) renderRoom(data); }catch(e){}
  }
  function startPoll(){ clearInterval(pollTimer); pollTimer=setInterval(poll, 2500); poll(); }
  $('raceCreate')?.addEventListener('click', async()=>{
    const data = await post('/api/race/create', {title:'Typing Race'});
    if(data.ok){ setText('raceStatus','Room created. Share the code or press Start.'); renderRoom(data.room); startPoll(); }
    else setText('raceStatus', data.error || data.message || 'Create failed');
  });
  $('raceJoin')?.addEventListener('click', async()=>{
    roomCode = (codeInput?.value || '').trim().toUpperCase();
    const data = await post('/api/race/join', {room_code:roomCode});
    if(data.ok){ setText('raceStatus','Joined room.'); renderRoom(data.room); startPoll(); }
    else setText('raceStatus', data.error || data.message || 'Join failed');
  });
  $('raceStart')?.addEventListener('click', async()=>{
    roomCode = (codeInput?.value || roomCode || '').trim().toUpperCase();
    const data = await post('/api/race/start', {room_code:roomCode});
    if(data.ok){ startAt = Date.now(); setText('raceStatus','Race started. Type the prompt.'); renderRoom(data.room); startPoll(); }
    else setText('raceStatus', data.error || data.message || 'Start failed');
  });
  input?.addEventListener('input', async()=>{
    if(!startAt) startAt = Date.now();
    const s = calc(); renderPrompt(); renderStats();
    if(roomCode){
      try{ await post('/api/race/progress', {room_code:roomCode, progress:s.progress, wpm:s.wpm, accuracy:s.acc, mistakes:s.errors, finished:s.progress>=100}); }catch(e){}
      if(s.progress>=100){
        localStorage.setItem('kpc_race_best_wpm', String(Math.max(Number(localStorage.getItem('kpc_race_best_wpm')||0), s.wpm)));
        localStorage.setItem('kpc_race_count', String(Number(localStorage.getItem('kpc_race_count')||0)+1));
        if(window.KPCGuest) KPCGuest.recordAttempt({mode:'race', lesson_id:'Multiplayer Race', wpm:s.wpm, accuracy:s.acc, score:s.wpm*10+s.correct, correct_keys:s.correct, wrong_keys:s.errors, total_keys:s.typed.length, duration_sec:Math.max(10, Math.round((Date.now()-startAt)/1000))});
      }
    }
  });
  if(roomCode) startPoll(); else renderPrompt();
})();
