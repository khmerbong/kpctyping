(() => {
  const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
  const list = document.getElementById('tournamentList');
  const statusBox = document.getElementById('tourStatus');
  let tournaments = [];
  const esc = (value='') => String(value).replace(/[&<>'"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[ch]));
  function setStatus(msg){ if(statusBox) statusBox.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg, null, 2); }
  function guestId(){ const id = localStorage.getItem('kpct_guest_id') || crypto.randomUUID(); localStorage.setItem('kpct_guest_id', id); return id; }
  function statusTag(status){ return `<span class="tag ${esc(status)}">${esc(status)}</span>`; }
  function countdownText(t){
    const target = new Date(t.starts_at || t.start_time || Date.now()).getTime();
    if(!target || Number.isNaN(target)) return 'Open now';
    const diff = target - Date.now();
    if(diff <= 0) return 'Open now';
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    return `${hours}h ${minutes}m`;
  }
  async function loadTournaments(){
    setStatus('Refreshing tournament lobby...');
    const res = await fetch('/api/tournaments');
    const data = await res.json();
    tournaments = data.tournaments || [];
    if(!list) return;
    list.innerHTML = tournaments.length ? tournaments.map(t => `
      <article class="tour-card">
        <div class="meta-row">${statusTag(t.status)}<span class="tag">${esc(t.tournament_type || 'cup')}</span><span class="tag">${Number(t.players_count || 0)}/${Number(t.max_players || 0)} players</span></div>
        <h3>${esc(t.title || 'Typing Cup')}</h3>
        <p>${esc(t.text_prompt || 'Compete for clean speed and accuracy.')}</p>
        <div class="countdown">${esc(countdownText(t))}</div>
        <div class="user-meta">Champion: ${esc(t.champion_name || 'TBD')}</div>
        <div class="tour-actions">
          <a href="/tournament/${t.id}"><button>Open Bracket</button></a>
          <button class="ghost" data-join="${t.id}">Join</button>
        </div>
      </article>
    `).join('') : '<div class="empty-state">No tournaments yet.</div>';
    list.querySelectorAll('[data-join]').forEach(btn => btn.addEventListener('click', () => joinTournament(Number(btn.dataset.join))));
    setStatus('Ready. Choose a tournament or quick join the latest open cup.');
  }
  async function joinTournament(tid){
    if(!tid){ setStatus('No tournament selected.'); return; }
    const payload = {tournament_id:tid, player_name:document.getElementById('guestName')?.value || 'Guest Player', guest_id:guestId(), csrf_token:csrf};
    const res = await fetch('/api/tournament/join', {method:'POST', headers:{'Content-Type':'application/json','X-CSRF-Token':csrf}, body:JSON.stringify(payload)});
    const data = await res.json().catch(() => ({ok:false,error:'invalid_json'}));
    setStatus(data);
    await loadTournaments();
  }
  async function quickJoin(){
    if(!tournaments.length) await loadTournaments();
    const t = tournaments.find(x => x.status === 'open' || x.status === 'active') || tournaments[0];
    await joinTournament(t?.id);
  }
  document.getElementById('refreshTournaments')?.addEventListener('click', loadTournaments);
  document.getElementById('quickJoinBtn')?.addEventListener('click', quickJoin);
  document.getElementById('quickJoinBtn2')?.addEventListener('click', quickJoin);
  loadTournaments().catch(err => setStatus('Error: ' + err.message));
})();
