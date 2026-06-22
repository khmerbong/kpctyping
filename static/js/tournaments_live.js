(function(){
  'use strict';
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const $ = id => document.getElementById(id);
  const gid = window.KPCGuest ? KPCGuest.uid() : (localStorage.getItem('kpct_guest_id') || String(Date.now()));
  localStorage.setItem('kpct_guest_id', gid);
  let activeTournament = null;
  function esc(v){ return window.KPCGuest ? KPCGuest.escapeHtml(v) : String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function name(){ return window.KPCGuest ? KPCGuest.name() : (localStorage.getItem('kpc_player_name') || 'Guest Player'); }
  function set(id, value){ const el=$(id); if(el) el.textContent=value; }
  function setName(){ const input=$('tournamentPlayerName'); if(input && window.KPCGuest) KPCGuest.setName(input.value); }
  async function post(url, payload){ setName(); const r = await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRFToken':csrf},body:JSON.stringify(Object.assign({csrf_token:csrf,guest_id:gid,player_name:name()}, payload||{}))}); return r.json(); }
  function statusLabel(status){ return status === 'active' ? 'Bracket Active' : status === 'completed' ? 'Completed' : 'Registration Open'; }
  function renderHeader(t){
    activeTournament = t;
    set('tournamentTitle', (t.title || 'Daily Speed Cup') + ' 🏆');
    set('tournamentMeta', `${t.tournament_type || 'daily'} tournament · ${t.players_count || 0}/${t.max_players || 16} players · Champion: ${t.champion_name || 'TBD'}`);
    set('tournamentStatus', statusLabel(t.status));
    set('tourFormat', 'Single Elimination');
    set('tourPlayers', `${t.players_count || 0} / ${t.max_players || 16}`);
    set('tourType', t.tournament_type || 'daily');
    set('tourState', t.status || 'open');
    const join=$('joinActiveTournament'); if(join){ join.disabled = t.status === 'completed'; join.textContent = t.status === 'completed' ? 'Completed' : 'Join Tournament'; }
  }
  function renderUpcoming(tournaments){
    const box=$('upcomingTournaments'); if(!box) return;
    if(!tournaments.length){ box.innerHTML='<div class="kpc-empty-state"><b>No tournament yet</b><p>The default tournament will be created by the API.</p></div>'; return; }
    box.innerHTML = tournaments.map(t => `<div class="list-item"><b>🏆 ${esc(t.title)}</b><span>${esc(t.players_count)}/${esc(t.max_players)} Players • ${esc(t.status)} <button class="ref-btn soft" data-join-tour="${esc(t.id)}">Join</button> <a class="ref-btn soft" href="/tournament/${esc(t.id)}">Detail</a></span></div>`).join('');
  }
  function renderBracketFromDetail(data){
    const bracket=$('tournamentBracket'); if(!bracket) return;
    const matches=data.matches || [];
    const players=data.players || [];
    if(!matches.length){
      if(!players.length){ bracket.innerHTML='<div class="kpc-empty-state"><b>No players yet</b><p>Join the tournament to start building the bracket.</p></div>'; return; }
      bracket.innerHTML = `<div>${players.map(p=>`<div class="match"><div class="row"><span>#${esc(p.seed)} ${esc(p.player_name)}</span><b>Ready</b></div></div>`).join('')}</div>`;
      return;
    }
    const rounds = {};
    matches.forEach(m => { (rounds[m.round_no] = rounds[m.round_no] || []).push(m); });
    bracket.innerHTML = Object.entries(rounds).map(([round, rows]) => `<div>${rows.map(m => `<div class="match ${m.status==='completed'?'kpc-match-done':''}"><div class="row ${m.winner_player_id===m.player1_id?'win':''}"><span>${esc(m.player1?.player_name || 'TBD')}</span><b>${esc(m.player1_score || 0)}</b></div><div class="row ${m.winner_player_id===m.player2_id?'win':''}"><span>${esc(m.player2?.player_name || 'BYE')}</span><b>${esc(m.player2_score || 0)}</b></div></div>`).join('')}</div>`).join('');
    const live = matches.find(m => m.status === 'ready') || matches[0];
    const liveBox=$('liveMatchBox');
    if(liveBox){ liveBox.innerHTML = `<div><b>Round ${esc(live.round_no)} Match ${esc(live.match_no)}</b><p>${esc(live.player1?.player_name || 'TBD')} vs ${esc(live.player2?.player_name || 'BYE')}</p><a class="ref-btn soft" href="/tournament/${esc(data.tournament.id)}">Open Detail</a></div>`; }
  }
  async function loadDetail(tid){
    if(!tid) return;
    try{ const data=await (await fetch('/api/tournament/'+encodeURIComponent(tid))).json(); if(data.ok) renderBracketFromDetail(data); }catch(e){}
  }
  async function load(){
    const input=$('tournamentPlayerName'); if(input) input.value = name();
    try{
      const data = await (await fetch('/api/tournaments')).json();
      const tournaments = data.tournaments || [];
      renderUpcoming(tournaments);
      if(tournaments[0]){ renderHeader(tournaments[0]); await loadDetail(tournaments[0].id); }
      else { set('tournamentMeta','No tournament data yet.'); }
    }catch(err){ set('tournamentMeta','Could not load tournaments.'); }
  }
  async function join(tid){
    const btn = $('joinActiveTournament'); if(btn) btn.textContent='Joining...';
    const res = await post('/api/tournament/join', {tournament_id:tid || activeTournament?.id || 0});
    if(res.ok){ localStorage.setItem('kpc_tournament_joined_at', new Date().toISOString()); if(btn) btn.textContent='Joined ✓'; }
    else if(btn) btn.textContent = res.error === 'already_joined' ? 'Already joined' : 'Join failed';
    await load();
  }
  document.addEventListener('click', (e)=>{
    const btn=e.target.closest('[data-join-tour]'); if(!btn) return; e.preventDefault(); join(Number(btn.dataset.joinTour));
  });
  $('joinActiveTournament')?.addEventListener('click', ()=>join(activeTournament?.id));
  if(document.readyState === 'loading') document.addEventListener('DOMContentLoaded', load); else load();
})();
