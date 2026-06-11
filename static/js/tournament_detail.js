const csrf = document.querySelector('meta[name="csrf-token"]')?.content || '';
const shell = document.querySelector('[data-tournament-id]');
const tid = Number(shell?.dataset.tournamentId || 0);
const statusBox = document.getElementById('tourStatus');
const gid = localStorage.getItem('kpct_guest_id') || crypto.randomUUID(); localStorage.setItem('kpct_guest_id', gid);
function setStatus(msg){ if(statusBox) statusBox.textContent = typeof msg === 'string' ? msg : JSON.stringify(msg,null,2); }
async function post(url,payload){ const res=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify({...payload,csrf_token:csrf})}); return res.json(); }
async function loadDetail(){
 const data = await (await fetch(`/api/tournament/${tid}`)).json();
 if(!data.ok){ setStatus(data); return; }
 const t=data.tournament;
 document.getElementById('tourTitle').textContent=t.title;
 document.getElementById('tourMeta').textContent=`${t.tournament_type} • ${t.status} • ${t.players_count}/${t.max_players} players • Champion: ${t.champion_name||'TBD'}`;
 document.getElementById('playersList').innerHTML=(data.players||[]).map(p=>`<div class="player-item">#${p.seed} ${p.player_name} ${p.eliminated?'— eliminated':''}</div>`).join('')||'<p>No players yet.</p>';
 document.getElementById('matchesList').innerHTML=(data.matches||[]).map(m=>`<div class="match-item ${m.status==='completed'?'done':''}"><b>Round ${m.round_no} Match ${m.match_no}</b><br>${m.player1?.player_name||'TBD'} (${m.player1_score||0}) vs ${m.player2?.player_name||'BYE'} (${m.player2_score||0})<br>Status: ${m.status} ${m.winner?`• Winner: ${m.winner.player_name}`:''}<div class="score-form"><input id="wpm-${m.id}" type="number" placeholder="WPM"><input id="acc-${m.id}" type="number" placeholder="Accuracy"><input id="score-${m.id}" type="number" placeholder="Score"><button onclick="submitResult(${m.id})">Submit My Result</button></div></div>`).join('')||'<p>No bracket yet. Generate bracket after 2+ players join.</p>';
 document.getElementById('resultsList').innerHTML=(data.results||[]).map(r=>`<div class="player-item">#${r.placement} ${r.player_name} +${r.xp_reward} XP</div>`).join('')||'<p>No final results yet.</p>';
}
async function submitResult(matchId){
 const wpm=Number(document.getElementById(`wpm-${matchId}`)?.value||0), accuracy=Number(document.getElementById(`acc-${matchId}`)?.value||0), score=Number(document.getElementById(`score-${matchId}`)?.value||Math.round(wpm*accuracy));
 setStatus(await post('/api/tournament/match/result',{match_id:matchId,wpm,accuracy,score,guest_id:gid})); await loadDetail();
}
document.getElementById('joinTournamentBtn')?.addEventListener('click', async()=>{ setStatus(await post('/api/tournament/join',{tournament_id:tid,player_name:document.getElementById('guestName')?.value||'Guest Player',guest_id:gid})); await loadDetail(); });
document.getElementById('startTournamentBtn')?.addEventListener('click', async()=>{ setStatus(await post('/api/tournament/start',{tournament_id:tid})); await loadDetail(); });
loadDetail().catch(err=>setStatus('Error: '+err.message));
