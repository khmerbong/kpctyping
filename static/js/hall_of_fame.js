const grid=document.getElementById('hallOfFameGrid');
const titles={highest_wpm:'Highest WPM',highest_accuracy:'Highest Accuracy',highest_score:'Highest Score'};
function esc(v){return String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
async function load(){if(!grid)return;const res=await fetch('/api/hall-of-fame'); const data=await res.json(); grid.innerHTML=Object.entries(data.records||{}).map(([key,items])=>`<article class="card record-card"><h3>${esc(titles[key]||key)}</h3>${items.length?items.map((r,i)=>`<div class="record-row"><span>#${i+1} ${esc(r.username)}<br><small>${esc(r.country)}</small></span><strong>${esc(r.value)}</strong></div>`).join(''):'<p class="muted">No records yet.</p>'}</article>`).join('');}
load().catch(()=>{});
