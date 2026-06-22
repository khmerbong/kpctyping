const list=document.getElementById('championsList');
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function loadChampions(){const data=await (await fetch('/api/champions')).json();if(!list)return;list.innerHTML=(data.champions||[]).map(c=>`<article class="tour-card"><h3>${esc(c.champion_name||'Unknown Champion')}</h3><p>${esc(c.title)}</p><div class="meta-row"><span class="tag">${esc(c.tournament_type)}</span><span class="tag">Completed</span><span class="tag">${esc(c.updated_at||'')}</span></div></article>`).join('')||'<p>No champions yet.</p>';}
loadChampions().catch(()=>{});
