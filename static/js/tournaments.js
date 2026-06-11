const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
const list = document.getElementById('tournamentList');
const statusBox = document.getElementById('tourStatus');
let tournaments = [];
function setStatus(msg){ if(statusBox) statusBox.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg,null,2); }
async function loadTournaments(){
  const res = await fetch('/api/tournaments');
  const data = await res.json();
  tournaments = data.tournaments || [];
  list.innerHTML = tournaments.map(t=>`<article class="tour-card"><h3>${t.title}</h3><p>${t.text_prompt || ''}</p><div class="meta-row"><span class="tag">${t.tournament_type}</span><span class="tag">${t.status}</span><span class="tag">${t.players_count}/${t.max_players} players</span></div><a href="/tournament/${t.id}"><button>Open Bracket</button></a></article>`).join('') || '<p>No tournaments yet.</p>';
  setStatus('Ready. Open a tournament or quick join the latest open cup.');
}
document.getElementById('refreshTournaments')?.addEventListener('click', loadTournaments);
document.getElementById('quickJoinBtn')?.addEventListener('click', async ()=>{
  if(!tournaments.length) await loadTournaments();
  const t = tournaments.find(x=>x.status==='open'||x.status==='active') || tournaments[0];
  const payload = {tournament_id:t?.id, player_name:document.getElementById('guestName')?.value || 'Guest Player', guest_id: localStorage.getItem('kpct_guest_id') || crypto.randomUUID(), csrf_token: csrf};
  localStorage.setItem('kpct_guest_id', payload.guest_id);
  const res = await fetch('/api/tournament/join',{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)});
  setStatus(await res.json());
  await loadTournaments();
});
loadTournaments().catch(err=>setStatus('Error: '+err.message));
