const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
const shell = document.querySelector('[data-tournament-id]');
const tid = Number(shell?.dataset.tournamentId || 0);
const statusBox = document.getElementById('tourStatus');
const gid = localStorage.getItem('kpct_guest_id') || (crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random());
localStorage.setItem('kpct_guest_id', gid);
function esc(v){ return String(v ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function setStatus(msg){ if(statusBox) statusBox.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg,null,2); }
async function post(url,payload){ const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({...payload,csrf_token:csrf})}); return res.json(); }
async function loadDetail(){
 const data = await (await fetch(`/api/tournament/${encodeURIComponent(tid)}`)).json();
 if(!data.ok){ setStatus(data); return; }
 const t=data.tournament || {};
 const title=document.getElementById('tourTitle'); if(title) title.textContent=t.title || 'Tournament';
 const meta=document.getElementById('tourMeta'); if(meta) meta.textContent=`${t.tournament_type || 'daily'} • ${t.status || 'open'} • ${t.players_count || 0}/${t.max_players || 0} players • Champion: ${t.champion_name||'TBD'}`;
 const playersList=document.getElementById('playersList');
 if(playersList) playersList.innerHTML=(data.players||[]).map(p=>`<div class="player-item">#${esc(p.seed)} ${esc(p.player_name)} ${p.eliminated?'— eliminated':''}</div>`).join('')||'<p>No players yet.</p>';
 const matchesList=document.getElementById('matchesList');
 if(matchesList) matchesList.innerHTML=(data.matches||[]).map(m=>`<div class="match-item ${m.status==='completed'?'done':''}"><b>Round ${esc(m.round_no)} Match ${esc(m.match_no)}</b><br>${esc(m.player1?.player_name||'TBD')} (${esc(m.player1_score||0)}) vs ${esc(m.player2?.player_name||'BYE')} (${esc(m.player2_score||0)})<br>Status: ${esc(m.status)} ${m.winner?`• Winner: ${esc(m.winner.player_name)}`:''}<div class="score-form"><input id="wpm-${esc(m.id)}" type="number" placeholder="WPM"><input id="acc-${esc(m.id)}" type="number" placeholder="Accuracy"><input id="score-${esc(m.id)}" type="number" placeholder="Score"><button onclick="submitResult(${Number(m.id)})">Submit My Result</button></div></div>`).join('')||'<p>No bracket yet. Generate bracket after 2+ players join.</p>';
 const resultsList=document.getElementById('resultsList');
 if(resultsList) resultsList.innerHTML=(data.results||[]).map(r=>`<div class="player-item">#${esc(r.placement)} ${esc(r.player_name)} +${esc(r.xp_reward)} XP</div>`).join('')||'<p>No final results yet.</p>';
}
async function submitResult(matchId){
 const wpm=Number(document.getElementById(`wpm-${matchId}`)?.value||0), accuracy=Number(document.getElementById(`acc-${matchId}`)?.value||0), score=Number(document.getElementById(`score-${matchId}`)?.value||Math.round(wpm*accuracy));
 setStatus(await post('/api/tournament/match/result',{match_id:matchId,wpm,accuracy,score,guest_id:gid})); await loadDetail();
}
document.getElementById('joinTournamentBtn')?.addEventListener('click', async()=>{ setStatus(await post('/api/tournament/join',{tournament_id:tid,player_name:document.getElementById('guestName')?.value||'Guest Player',guest_id:gid})); await loadDetail(); });
document.getElementById('startTournamentBtn')?.addEventListener('click', async()=>{ setStatus(await post('/api/tournament/start',{tournament_id:tid})); await loadDetail(); });
loadDetail().catch(err=>setStatus('Error: '+err.message));
