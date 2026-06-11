(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const shell = document.querySelector('[data-tournament-id]');
  const tid = Number(shell?.dataset.tournamentId || 0);
  const statusBox = document.getElementById('tourStatus');
  const esc = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  const gid = localStorage.getItem('kpct_guest_id') || crypto.randomUUID();
  localStorage.setItem('kpct_guest_id', gid);
  function setStatus(msg){ if(statusBox) statusBox.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2); }
  async function post(url, payload){
    const res = await fetch(url, {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify({...payload, csrf_token:csrf})});
    return res.json().catch(() => ({ok:false,error:'invalid_json'}));
  }
  function playerLine(p){ return `<div class="player-item"><b>#${p.seed || '-'} ${esc(p.player_name || 'Player')}</b><div class="user-meta">${p.eliminated ? 'Eliminated' : 'Active'} • Joined ${esc(p.joined_at || '')}</div></div>`; }
  function resultLine(r){ return `<div class="player-item"><b>#${r.placement} ${esc(r.player_name || 'Player')}</b><div class="user-meta">+${Number(r.xp_reward || 0)} XP</div></div>`; }
  function podium(results){
    const pod = document.getElementById('podium');
    if(!pod) return;
    const top = [...(results || [])].slice(0,3);
    if(!top.length){ pod.innerHTML = '<div class="empty-state">No final placement yet.</div>'; return; }
    const byPlace = (place) => top.find(r => Number(r.placement) === place);
    const card = (r, cls, medal) => r ? `<div class="podium-card ${cls}"><div style="font-size:34px">${medal}</div><b>${esc(r.player_name)}</b><div class="user-meta">#${r.placement} • +${Number(r.xp_reward || 0)} XP</div></div>` : '<div class="podium-card"><div class="user-meta">Waiting</div></div>';
    pod.innerHTML = card(byPlace(2), 'silver', '🥈') + card(byPlace(1), 'gold', '🥇') + card(byPlace(3), 'bronze', '🥉');
  }
  function matchCard(m){
    const p1 = m.player1?.player_name || 'TBD';
    const p2 = m.player2?.player_name || 'BYE';
    return `<div class="match-item ${m.status === 'completed' ? 'done' : ''}">
      <div class="match-head"><b>Round ${m.round_no} • Match ${m.match_no}</b><span class="tag ${esc(m.status)}">${esc(m.status)}</span></div>
      <div class="versus"><span>${esc(p1)} — <b>${Number(m.player1_score || 0)}</b></span><span>${esc(p2)} — <b>${Number(m.player2_score || 0)}</b></span></div>
      ${m.winner ? `<div class="user-meta">Winner: ${esc(m.winner.player_name)}</div>` : ''}
      <div class="score-form">
        <input id="wpm-${m.id}" type="number" placeholder="WPM" min="0" max="300">
        <input id="acc-${m.id}" type="number" placeholder="Accuracy" min="0" max="100">
        <input id="score-${m.id}" type="number" placeholder="Score" min="0">
        <button data-submit="${m.id}">Submit Result</button>
      </div>
    </div>`;
  }
  async function loadDetail(){
    const data = await (await fetch(`/api/tournament/${tid}`)).json();
    if(!data.ok){ setStatus(data); return; }
    const t = data.tournament || {};
    document.getElementById('tourTitle').textContent = t.title || 'Tournament';
    document.getElementById('tourMeta').textContent = `${t.tournament_type || 'cup'} • ${t.status || 'open'} • ${t.players_count || 0}/${t.max_players || 0} players • Champion: ${t.champion_name || 'TBD'}`;
    document.getElementById('playersList').innerHTML = (data.players || []).length ? data.players.map(playerLine).join('') : '<div class="empty-state">No players yet.</div>';
    document.getElementById('resultsList').innerHTML = (data.results || []).length ? data.results.map(resultLine).join('') : '<div class="empty-state">No final results yet.</div>';
    document.getElementById('matchesList').innerHTML = (data.matches || []).length ? data.matches.map(matchCard).join('') : '<div class="empty-state">No bracket yet. Generate bracket after 2+ players join.</div>';
    document.getElementById('matchesList').querySelectorAll('[data-submit]').forEach(btn => btn.addEventListener('click', () => submitResult(Number(btn.dataset.submit))));
    podium(data.results || []);
    setStatus('Tournament detail loaded.');
  }
  async function submitResult(matchId){
    const wpm = Number(document.getElementById(`wpm-${matchId}`)?.value || 0);
    const accuracy = Number(document.getElementById(`acc-${matchId}`)?.value || 0);
    const score = Number(document.getElementById(`score-${matchId}`)?.value || Math.round(wpm * accuracy));
    setStatus(await post('/api/tournament/match/result', {match_id:matchId, wpm, accuracy, score, guest_id:gid}));
    await loadDetail();
  }
  document.getElementById('joinTournamentBtn')?.addEventListener('click', async () => { setStatus(await post('/api/tournament/join', {tournament_id:tid, player_name:document.getElementById('guestName')?.value || 'Guest Player', guest_id:gid})); await loadDetail(); });
  document.getElementById('startTournamentBtn')?.addEventListener('click', async () => { setStatus(await post('/api/tournament/start', {tournament_id:tid})); await loadDetail(); });
  loadDetail().catch(err => setStatus('Error: ' + err.message));
})();
