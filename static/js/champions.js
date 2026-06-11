const list=document.getElementById('championsList');
async function loadChampions(){const data=await (await fetch('/api/champions')).json();list.innerHTML=(data.champions||[]).map(c=>`<article class="tour-card"><h3>${c.champion_name||'Unknown Champion'}</h3><p>${c.title}</p><div class="meta-row"><span class="tag">${c.tournament_type}</span><span class="tag">Completed</span><span class="tag">${c.updated_at||''}</span></div></article>`).join('')||'<p>No champions yet.</p>';}
loadChampions();
